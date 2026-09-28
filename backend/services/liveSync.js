/**
 * Keeps the command center's data files in step with the database.
 *
 * The command center has two data inputs and both are files on disk, not live
 * queries: `frontend/public/*.csv` is fetched at runtime and
 * `frontend/src/lib/investigationData.js` is imported as a module. `db/sync.js`
 * regenerates both from SQLite, but it only ever ran when an operator typed
 * `npm run sync` by hand — so a complaint filed in the citizen portal stayed
 * invisible on the dashboard until someone remembered to rebuild.
 *
 * This module runs that same `sync()` automatically whenever a write route commits.
 * Three properties make it safe to trigger from a request handler:
 *
 * - **It never blocks the request.** `sync()` is fully synchronous (node:sqlite plus
 *   writeFileSync). It measures 80-180ms against the seeded dataset, which is still too
 *   long to make a citizen wait for a complaint number, so the rebuild is deferred to a
 *   later tick and the response goes out first.
 * - **Bursts coalesce into one rebuild.** The debounce window absorbs a double-submit
 *   or a burst of filings, so twenty complaints in a second cause one regeneration
 *   rather than twenty.
 * - **A failed rebuild cannot take the API down.** Errors are caught and recorded. The
 *   complaint is already committed by the time this runs, so rethrowing would report a
 *   filing as failed when it in fact succeeded.
 *
 * Set AUTO_SYNC=false to turn the automatic rebuild off and go back to `npm run sync`.
 */
const { sync } = require("../db/sync");

/** Escape hatch: AUTO_SYNC=false restores the original manual `npm run sync` flow. */
const ENABLED = String(process.env.AUTO_SYNC ?? "true").toLowerCase() !== "false";

/**
 * Window used to fold a burst of writes into a single rebuild. Long enough to absorb a
 * form double-submit or a short spike in filings, short enough that the dashboard is
 * current well before an analyst would think to refresh it.
 */
const DEBOUNCE_MS = Number(process.env.AUTO_SYNC_DEBOUNCE_MS) || 250;

const log = (...args) => console.log("[sync]", ...args);

let timer = null;
let running = false;
let pendingReason = null;
let runs = 0;
let lastRun = null;

/**
 * Runs the rebuild immediately on the caller's thread.
 *
 * Returns the `sync()` result, or null if the pass failed or another pass already holds
 * the single-flight slot. Never throws: the caller is a request handler whose write has
 * already been committed.
 */
function runNow(reason) {
  if (running) {
    // Defensive. `sync()` is synchronous, so the event loop cannot deliver a write
    // mid-pass; if that ever changes this keeps one rebuild in flight and leaves the
    // newest write queued for the next one.
    log(`rebuild already in progress; queueing ${reason}`);
    return null;
  }

  running = true;
  const startedAt = Date.now();

  try {
    const result = sync();
    runs += 1;
    lastRun = {
      at: new Date().toISOString(),
      reason,
      ok: true,
      durationMs: Date.now() - startedAt,
      counts: { ...result.written, cases: result.module.cases, alerts: result.module.alerts },
    };
    log(
      `rebuilt command center data after ${reason} — ` +
        `${result.module.cases} cases, ${result.module.alerts} alerts, ` +
        `${lastRun.durationMs}ms`,
    );
    return result;
  } catch (error) {
    lastRun = {
      at: new Date().toISOString(),
      reason,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error.message,
    };
    log(`rebuild after ${reason} failed: ${error.message}`);
    return null;
  } finally {
    running = false;
    // A write that landed while this pass was in flight is not in its output.
    if (pendingReason) schedule();
  }
}

/** Arms the debounce timer unless a pass is already queued or in flight. */
function schedule() {
  if (timer || running) return;
  timer = setTimeout(drain, DEBOUNCE_MS);
}

/** The timer's callback: take the accumulated reason and rebuild. */
function drain() {
  timer = null;
  if (running || !pendingReason) return;
  const reason = pendingReason;
  pendingReason = null;
  runNow(reason);
}

/**
 * Schedules a rebuild after a write. Call this *after* the transaction has committed, so
 * the rebuild is guaranteed to read the new row.
 *
 * @param {string} reason Short description of the write, used in the log line.
 * @returns {boolean} Whether a rebuild was scheduled (false when AUTO_SYNC=false).
 */
function requestSync(reason = "write") {
  if (!ENABLED) return false;
  pendingReason = pendingReason ? `${pendingReason} + ${reason}` : reason;
  schedule();
  return true;
}

/**
 * Rebuilds immediately, ignoring the debounce, and returns the result synchronously.
 * Backs the manual `POST /api/v1/sync` endpoint, and works even when AUTO_SYNC=false.
 *
 * @returns {object|null} The sync result, or null when the pass failed or was busy.
 */
function syncNow(reason = "manual") {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  pendingReason = null;
  return runNow(reason);
}

/** Current rebuild state, surfaced on /api/v1/health and GET /api/v1/sync. */
function status() {
  return {
    enabled: ENABLED,
    running,
    scheduled: Boolean(timer),
    pendingReason,
    debounceMs: DEBOUNCE_MS,
    runs,
    lastRun,
  };
}

module.exports = { requestSync, syncNow, status, ENABLED };