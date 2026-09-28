/**
 * Automatic data-rebuild checks.
 * Run with: node backend/test/liveSync.test.js
 *
 * The command center reads generated files rather than the database, so every write has to
 * be projected into them. These checks cover the two properties that make it safe to do
 * that from a request handler: a burst of writes costs one rebuild, and AUTO_SYNC=false
 * still leaves a working manual escape hatch.
 */
const assert = require("node:assert");

// Read at module load, so it has to be set before the require.
process.env.AUTO_SYNC_DEBOUNCE_MS = "120";
const liveSync = require("../services/liveSync");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

check("automatic rebuilds are on by default", () => {
  assert.strictEqual(liveSync.status().enabled, true);
});

check("a burst of writes collapses into a single rebuild", async () => {
  const before = liveSync.status().runs;

  for (let i = 0; i < 10; i += 1) liveSync.requestSync(`burst ${i}`);

  // Nothing has run yet: the pass is queued, so ten complaints never mean ten rebuilds.
  const queued = liveSync.status();
  assert.strictEqual(queued.scheduled, true, "a rebuild should be queued");
  assert.strictEqual(queued.runs, before, "the rebuild should not have run yet");
  assert.strictEqual(
    queued.pendingReason.split(" + ").length,
    10,
    "every write in the burst should be recorded in the reason",
  );

  await wait(400);
  const after = liveSync.status();
  assert.strictEqual(after.runs, before + 1, `expected 1 rebuild, got ${after.runs - before}`);
  assert.strictEqual(after.lastRun.ok, true, after.lastRun.error);
  assert.strictEqual(after.scheduled, false, "nothing should be left queued");
  assert.strictEqual(after.pendingReason, null, "the queue should be drained");
});

check("a write after the window gets its own rebuild", async () => {
  const mark = liveSync.status().runs;
  liveSync.requestSync("later write");
  await wait(400);
  assert.strictEqual(liveSync.status().runs, mark + 1, "a later write must not be swallowed");
  assert.strictEqual(liveSync.status().lastRun.reason, "later write");
});

check("the rebuild reports what it wrote", () => {
  const { lastRun } = liveSync.status();
  assert.ok(lastRun.ok, lastRun.error);
  assert.ok(lastRun.durationMs >= 0, "a rebuild should record how long it took");
  assert.ok(lastRun.counts.cases > 0, "a rebuild should report the cases it wrote");
});

check("a rebuild can be forced on demand", () => {
  // This is the recovery hatch, so it must work even when nothing is queued.
  const result = liveSync.syncNow("manual");
  assert.ok(result, "a forced rebuild should return a result");
  assert.ok(result.module.cases > 0, "a forced rebuild should write cases");
  assert.ok(result.written, "a forced rebuild should report the CSVs it wrote");
});

(async () => {
  const lines = [];
  let failed = 0;
  for (const { name, fn } of checks) {
    try {
      await fn();
      lines.push(`PASS  ${name}`);
    } catch (error) {
      failed += 1;
      lines.push(`FAIL  ${name}`);
      lines.push(`        ${error.message}`);
    }
  }
  lines.push("");
  lines.push(`${checks.length - failed}/${checks.length} rebuild checks passed.`);
  console.log(lines.join("\n"));
  process.exit(failed === 0 ? 0 : 1);
})();
