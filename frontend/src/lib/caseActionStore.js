/**
 * Operational action records for the ATM Intelligence "Recommended Actions" workflow.
 *
 * The prototype has no server, so records are written to IndexedDB (with a
 * localStorage fallback for private-browsing / blocked-storage modes) instead of
 * plain React state. Everything the UI needs goes through the small API at the
 * bottom of this file, so replacing this with a real REST/GraphQL backend later
 * only means reimplementing `readActionRecords`, `readActivityEntries` and
 * `initiateOperationalAction` — no page changes required.
 */

const DB_NAME = "cyberfraud-command-center";
const DB_VERSION = 1;
const ACTION_STORE = "caseActionRecords";
const ACTIVITY_STORE = "caseActivityEntries";
const FALLBACK_STORAGE_KEY = "cfc.operationalActions.v1";
const CHANNEL_NAME = "cfc-operational-actions";

/** Officer recorded on every record. Swap for the signed-in user once auth exists. */
export const OPERATING_OFFICER = "Officer IO";

export const ACTION_STATUS = Object.freeze({
  pending: "pending",
  active: "active",
  prepared: "prepared",
  requested: "requested",
  assigned: "assigned",
});

const STATUS_LABELS = {
  [ACTION_STATUS.pending]: "PENDING",
  [ACTION_STATUS.active]: "ACTIVE",
  [ACTION_STATUS.prepared]: "PREPARED",
  [ACTION_STATUS.requested]: "REQUESTED",
  [ACTION_STATUS.assigned]: "ASSIGNED",
};

/** Uppercase badge text for a stored status. A missing record reads PENDING. */
export const getActionStatusLabel = (status) => STATUS_LABELS[status] ?? STATUS_LABELS[ACTION_STATUS.pending];

/**
 * Single source of truth for the four workflow steps. The ATM Intelligence cards
 * and the Case Details views both read their labels and order from here, so the
 * two pages can never drift apart.
 */
export const OPERATIONAL_ACTIONS = Object.freeze([
  { actionType: "priority_watch", label: "Priority Watch", completedStatus: ACTION_STATUS.active },
  { actionType: "bank_nodal_request", label: "Bank Request", completedStatus: ACTION_STATUS.prepared },
  { actionType: "evidence_preservation", label: "Evidence Request", completedStatus: ACTION_STATUS.requested },
  { actionType: "field_verification", label: "Field Verification", completedStatus: ACTION_STATUS.assigned },
]);

export const getActionCatalogue = (actionType) => OPERATIONAL_ACTIONS.find((entry) => entry.actionType === actionType) ?? null;

/** Records are unique per case + ATM + action type, which is also their primary key. */
export const actionRecordKey = ({ caseId, atmId, actionType }) => `${caseId}::${atmId}::${actionType}`;

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
      if (!db.objectStoreNames.contains(ACTION_STORE)) {
        const store = db.createObjectStore(ACTION_STORE, { keyPath: "id" });
        store.createIndex("caseId", "caseId", { unique: false });
        store.createIndex("key", "key", { unique: true });
      }
      if (!db.objectStoreNames.contains(ACTIVITY_STORE)) {
        const store = db.createObjectStore(ACTIVITY_STORE, { keyPath: "id" });
        store.createIndex("caseId", "caseId", { unique: false });
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
};

/** Fallback used when IndexedDB is unavailable — same API, localStorage backed. */
const localStorageAdapter = {
  read() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(FALLBACK_STORAGE_KEY) || "{}");
      return {
        [ACTION_STORE]: Array.isArray(parsed[ACTION_STORE]) ? parsed[ACTION_STORE] : [],
        [ACTIVITY_STORE]: Array.isArray(parsed[ACTIVITY_STORE]) ? parsed[ACTIVITY_STORE] : [],
      };
    } catch {
      return { [ACTION_STORE]: [], [ACTIVITY_STORE]: [] };
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
  channel?.postMessage({ type: "operational-actions-changed" });
}

if (typeof window !== "undefined") {
  ensureChannel();
  // Keeps other tabs in sync when the localStorage fallback is in use.
  window.addEventListener("storage", (event) => {
    if (event.key === FALLBACK_STORAGE_KEY) notifySubscribers();
  });
}

const byNewestFirst = (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

/**
 * Action records for a case, optionally narrowed to a single ATM. Records are
 * always keyed by caseId + atmId + actionType, so cases and ATMs never share state.
 */
export async function readActionRecords({ caseId, atmId } = {}) {
  if (!caseId) return [];
  const adapter = await getAdapter();
  const records = await adapter.getAll(ACTION_STORE);
  return records
    .filter((record) => record.caseId === caseId && (!atmId || record.atmId === atmId))
    .sort(byNewestFirst);
}

/** Activity log entries for a case, newest first. Written alongside the action record. */
export async function readActivityEntries({ caseId, atmId } = {}) {
  if (!caseId) return [];
  const adapter = await getAdapter();
  const entries = await adapter.getAll(ACTIVITY_STORE);
  return entries
    .filter((entry) => entry.caseId === caseId && (!atmId || entry.atmId === atmId))
    .sort(byNewestFirst);
}

/**
 * Persist an initiated action and its activity-log entry.
 *
 * Idempotent by construction: the record id is derived from
 * caseId + atmId + actionType, so re-confirming an action returns the existing
 * record instead of writing a duplicate — a page refresh can never produce a
 * second record or a second log entry.
 */
export async function initiateOperationalAction({
  caseId,
  atmId,
  actionType,
  status,
  details = "",
  activityMessage = "",
  performedBy = OPERATING_OFFICER,
  meta = null,
} = {}) {
  if (!caseId || !atmId || !actionType) {
    return { created: false, record: null, entry: null, reason: "incomplete" };
  }

  const adapter = await getAdapter();
  const key = actionRecordKey({ caseId, atmId, actionType });
  const existing = (await adapter.getAll(ACTION_STORE)).find((record) => record.key === key);

  if (existing) {
    return { created: false, record: existing, entry: null, reason: "already-initiated" };
  }

  const timestamp = new Date().toISOString();
  const catalogue = getActionCatalogue(actionType);
  const record = {
    id: key,
    key,
    caseId,
    atmId,
    actionType,
    status: status ?? catalogue?.completedStatus ?? ACTION_STATUS.pending,
    createdAt: timestamp,
    updatedAt: timestamp,
    performedBy,
    details,
    meta,
  };

  const entry = {
    id: `activity::${key}`,
    key,
    caseId,
    atmId,
    actionType,
    status: record.status,
    message: activityMessage || `${atmId} - ${catalogue?.label ?? actionType}`,
    performedBy,
    createdAt: timestamp,
  };

  await adapter.put(ACTION_STORE, record);
  await adapter.put(ACTIVITY_STORE, entry);

  notifySubscribers();
  broadcastChange();

  return { created: true, record, entry, reason: "created" };
}

/** Subscribe to writes from this tab and from other tabs. Returns an unsubscribe function. */
export function subscribeToOperationalActions(listener) {
  ensureChannel();
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
