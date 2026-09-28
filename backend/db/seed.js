/**
 * Seeds the SQLite database from the repository CSVs.
 *
 * Run with: npm run seed
 *
 * Order is FK-safe: users -> complaints -> cases -> alerts -> atms -> mule_hops.
 * The seeder clears the operational tables first so a re-run always reflects the CSVs
 * currently on disk.
 */
const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const { db, run, transaction } = require("../config/db");
const { parseCsv } = require("../lib/csv");

const ROOT = path.join(__dirname, "..", "..");
const DATA = path.join(ROOT, "data");
const SCHEMA = path.join(__dirname, "schema.sql");

/** Reads a repo CSV by filename. */
const readCsv = (name) => parseCsv(fs.readFileSync(path.join(DATA, name), "utf8"));

/** Applies the schema. Safe to re-run: every statement is IF NOT EXISTS. */
function migrate() {
  db.exec(fs.readFileSync(SCHEMA, "utf8"));
}

/** Four demo operators, one per role present in users.csv. */
const DEMO_USERS = [
  { id: 1, name: "Ananya Sharma", email: "analyst@demo.gov", role: "analyst" },
  { id: 2, name: "Karan Joshi", email: "admin@demo.gov", role: "admin" },
  { id: 3, name: "Meera Nair", email: "police@demo.gov", role: "police_officer" },
  { id: 4, name: "Rohit Verma", email: "bank@demo.gov", role: "bank_officer" },
];
const DEMO_PASSWORD = "Demo@123";

/**
 * A syntactically valid bcrypt hash that matches no known password.
 * Used for the placeholder rows carried over from users.csv so they cannot
 * authenticate, while preserving the CSV roster for display.
 */
const INERT_HASH = `$2b$10$${"x".repeat(53)}`;

/**
 * Loads the user roster.
 *
 * users.csv ships literal placeholders ("hashed_password_1") that can never pass a
 * bcrypt comparison, so the first four rows are replaced by the demo operators
 * (keeping ids 1-4 so cases.assigned_to stays valid) and the remainder are loaded
 * with an inert hash that matches no password.
 */
const seedUsers = (counts) => {
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const insert = db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?)",
  );

  const csvUsers = readCsv("users.csv");

  // Ids 1..4 become the demo operators so the existing cases.assigned_to values
  // keep resolving to a real user.
  for (const demo of DEMO_USERS) {
    const original = csvUsers.find((u) => Number(u.id) === demo.id);
    insert.run(
      demo.id,
      demo.name,
      demo.email,
      passwordHash,
      demo.role,
      original?.created_at || "2026-09-01 09:00:00",
    );
  }

  for (const u of csvUsers) {
    const id = Number(u.id);
    if (id <= DEMO_USERS.length) continue; // already loaded as a demo operator
    insert.run(id, u.name, u.email, INERT_HASH, u.role, u.created_at);
  }

  counts.users = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
};


