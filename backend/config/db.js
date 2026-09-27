/**
 * SQLite access via node:sqlite (built into Node 22.5+/24, no native build, no server).
 * Deliberately replaces the `pg`/Postgres pool for the demo so the whole stack runs
 * with `npm run dev` and no external infrastructure. The Postgres schema in
 * database/postgresql/schema.sql remains the production reference.
 */
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "app.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

const all = (sql, params = []) => db.prepare(sql).all(...params);
const get = (sql, params = []) => db.prepare(sql).get(...params);
const run = (sql, params = []) => db.prepare(sql).run(...params);

/** Runs `fn` inside a transaction, rolling back on throw. */
const transaction = (fn) => {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};

module.exports = { db, all, get, run, transaction, DB_PATH };
