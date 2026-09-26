/**
 * Behavioural check for the Mule Account bank-sync persistence layer.
 *
 * Run with:  node --experimental-strip-types scripts/testMuleAccountStore.mjs
 * (or simply: node scripts/testMuleAccountStore.mjs)
 *
 * It exercises the three guarantees the Mule Account Database depends on:
 *   1. a marked SENT account never returns to PENDING on re-read (refresh),
 *   2. the bulk action marks every unsent account and leaves sent ones alone,
 *   3. re-running either action is idempotent (no duplicate records).
 */
import assert from "node:assert/strict";

import "fake-indexeddb/auto";

const { BANK_SYNC_STATUS, readBankSyncRecords, markMuleAccountsSent, resetMuleAccountSync } = await import(
  "../src/lib/muleAccountStore.js"
);

const ACCOUNTS = ["XXXXXX8842", "XXXXXX3391", "XXXXXX7710", "XXXXXX2058"];
const statusOf = async (accountId) => {
  const records = await readBankSyncRecords();
  return records.find((r) => r.accountId === accountId)?.status ?? BANK_SYNC_STATUS.pending;
};

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(`  PASS  ${name}`);
  } catch (error) {
    results.push(`  FAIL  ${name}\n        ${error.message}`);
    process.exitCode = 1;
  }
};

// 1. Every account starts PENDING (implicit state, nothing persisted yet).
await check("all accounts start PENDING", async () => {
  assert.deepEqual(await readBankSyncRecords(), []);
  for (const id of ACCOUNTS) assert.equal(await statusOf(id), BANK_SYNC_STATUS.pending);
});

// 2. Individual send marks exactly one account SENT and survives a re-read.
await check("individual send persists across a refresh", async () => {
  const { records, skipped } = await markMuleAccountsSent(["XXXXXX8842"], { via: "single" });
  assert.equal(records.length, 1);
  assert.deepEqual(skipped, []);
  assert.equal(await statusOf("XXXXXX8842"), BANK_SYNC_STATUS.sent);
  // The "refresh" is a brand new read of the store.
  assert.equal((await readBankSyncRecords()).length, 1);
});

// 3. Re-sending an already-sent account is a no-op, not a second record.
await check("re-sending an already sent account is idempotent", async () => {
  const { records, skipped } = await markMuleAccountsSent(["XXXXXX8842"], { via: "single" });
  assert.equal(records.length, 0);
  assert.deepEqual(skipped, ["XXXXXX8842"]);
  assert.equal((await readBankSyncRecords()).length, 1);
});

// 4. Bulk send marks every remaining unsent account.
await check("bulk send marks all remaining unsent accounts", async () => {
  const unsent = ACCOUNTS.filter((id) => id !== "XXXXXX8842");
  const { records } = await markMuleAccountsSent(unsent, { via: "bulk" });
  assert.equal(records.length, 3);
  for (const id of ACCOUNTS) assert.equal(await statusOf(id), BANK_SYNC_STATUS.sent);
});

// 5. Bulk send over an already-complete registry writes nothing.
await check("bulk send with nothing unsent writes nothing", async () => {
  const { records } = await markMuleAccountsSent(ACCOUNTS, { via: "bulk" });
  assert.equal(records.length, 0);
  assert.equal((await readBankSyncRecords()).length, ACCOUNTS.length);
});

// 6. Duplicate ids inside one call collapse to a single record.
await check("duplicate ids in one call collapse", async () => {
  await markMuleAccountsSent(["XXXXXX9999", "XXXXXX9999", "XXXXXX9999"], { via: "bulk" });
  const matching = (await readBankSyncRecords()).filter((r) => r.accountId === "XXXXXX9999");
  assert.equal(matching.length, 1);
});

// 7. An empty call is safe (the bulk button guards on this, but the store owns it).
await check("empty call is a safe no-op", async () => {
  const { records, skipped } = await markMuleAccountsSent([], { via: "bulk" });
  assert.deepEqual(records, []);
  assert.deepEqual(skipped, []);
  const { records: blanks } = await markMuleAccountsSent([null, undefined, ""], { via: "bulk" });
  assert.deepEqual(blanks, []);
});

// 8. Reset returns the whole registry to PENDING, and stays reset.
await check("reset returns every account to PENDING", async () => {
  await markMuleAccountsSent(["XXXXXX8842", "XXXXXX3391"], { via: "bulk" });
  assert.ok((await readBankSyncRecords()).length > 0, "precondition: something is sent");
  await resetMuleAccountSync();
  assert.deepEqual(await readBankSyncRecords(), []);
  for (const id of ACCOUNTS) assert.equal(await statusOf(id), BANK_SYNC_STATUS.pending);
});

console.log("\nMule Account bank-sync store\n" + results.join("\n"));
console.log(process.exitCode ? "\nFAILED" : "\nAll checks passed.\n");

// Open IndexedDB handles keep the event loop alive, so exit explicitly.
process.exit(process.exitCode ?? 0);