const seedComplaints = (counts) => {
  const insert = db.prepare(
    `INSERT INTO complaints
      (id, complaint_number, complainant_name, phone_number, bank_name, account_number,
       transaction_id, fraud_amount, transaction_type, fraud_date, fraud_time, location,
       description, source, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  for (const c of readCsv("complaints.csv")) {
    insert.run(
      Number(c.id),
      c.complaint_number,
      c.complainant_name,
      c.phone_number,
      c.bank_name,
      c.account_number,
      c.transaction_id,
      Number(c.fraud_amount),
      c.transaction_type,
      c.fraud_date,
      c.fraud_time,
      c.location,
      c.description,
      c.source || "Cybercrime Portal",
      c.created_at,
    );
  }
  counts.complaints = db.prepare("SELECT COUNT(*) AS n FROM complaints").get().n;
};

const seedCases = (counts) => {
  const insert = db.prepare(
    `INSERT INTO cases (id, case_number, complaint_id, priority, status, assigned_to,
                        risk_level, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  );
  for (const c of readCsv("cases.csv")) {
    insert.run(
      Number(c.id),
      c.case_number,
      Number(c.complaint_id),
      c.priority,
      c.status,
      Number(c.assigned_to) || null,
      c.risk_level,
      c.created_at,
      c.updated_at,
    );
  }
  counts.cases = db.prepare("SELECT COUNT(*) AS n FROM cases").get().n;
};

const seedAlerts = (counts) => {
  const insert = db.prepare(
    "INSERT INTO alerts (id, case_id, alert_type, severity, message, status, created_at) VALUES (?,?,?,?,?,?,?)",
  );
  for (const a of readCsv("alerts.csv")) {
    insert.run(
      Number(a.id),
      Number(a.case_id),
      a.alert_type,
      a.severity,
      a.message,
      a.status,
      a.created_at,
    );
  }
  counts.alerts = db.prepare("SELECT COUNT(*) AS n FROM alerts").get().n;
};

const seedAtms = (counts) => {
  const insert = db.prepare(
    `INSERT INTO atms (id, atm_id, bank_name, city, latitude, longitude, highway_distance,
                       lighting_score, cctv_coverage, historical_fraud_count, withdrawal_limit,
                       risk_score, risk_level)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  for (const a of readCsv("atms.csv")) {
    insert.run(
      Number(a.id),
      a.atm_id,
      a.bank_name,
      a.city,
      Number(a.latitude),
      Number(a.longitude),
      Number(a.highway_distance),
      Number(a.lighting_score),
      Number(a.cctv_coverage),
      Number(a.historical_fraud_count),
      Number(a.withdrawal_limit),
      Number(a.risk_score),
      a.risk_level,
    );
  }
  counts.atms = db.prepare("SELECT COUNT(*) AS n FROM atms").get().n;
};

/** The money trail: victim -> mules -> cash-out, three hops per complaint. */
const seedMuleHops = (counts) => {
  const insert = db.prepare(
    `INSERT INTO mule_hops (hop_id, complaint_id, hop_level, from_account, to_account,
                            amount_transferred_inr, time_delay_minutes, timestamp)
     VALUES (?,?,?,?,?,?,?,?)`,
  );
  for (const h of readCsv("mule_hops.csv")) {
    insert.run(
      h.hop_id,
      h.complaint_id,
      Number(h.hop_level),
      h.from_account,
      h.to_account,
      Number(h.amount_transferred_inr),
      Number(h.time_delay_minutes),
      h.timestamp,
    );
  }
  counts.mule_hops = db.prepare("SELECT COUNT(*) AS n FROM mule_hops").get().n;
};

function seed() {
  migrate();
  const started = Date.now();
  const counts = {};

  transaction(() => {
    /*
     * Child-first so a rerun never trips a foreign key.
     *
     * `nlp_extractions` and `evidence` have to be here too. Both are child rows —
     * they reference complaints and cases respectively — and neither is reloaded from
     * a CSV, so leaving them behind made `DELETE FROM complaints` fail with a FOREIGN
     * KEY constraint the moment anyone had triaged a helpline call. That made the
     * seeder unrunnable on any database that had actually been used, which is
     * exactly when you need to reset it.
     */
    for (const table of [
      "alerts",
      "mule_hops",
      "nlp_extractions",
      "evidence",
      "cases",
      "complaints",
      "atms",
      "users",
    ]) {
      run(`DELETE FROM ${table}`);
    }
    run("DELETE FROM sqlite_sequence WHERE name IN ('complaints','cases','alerts')");

    seedUsers(counts);
    seedComplaints(counts);
    seedCases(counts);
    seedAlerts(counts);
    seedAtms(counts);
    seedMuleHops(counts);
  });

  return { counts, elapsedMs: Date.now() - started };
}

if (require.main === module) {
  const { counts, elapsedMs } = seed();
  console.log(`Seeded in ${elapsedMs}ms:`);
  for (const [table, n] of Object.entries(counts)) {
    console.log(`  ${table.padEnd(12)} ${n}`);
  }
  console.log(`\nDemo login: analyst@demo.gov / ${DEMO_PASSWORD}`);
}

module.exports = { seed, migrate, DEMO_USERS, DEMO_PASSWORD };
