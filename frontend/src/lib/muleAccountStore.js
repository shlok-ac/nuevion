/**
 * Bank-coordination sync state for the Mule Account Database.
 *
 * The prototype has no server, so "submitted to the banking coordination
 * system" is recorded as a local record per account in IndexedDB (with a
 * localStorage fallback for private-browsing / blocked-storage modes), exactly
 * as `caseActionStore.js` does for operational actions.
 *
 * A separate database is used so the existing store's schema version is never
 * bumped underneath it — an `indexedDB.open` at a higher version blocks the
 * other module's open connection and would silently demote it to the
 * localStorage fallback.
 *
 * PENDING is the implicit state: an account with no record has never been
 * submitted, so this store only ever holds SENT rows. That keeps the persisted
 * payload minimal and makes a refresh inherently idempotent.
 *
 * Everything the UI needs goes through the small API at the bottom of this
 * file, so replacing this with a real REST/GraphQL backend later only means
 * reimplementing `readBankSyncRecords` and `markMuleAccountsSent` — no page
 * changes required.
 */

const DB_NAME = "cyberfraud-mule-coordination";
const DB_VERSION = 1;
const SYNC_STORE = "muleBankSync";
const FALLBACK_STORAGE_KEY = "cfc.muleBankSync.v1";
const CHANNEL_NAME = "cfc-mule-bank-sync";

export const BANK_SYNC_STATUS = Object.freeze({
  pending: "PENDING",
  sent: "SENT",
});

const STATUS_LABELS = {
  [BANK_SYNC_STATUS.pending]: "PENDING",
  [BANK_SYNC_STATUS.sent]: "SENT",
};

/** Uppercase badge text for a stored status. A missing record reads PENDING. */
export const getBankSyncStatusLabel = (status) => STATUS_LABELS[status] ?? STATUS_LABELS[BANK_SYNC_STATUS.pending];

const requestToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

let databasePromise = null;
let indexedDbUnavailable = false;

function openDatabase() {
  if (indexedDbUnavailable) return Promise.reject(new Error("IndexedDB unavailable"));
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        const store = db.createObjectStore(SYNC_STORE, { keyPath: "id" });
        store.createIndex("accountId", "accountId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
  }).catch((error) => {
    databasePromise = null;
    indexedDbUnavailable = true;
    throw error;
  });

  return databasePromise;
}

function runTransaction(storeName, mode, executor) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        let result;
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error("Transaction aborted"));
        try {
          result = executor(transaction.objectStore(storeName));
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      })
  );
}

const indexedDbAdapter = {
  async getAll(storeName) {
    const result = await runTransaction(storeName, "readonly", (store) => requestToPromise(store.getAll()));
    return Array.isArray(result) ? result : [];
  },
  async put(storeName, record) {
    await runTransaction(storeName, "readwrite", (store) => requestToPromise(store.put(record)));
    return record;
  },
  async clear(storeName) {
    await runTransaction(storeName, "readwrite", (store) => requestToPromise(store.clear()));
  },
};

/** Fallback used when IndexedDB is unavailable — same API, localStorage backed. */
const localStorageAdapter = {
  read() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(FALLBACK_STORAGE_KEY) || "{}");
      return Array.isArray(parsed[SYNC_STORE]) ? parsed[SYNC_STORE] : [];
    } catch {
      return [];
    }
  },
  async getAll(storeName) {
    return this.read()[storeName];
  },
  async put(storeName, record) {
    const state = this.read();
    const next = state[storeName].filter((item) => item.id !== record.id);
    next.push(record);
    try {
      window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify({ ...state, [storeName]: next }));
    } catch {
      /* storage blocked or full — the UI still updates from its own state */
    }
    return record;
  },
  async clear(storeName) {
    const state = this.read();
    try {
      window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify({ ...state, [storeName]: [] }));
    } catch {
      /* storage blocked or full — nothing to clear */
    }
  },
};

let adapterPromise = null;

function getAdapter() {
  if (!adapterPromise) {
    adapterPromise = openDatabase().then(
      () => indexedDbAdapter,
      () => localStorageAdapter
    );
  }
  return adapterPromise;
}

const subscribers = new Set();
let channel = null;

function notifySubscribers() {
  subscribers.forEach((listener) => {
    try {
      listener();
    } catch {
      /* a broken subscriber must not break persistence */
    }
  });
}

function ensureChannel() {
  if (channel || typeof BroadcastChannel === "undefined") return;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener("message", () => notifySubscribers());
}

function broadcastChange() {
  ensureChannel();
  channel?.postMessage({ type: "mule-bank-sync-changed" });
}

if (typeof window !== "undefined") {
  ensureChannel();
  // Keeps other tabs in sync when the localStorage fallback is in use.
  window.addEventListener("storage", (event) => {
    if (event.key === FALLBACK_STORAGE_KEY) notifySubscribers();
  });

  // Dev-only escape hatch: lets the prototype be reset from the console after a
  // demo run without adding a reset control to the page chrome.
  if (import.meta.env?.DEV) {
    window.__cfcMuleSync = {
      reset: async () => {
        await resetMuleAccountSync();
        return "Mule account bank-sync state reset to PENDING.";
      },
      status: async () => readBankSyncRecords(),
    };
  }
}

/** Every account that has been marked as submitted, newest first. */
export async function readBankSyncRecords() {
  const adapter = await getAdapter();
  const records = await adapter.getAll(SYNC_STORE);
  return records.sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
}

/**
 * Simulate the banking-coordination submission for the given accounts.
 *
 * Idempotent by construction: an account that already holds a SENT record is
 * skipped, so the bulk action can never re-write a submission and a refresh
 * can never produce a second record for the same account.
 *
 * @param {string[]} accountIds Accounts to mark as submitted.
 * @param {object} [options]
 * @param {"single"|"bulk"} [options.via] Which UI action performed the send.
 * @returns {Promise<{records: object[], skipped: string[]}>} Records written / ids skipped.
 */
export async function markMuleAccountsSent(accountIds, { via = "single" } = {}) {
  const ids = [...new Set((accountIds || []).filter(Boolean))];
  if (!ids.length) return { records: [], skipped: [] };

  const adapter = await getAdapter();
  const existing = await adapter.getAll(SYNC_STORE);
  const alreadySent = new Set(existing.map((record) => record.accountId));

  const timestamp = new Date().toISOString();
  const written = [];
  const skipped = [];

  for (const accountId of ids) {
    if (alreadySent.has(accountId)) {
      skipped.push(accountId);
      continue;
    }
    const record = { id: accountId, accountId, status: BANK_SYNC_STATUS.sent, sentAt: timestamp, via };
    await adapter.put(SYNC_STORE, record);
    written.push(record);
  }

  if (written.length) {
    notifySubscribers();
    broadcastChange();
  }

  return { records: written, skipped };
}

/**
 * Drop every persisted bank-sync record, returning the whole registry to
 * PENDING. Exists so the prototype can be reset after a demo run without
 * leaving stale SENT state behind for the next walkthrough.
 */
export async function resetMuleAccountSync() {
  const adapter = await getAdapter();
  await adapter.clear(SYNC_STORE);
  notifySubscribers();
  broadcastChange();
}

/** Subscribe to writes from this tab and from other tabs. Returns an unsubscribe function. */
export function subscribeToMuleAccountSync(listener) {
  ensureChannel();
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

