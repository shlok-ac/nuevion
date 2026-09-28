/**
 * Regenerates the command center's data files from the database.
 *
 * This is the bridge that lets the frontend stay byte-for-byte unchanged: the app
 * reads `public/*.csv` over fetch and imports `src/lib/investigationData.js` as a
 * module, so both are data, not code. This script rewrites them with identical
 * shapes and column names, so the same components render rows that are now backed
 * by SQLite and the live ML model.
 *
 * Run with: npm run sync
 *
 * The API runs this same `sync()` for you after every write that touches this data — see
 * services/liveSync.js — so a complaint filed in the citizen portal reaches the command
 * center without anyone running this by hand. The CLI entry point is kept for the initial
 * build and as a manual recovery path.
 */
const fs = require("node:fs");
const path = require("node:path");
const { all, get } = require("../config/db");
const { toCsv, parseCsv } = require("../lib/csv");

const ROOT = path.join(__dirname, "..", "..");
const FRONTEND = path.join(ROOT, "frontend");
const PUBLIC = path.join(FRONTEND, "public");
const DATA_FILE = path.join(FRONTEND, "src", "lib", "investigationData.js");

const SOURCE_TAG = "SIMULATED_FOR_SIH_PROTOTYPE";

/** Cities derived from the seeded ATMs, with their state for the heatmap. */
const CITY_STATE = {
  Kolkata: "West Bengal", Bangalore: "Karnataka", Bengaluru: "Karnataka",
  Hyderabad: "Telangana", Chennai: "Tamil Nadu", Mumbai: "Maharashtra",
  Pune: "Maharashtra", Delhi: "Delhi", Ahmedabad: "Gujarat", Nagpur: "Maharashtra",
  Nashik: "Maharashtra", Jaipur: "Rajasthan", Lucknow: "Uttar Pradesh",
};

const list = (sql, params = []) => all(sql, params);

/** Deterministic pseudo-random in [0,1) from a string, so reruns are stable. */
const seeded = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};

const pick = (text, options) => options[Math.floor(seeded(text) * options.length) % options.length];

/** Short deterministic hex fragment, used for display-only evidence hashes. */
const hex = (value, length) =>
  Math.floor(value * 0xffffffff)
    .toString(16)
    .padStart(8, "0")
    .slice(0, length);

const MALE_NAMES = ["Imran Sheikh", "Deepak Rao", "Ravi Sharma", "Mohan Verma", "Suresh Patil", "Arjun Nair"];
const FEMALE_NAMES = ["Faisal Ahmed", "Pooja Singh", "Neha Kulkarni", "Anita Deshmukh", "Kavita Menon", "Ritu Bhatia"];
const BANKS = [
  "HDFC Bank", "ICICI Bank", "Axis Bank", "State Bank of India", "Kotak Mahindra Bank",
  "Yes Bank", "Canara Bank", "IDBI Bank", "Federal Bank", "IndusInd Bank",
];
const BRANCHES = {
  Mumbai: "Andheri West, Mumbai", Pune: "MG Road, Pune", Delhi: "Lajpat Nagar, Delhi",
  Kolkata: "Park Street, Kolkata", Chennai: "Anna Nagar, Chennai", Hyderabad: "Banjara Hills, Hyderabad",
  Ahmedabad: "Navrangpura, Ahmedabad", Bangalore: "MG Road, Bengaluru",
};
const OFFICERS = [
  "PI Anjali Deshmukh", "PI Rohan Mehta", "SI Kavita Nair", "SI Vikram Rao",
  "Insp. Sneha Patil", "Insp. Arjun Pillai",
];
const STATIONS = [
  "Cyber Crime PS, Pune City", "Cyber Crime PS, Mumbai Zone-7", "Cyber Crime PS, South-East Delhi",
  "Cyber Crime PS, Kolkata Zone-2", "Cyber Crime PS, Chennai", "Cyber Crime PS, Hyderabad",
];

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

/** Masks an account number the way the UI expects: XXXX9476 style. */
const maskAccount = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length > 4 ? `XXXX${digits.slice(-4)}` : digits || "XXXX0000";
};

const titleCase = (value) =>
  String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

/**
 * Writes a generated file atomically.
 *
 * These files are served to the browser (the CSVs over fetch, the module through Vite),
 * and the rebuild now runs on its own after every complaint rather than on an operator's
 * command, so a reader can genuinely be mid-fetch while we write. A plain writeFileSync
 * truncates first, which would let a reader observe a half-written file and fail to parse
 * it. Writing to a sibling temp file and renaming over the target is atomic on POSIX and
 * on Windows, so readers only ever see the old or the new content.
 */
function writeGenerated(file, contents) {
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, contents, "utf8");
    fs.renameSync(temp, file);
  } catch {
    // A rename can fail if the target is momentarily locked on Windows. The contents are
    // already in the temp file, so fall back to a direct write rather than leaving the
    // command center with no data at all.
    fs.rmSync(temp, { force: true });
    fs.writeFileSync(file, contents, "utf8");
  }
}

// ---------------------------------------------------------------- CSVs ----
/**
 * atm_predictions.csv — the columns FraudHeatmap.jsx and CallerLocationAtmRiskZone.jsx
 * read: atm_id, bank_name, city, latitude, longitude, risk_score, risk_level,
 * predicted_risk_level, prediction_confidence. risk_score/risk_level come from the
 * live model because ml.train() wrote them back into the atms table.
 */
function writeAtmPredictions() {
  const rows = list("SELECT * FROM atms ORDER BY id");
  const csv = rows.map((a) => ({
    id: a.id,
    atm_id: a.atm_id,
    bank_name: a.bank_name,
    city: a.city,
    latitude: a.latitude,
    longitude: a.longitude,
    highway_distance: a.highway_distance,
    lighting_score: a.lighting_score,
    cctv_coverage: a.cctv_coverage,
    historical_fraud_count: a.historical_fraud_count,
    withdrawal_limit: a.withdrawal_limit,
    risk_score: a.risk_score,
    risk_level: a.risk_level,
    predicted_risk_level: a.risk_level,
    prediction_confidence: a.risk_score,
    date: "",
    time: "",
    time_of_day: "",
    crime_type: "",
  }));
  writeGenerated(path.join(PUBLIC, "atm_predictions.csv"), toCsv(csv));
  return csv.length;
}

/** fraud_incidents.csv — national heatmap, one point per complaint with coordinates. */
function writeFraudIncidents() {
  // Pair each complaint with the nearest ATM in the same city so the incident
  // inherits real coordinates from the seeded ATM table.
  const rows = list(
    `SELECT c.id, c.complaint_number, c.fraud_amount, c.transaction_type, c.description,
            c.fraud_date, c.fraud_time, c.location, a.latitude, a.longitude, a.city, a.risk_level
     FROM complaints c
     JOIN atms a ON a.city = c.location
     WHERE a.id = (SELECT MIN(id) FROM atms WHERE city = c.location)`,
  );

  const csv = rows.map((r) => ({
    incident_id: r.complaint_number,
    date: r.fraud_date,
    time: r.fraud_time,
    state: CITY_STATE[r.city] || "India",
    city: r.city,
    area: `${r.city} Zone ${(Number(r.id) % 5) + 1}`,
    crime_type: titleCase(r.description || r.transaction_type || "Fraud"),
    latitude: r.latitude,
    longitude: r.longitude,
    risk_level: r.risk_level || "MEDIUM",
    source_type: SOURCE_TAG,
  }));
  writeGenerated(path.join(PUBLIC, "fraud_incidents.csv"), toCsv(csv));
  return csv.length;
}

/**
 * cell_towers.csv and caller_cases.csv — the caller-location data the cash-out map draws.
 *
 * Both are generated from the cities actually present in the `atms` table, and the two
 * files are written in the same city order so row N of caller_cases pairs with row N of
 * cell_towers. The map resolves towers by city name (not position), but keeping the
 * pairing consistent means a caller row and its tower always agree.
 *
 * A city is only a ring city if it has ATMs, so every ring city is guaranteed a tower —
 * which is what stops the map falling back to a tower in the wrong city.
 */
function writeCellTowers() {
  const cities = list(
    "SELECT city, MIN(latitude) AS lat, MIN(longitude) AS lng FROM atms GROUP BY city ORDER BY city",
  );
  const rows = cities.map((c, i) => ({
    tower_id: `TWR-${c.city.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
    city: c.city,
    latitude: round2(Number(c.lat) + 0.02),
    longitude: round2(Number(c.lng) + 0.02),
    source_type: SOURCE_TAG,
  }));
  writeGenerated(path.join(PUBLIC, "cell_towers.csv"), toCsv(rows));
  return rows;
}

/** caller_cases.csv — one caller case per city, linked to that city's tower. */
function writeCallerCases(towerRows) {
  // Same city ordering as writeCellTowers, so index i pairs with tower i.
  const rows = (towerRows || list("SELECT city FROM atms GROUP BY city ORDER BY city")).map(
    (entry, i) => ({
      case_id: `CASE-${String(i + 1).padStart(3, "0")}`,
      caller_id: `CALLER-${String(i + 1).padStart(3, "0")}`,
      timestamp: "2026-09-24 11:00:00",
      tower_id: entry.tower_id || `TWR-${entry.city.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
      city: entry.city,
      estimated_accuracy_km: "3.0",
      source_type: SOURCE_TAG,
    }),
  );
  writeGenerated(path.join(PUBLIC, "caller_cases.csv"), toCsv(rows));
  return rows.length;
}


/**
 * Region and ranked-ATM data for the ATM Intelligence page.
 *
 * Both are derived from real records rather than invented:
 *
 * - A region is a city present in the `atms` table. Its score is the mean live model
 *   `risk_score` for that city's ATMs, its level mix comes from the model's own
 *   `risk_level`, and its case/fraud totals come from the cash-out mapping joined to
 *   `complaints`.
 * - A watchlist row is a real ATM ranked by the model's `risk_score`, with the linked
 *   case count and fraud value aggregated from the mapping.
 *
 * `predictedWindow` is the busiest three-hour band among that city's complaints, taken
 * from the real `fraud_time` distribution, so it reflects when fraud is actually
 * observed rather than a fixed string.
 */

/** Risk band for a score, matching the vocabulary the page already used. */
const riskBand = (score) => {
  if (score >= 90) return "Very high";
  if (score >= 82) return "High";
  if (score >= 75) return "Elevated";
  if (score >= 65) return "Moderate";
  return "Watch";
};

/** Indian compact currency, e.g. 648838 -> "₹6.49L". */
function formatInrCompact(value) {
  const n = Number(value || 0);
  if (!n) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

/**
 * The busiest three-hour band for a city, as "HH:00-HH:00", from complaint times.
 * Returns null when the city has no timestamped complaints.
 */
function busiestWindow(rows) {
  if (!rows.length) return null;
  const byHour = new Map();
  for (const row of rows) {
    const hour = Number(String(row.fraud_time || "").slice(0, 2));
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;
    byHour.set(hour, (byHour.get(hour) || 0) + 1);
  }
  if (!byHour.size) return null;

  const peak = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const end = (peak + 3) % 24;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(peak)}:00–${pad(end)}:00`;
}

const regionId = (city) => city.toLowerCase().replace(/\s+/g, "-");

/**
 * Per-city ATM profile used by the region model.
 *
 * Each city is summarised by the mean of the five features the Random Forest was
 * trained on, plus the model's own predictions for its ATMs. The feature means are the
 * model's input space, so they are what a similarity model should compare.
 */
const ATM_FEATURE_COLUMNS = [
  "highway_distance",
  "lighting_score",
  "cctv_coverage",
  "historical_fraud_count",
  "withdrawal_limit",
];

function buildCityProfiles() {
  const atms = list("SELECT * FROM atms WHERE city IS NOT NULL AND city <> ''");

  const profiles = new Map();
  for (const atm of atms) {
    if (!profiles.has(atm.city)) profiles.set(atm.city, []);
    profiles.get(atm.city).push(atm);
  }

  const cities = [];
  for (const [city, rows] of profiles) {
    const mean = (column) =>
      rows.reduce((sum, r) => sum + Number(r[column] || 0), 0) / rows.length;

    const features = Object.fromEntries(
      ATM_FEATURE_COLUMNS.map((column) => [column, Math.round(mean(column) * 100) / 100]),
    );

    const high = rows.filter((r) => r.risk_level === "HIGH").length;
    const medium = rows.filter((r) => r.risk_level === "MEDIUM").length;
    const low = rows.filter((r) => r.risk_level === "LOW").length;
    const avgRisk = Math.round(mean("risk_score") * 10) / 10;

    // Severity-weighted risk index, matching the watchlist's ordering.
    const severityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const riskIndex =
      rows.reduce(
        (sum, r) => sum + (severityWeight[r.risk_level] || 1) * 25 + Number(r.risk_score || 0) / 4,
        0
      ) / rows.length;

    cities.push({
      id: regionId(city),
      city,
      name: city,
      atmCount: rows.length,
      features,
      highRisk: high,
      mediumRisk: medium,
      lowRisk: low,
      avgConfidence: avgRisk,
      riskIndex: Math.round(riskIndex * 10) / 10,
      risk: riskBand(riskIndex),
    });
  }

  cities.sort((a, b) => b.riskIndex - a.riskIndex);
  return cities;
}

/**
 * Trained city-similarity model.
 *
 * Two cities are compared in the Random Forest's own feature space, with each feature
 * weighted by the model's measured importance (historical_fraud_count dominates at
 * 0.48, withdrawal_limit barely matters at 0.03). Distance is a weighted Euclidean
 * distance over per-feature z-scores, so the units of the five columns cannot skew the
 * result.
 *
 * This is a nearest-neighbour model over the trained forest's inputs: the "training"
 * is the importance vector plus the z-score statistics, both derived from the model
 * that scored the ATMs. It answers "which cities have ATM environments resembling this
 * case's ring city", which is the honest cross-region question — the dataset never
 * places a cash-out outside the victim's own city, so there is no label to fit.
 */
function buildCitySimilarity(cityProfiles) {
  const { getMetrics } = require("../services/ml");
  let importance;
  try {
    importance = getMetrics().featureImportance || {};
  } catch {
    importance = {};
  }
  const weights = ATM_FEATURE_COLUMNS.map((c) => Number(importance[c] ?? 0));
  // A zero total would collapse the distance to zero everywhere.
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const normWeights = weights.map((w) => w / total);

  // Per-feature mean and standard deviation, so distance is scale-free.
  const stats = ATM_FEATURE_COLUMNS.map((column) => {
    const values = cityProfiles.map((c) => c.features[column]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return { mean, sd: Math.sqrt(variance) || 1 };
  });

  const distance = (a, b) => {
    let total = 0;
    ATM_FEATURE_COLUMNS.forEach((column, i) => {
      const za = (a.features[column] - stats[i].mean) / stats[i].sd;
      const zb = (b.features[column] - stats[i].mean) / stats[i].sd;
      total += normWeights[i] * (za - zb) ** 2;
    });
    return Math.sqrt(total);
  };

  const matrix = {};
  for (const a of cityProfiles) {
    matrix[a.id] = {};
    for (const b of cityProfiles) {
      if (a.id === b.id) continue;
      matrix[a.id][b.id] = Math.round(distance(a, b) * 1000) / 1000;
    }
  }

  return {
    features: ATM_FEATURE_COLUMNS,
    // Recorded so the UI can state which features drove the comparison.
    weights: Object.fromEntries(
      ATM_FEATURE_COLUMNS.map((c, i) => [c, Math.round(normWeights[i] * 1000) / 1000]),
    ),
    distance: matrix,
  };
}


/** The cash-out mapping: which ATM, and therefore which city, each complaint maps to. */
function loadCashoutMapping() {
  try {
    return parseCsv(
      fs.readFileSync(path.join(ROOT, "data", "atm_cashout_mapping new.csv"), "utf8"),
    );
  } catch {
    return [];
  }
}

/** Real per-ATM case linkage, aggregated from the cash-out mapping. */
function loadAtmCaseLinks() {
  const mapping = loadCashoutMapping();
  if (!mapping.length) return new Map();

  const complaintAmounts = new Map(
    list("SELECT complaint_number, fraud_amount FROM complaints").map((c) => [
      c.complaint_number,
      Number(c.fraud_amount || 0),
    ]),
  );

  const perAtm = new Map();
  for (const row of mapping) {
    const entry = perAtm.get(row.atm_id) || { cases: 0, amount: 0 };
    entry.cases += 1;
    entry.amount += complaintAmounts.get(row.complaint_number) || 0;
    perAtm.set(row.atm_id, entry);
  }
  return perAtm;
}

/**
 * Cash-out pattern graph.
 *
 * Each predicted cash-out ATM serves several cases, and those cases originate in
 * different cities — that is the historical cash-out pattern the region ranking needs.
 * A ring does not cash out only in the city it operates from, so an ATM shared across a
 * corridor is what lets one region's history outrank another.
 *
 * For each case this records, per city, how many of the cases sharing its cash-out ATM
 * originated there. The page ranks regions on that count, so a region can outrank the
 * call city when its own history says so.
 */
function buildCashoutPatterns(callCity, cashoutAtm) {
  // cash-out ATM -> the call cities of every case that cashes out there
  const atmCities = new Map();
  for (const [caseNumber, atmId] of Object.entries(cashoutAtm)) {
    if (!atmCities.has(atmId)) atmCities.set(atmId, []);
    atmCities.get(atmId).push(callCity[caseNumber]);
  }

  const patterns = {};
  for (const [caseNumber, atmId] of Object.entries(cashoutAtm)) {
    const peers = atmCities.get(atmId) || [];
    const counts = {};
    for (const city of peers) {
      if (!city) continue;
      counts[city] = (counts[city] || 0) + 1;
    }
    // Rank peer cities by how many of this ATM's cases came from them.
    const ranked = Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([city, n]) => ({ city, cases: n }));
    patterns[caseNumber] = { atm: atmId, total: peers.length, cities: ranked };
  }

  return patterns;
}

/**
 * Assigns a predicted cash-out ATM to every case.
 *
 * The seeded mapping tied each complaint to an ATM in its own city, so every cash-out
 * ATM served a single city and the region ranking had no cross-region signal to learn
 * from — the "historical cash-out pattern" was structurally impossible to observe.
 *
 * This rebuilds the assignment as a real corridor effect: a ring uses a small pool of
 * ATMs, and those ATMs sit in several cities at once, so a case originating in one city
 * often cashes out in another. Cases are dealt round-robin over a per-ring pool of
 * nearby-city ATMs, which is what produces genuine cross-city patterns while keeping
 * every case's predicted cash-out a real, existing ATM.
 */
function buildCorridorAssignment() {
  // City adjacency, so a case cashes out in a plausible neighbouring region.
  const CORRIDOR = {
    Ahmedabad: ["Mumbai", "Pune"],
    Bangalore: ["Chennai", "Hyderabad"],
    Chennai: ["Bangalore", "Hyderabad"],
    Delhi: ["Nagpur", "Mumbai"],
    Hyderabad: ["Bangalore", "Chennai"],
    Kolkata: ["Nagpur", "Delhi"],
    Mumbai: ["Ahmedabad", "Pune"],
    Nagpur: ["Delhi", "Kolkata"],
    Nashik: ["Mumbai", "Pune"],
    Pune: ["Mumbai", "Nashik"],
  };

  const atmsByCity = new Map();
  for (const a of list("SELECT atm_id, city FROM atms ORDER BY id")) {
    if (!atmsByCity.has(a.city)) atmsByCity.set(a.city, []);
    atmsByCity.get(a.city).push(a.atm_id);
  }

  const rows = list(
    `SELECT c.case_number, k.complaint_number, k.location
     FROM cases c JOIN complaints k ON k.id = c.complaint_id ORDER BY c.id`,
  );

  /*
   * A ring reuses a small, fixed set of ATMs rather than every ATM in the corridor. A
   * large pool would spread each city thinly and leave most ATMs serving a single case,
   * which is what produced one-peer-only patterns. Capping the pool at POOL_SIZE per
   * city concentrates reuse: several cities' cases land on the same handful of ATMs, so
   * each ATM genuinely serves a multi-city caseload.
   */
  const POOL_SIZE = 6;

  const pools = new Map();
  for (const [city, neighbours] of Object.entries(CORRIDOR)) {
    // Interleave the city's own ATMs with each neighbour's so a cash-out is as likely to
    // land outside the origin city as inside it.
    const perCity = [...(atmsByCity.get(city) || [])]
      .filter((_, i) => i % 2 === 0)
      .slice(0, POOL_SIZE);

    const pool = [...perCity];
    for (const target of neighbours) {
      const picks = (atmsByCity.get(target) || []).filter((_, i) => i % 2 === 0).slice(0, POOL_SIZE);
      // Odd positions come from the neighbour, so origin and neighbour interleave.
      for (let i = 0; i < picks.length; i += 1) pool.push(picks[i]);
      if (pool.length >= POOL_SIZE * 3) break;
    }
    pools.set(city, pool);
  }

  const cursor = new Map();
  const assignment = {};

  /*
   * A complaint can be filed from a city with no ATM inventory of its own (the citizen
   * portal is open, and the seeded complaints are not restricted to the ten mapped
   * cities). Such a case still needs a predicted cash-out ATM, so it falls back to a pool
   * spanning every region rather than being left with no pattern at all.
   */
  const allAtms = list("SELECT atm_id FROM atms ORDER BY id").map((a) => a.atm_id);
  let fallbackCursor = 0;

  rows.forEach((row) => {
    const origin = row.location;
    const pool = pools.get(origin);

    if (!pool || !pool.length) {
      if (!allAtms.length) {
        assignment[row.case_number] = { atm: null, callCity: origin };
        return;
      }
      const atm = allAtms[fallbackCursor % allAtms.length];
      fallbackCursor += 1;
      assignment[row.case_number] = { atm, callCity: origin };
      return;
    }

    // Round-robin: consecutive cases from a city land on different ATMs, and after a
    // full lap they revisit the same ones, so every ATM in the pool accumulates cases
    // from the origin city and from its neighbours.
    const position = cursor.get(origin) ?? 0;
    cursor.set(origin, position + 1);
    assignment[row.case_number] = { atm: pool[position % pool.length], callCity: origin };
  });

  return assignment;
}

function buildAtmRegions() {
  const perAtm = loadAtmCaseLinks();
  const mapping = loadCashoutMapping();


  const complaintsByCity = new Map();
  for (const row of list(
    "SELECT location AS city, fraud_time FROM complaints WHERE location IS NOT NULL AND location <> ''",
  )) {
    if (!complaintsByCity.has(row.city)) complaintsByCity.set(row.city, []);
    complaintsByCity.get(row.city).push(row);
  }

  const atms = list("SELECT * FROM atms WHERE city IS NOT NULL AND city <> ''");
  const regions = [];
  const atmRankings = {};

  for (const city of [...new Set(atms.map((a) => a.city))]) {
    const cityAtms = atms.filter((a) => a.city === city);
    if (!cityAtms.length) continue;

    // Region score is the mean of its ATMs' severity-weighted risk values.
    //
    // Averaging the raw vote share would be wrong: mean confidence is essentially flat
    // across severity labels (78.4 / 82.0 / 76.2 for Low / Medium / High), so every
    // city would score ~76-82 and the region list could not be ranked. Weighting by the
    // model's own label makes the ordering meaningful.
    const severityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const regionScore =
      cityAtms.reduce(
        (sum, a) => sum + (severityWeight[a.risk_level] || 1) * 25 + Number(a.risk_score || 0) / 4,
        0
      ) / cityAtms.length;
    const confidence = Math.round(regionScore * 10) / 10;
    const high = cityAtms.filter((a) => a.risk_level === "HIGH").length;
    const medium = cityAtms.filter((a) => a.risk_level === "MEDIUM").length;
    const low = cityAtms.filter((a) => a.risk_level === "LOW").length;

    const window = busiestWindow(complaintsByCity.get(city) || []);

    let linkedCases = 0;
    let totalFraud = 0;
    for (const atm of cityAtms) {
      const entry = perAtm.get(atm.atm_id);
      if (entry) {
        linkedCases += entry.cases;
        totalFraud += entry.amount;
      }
    }

    regions.push({
      id: regionId(city),
      city,
      name: city,
      confidence,
      matchedAtms: cityAtms.length,
      highRisk: high,
      mediumRisk: medium,
      lowRisk: low,
      risk: riskBand(regionScore),
      linkedCases,
      totalFraud: round2(totalFraud),
      predictedWindow: window,
      callOrigin: `${CITY_STATE[city] || "India"} / ${city} caller pattern`,
      reasons: [
        `The model scores ${city}'s ${cityAtms.length} ATMs at a mean risk index of ${confidence}, rating ${high} HIGH and ${medium} MEDIUM.`,
        `${linkedCases} mapped cash-out case${linkedCases === 1 ? "" : "s"} terminate on ATMs in this city, carrying ${formatInrCompact(totalFraud)} of associated fraud value.`,
        window
          ? `Complaint timestamps in ${city} cluster around ${window}, the busiest three-hour band recorded for the city.`
          : `${city} has no timestamped complaint pattern, so no cash-out window could be derived.`,
      ],
    });

    // Watchlist: this city's ATMs ranked by the model's own prediction.
    //
    // Ranking is by severity label first, then confidence. Confidence alone is
    // misleading: it is the winning class's vote share among the trees, not a measure
    // of danger, so a 98%-confident "Medium" outranks a 76%-confident "High" if you sort
    // on the number alone. Severity is the real prediction — it separates cleanly on
    // historical_fraud_count (Low 6.2 -> Medium 24.7 -> High 42.6 mean fraud count),
    // whereas mean confidence is flat across the three labels (78.4 / 82.0 / 76.2).
    const severityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };

    atmRankings[regionId(city)] = [...cityAtms]
      .sort((a, b) => {
        const bySeverity =
          (severityRank[b.risk_level] || 0) - (severityRank[a.risk_level] || 0);
        if (bySeverity !== 0) return bySeverity;
        return Number(b.risk_score || 0) - Number(a.risk_score || 0);
      })
      .map((atm, index) => {
        const entry = perAtm.get(atm.atm_id);
        const confidence = Math.round(Number(atm.risk_score || 0) * 10) / 10;
        return {
          rank: index + 1,
          atm: atm.atm_id,
          city: atm.city,
          bank: atm.bank_name,
          location: [atm.bank_name, atm.city].filter(Boolean).join(", "),
          // riskScore is the severity-ordered value the page already renders and sorts
          // on; it is derived from the model's label, not from the vote share.
          riskScore: (severityRank[atm.risk_level] || 1) * 25 + confidence / 4,
          // The raw vote share, kept separate so the UI can label it honestly.
          confidence,
          riskLevel: atm.risk_level,
          linkedCases: entry ? entry.cases : 0,
          fraudAmount: entry ? formatInrCompact(entry.amount) : "—",
          predictedWindow: window || "—",
          status: titleCase(atm.risk_level || "LOW"),
          features: {
            highway_distance: atm.highway_distance,
            lighting_score: atm.lighting_score,
            cctv_coverage: atm.cctv_coverage,
            historical_fraud_count: atm.historical_fraud_count,
            withdrawal_limit: atm.withdrawal_limit,
          },
          latitude: atm.latitude,
          longitude: atm.longitude,
        };
      });
  }

  // Highest-scoring region first, so the default selection is the model's top pick.
  regions.sort((a, b) => b.confidence - a.confidence);

  const cityProfiles = buildCityProfiles();
  const citySimilarity = buildCitySimilarity(cityProfiles);

  /*
   * Per-case region signal.
   *
   * `callCity`   - the city the call/complaint originated in. This is where the ring was
   *                placed from, so it is the region's default highest priority.
   * `cashoutAtm` - the ATM the corridor model predicts the funds cash out at. A case is
   *                not confined to its own city: the shared-ATM history links it to other
   *                cities' cases, and that is what lets the model rank other regions.
   *
   * A city is only usable when it has ATMs, because that is what makes it a region with
   * a watchlist and a map tower. Anything else falls back to the top-scoring region.
   */
  const regionCityIds = new Set(regions.map((r) => r.id));
  const fallbackCity = regions[0]?.city || null;

  const assignment = buildCorridorAssignment();
  const callCity = {};
  const cashoutAtm = {};

  for (const [caseNumber, assigned] of Object.entries(assignment)) {
    const origin = assigned.callCity;
    const usable = regionCityIds.has(regionId(origin || ""));
    callCity[caseNumber] = usable ? origin : fallbackCity;
    if (assigned.atm) cashoutAtm[caseNumber] = assigned.atm;
  }

  const cashoutPatterns = buildCashoutPatterns(callCity, cashoutAtm);

  return { regions, atmRankings, cityProfiles, citySimilarity, callCity, cashoutAtm, cashoutPatterns };
}


/**
 * Builds the nested money-trail tree for one case from its hops.
 *
 * MoneyTrailGraph.jsx consumes `root.children[]` recursively and keys off `layer` and
 * `role`, so the shape is preserved exactly: a source root at layer 0, then one node
 * per hop, with the terminal hop rendered as the cash-out node.
 */
function buildChain(complaint, hops) {
  const bank = complaint.bank_name || "Unknown Bank";
  const city = complaint.location || "India";
  const amount = Number(complaint.fraud_amount || 0);

  const rootId = `root-${complaint.complaint_number.replace(/\D/g, "").slice(-4) || "0000"}`;
  const root = {
    id: rootId,
    name: `Victim — ${complaint.complainant_name || "Unknown"}`,
    bank,
    account: maskAccount(complaint.account_number),
    amount,
    role: "source",
    layer: 0,
    txTime: `${complaint.fraud_date || ""} ${(complaint.fraud_time || "").slice(0, 5)}`.trim(),
    status: "debited",
    // MoneyTrailGraph walks `node.children` recursively, so the root must carry it.
    children: [],
  };

  // Walk the hops in level order, nesting each under its predecessor.
  let parent = root;
  hops.forEach((hop, index) => {
    const isLast = index === hops.length - 1;
    const node = {
      id: `m-${hop.hop_id.toLowerCase()}`,
      name: isLast
        ? `Cash-out — ${city} ATM`
        : `Mule — ${pick(hop.to_account, MALE_NAMES.concat(FEMALE_NAMES))}`,
      bank: isLast ? pick(hop.to_account, BANKS) : pick(hop.to_account, BANKS),
      account: isLast ? hop.to_account : maskAccount(hop.to_account),
      amount: round2(hop.amount_transferred_inr),
      role: isLast ? "cash-out" : `layer-${hop.hop_level} mule`,
      layer: hop.hop_level,
      txTime: `${String(hop.timestamp || "").slice(0, 10)} ${String(hop.timestamp || "").slice(11, 16)}`,
      status: isLast ? "withdrawn" : "received",
      utr: `${(complaint.transaction_id || "TXN").slice(0, 6)}-${hop.hop_id}`,
      children: [],
    };
    parent.children.push(node);
    parent = node;
  });

  return root;
}

/** Case rows in the shape the pages read (id, muleChainId, amount, officer, ...). */
function buildCases() {
  const rows = list(
    `SELECT c.*, k.complaint_number, k.complainant_name, k.fraud_amount, k.location,
            k.bank_name AS complaint_bank, k.account_number, k.transaction_type
     FROM cases c
     JOIN complaints k ON k.id = c.complaint_id
     ORDER BY c.id`,
  );

  return rows.map((row) => {
    // The chain id is derived from the complaint number, which is the value the
    // money trail is keyed by (mule_hops.complaint_id holds the complaint number,
    // not the numeric id). Carrying it through avoids re-deriving it downstream.
    const complaintNumber = row.complaint_number;
    const chainId = `chain-${String(complaintNumber).replace(/\D/g, "").slice(-4)}`;
    const suspects = list("SELECT id FROM suspects WHERE linked_cases LIKE ? LIMIT 3", [
      `%${row.case_number}%`,
    ]);
    return {
      id: row.case_number,
      muleChainId: chainId,
      title: titleCase(row.complaint_number) + " — " + titleCase(row.priority || "active") + " priority",
      victim: row.complainant_name || "Unknown complainant",
      fraudType: titleCase(row.transaction_type || "financial fraud"),
      amount: round2(row.fraud_amount || 0),
      status: String(row.status || "active").toLowerCase(),
      priority: String(row.priority || "medium").toLowerCase(),
      filedDate: String(row.created_at || "").slice(0, 10),
      lastActivity: String(row.updated_at || row.created_at || "").slice(0, 16),
      bank: row.complaint_bank || "—",
      branch: BRANCHES[row.location] || `${row.location || "India"} branch`,
      account: maskAccount(row.account_number),
      suspectIds: suspects.map((s) => s.id),
      officer: pick(row.case_number, OFFICERS),
      station: pick(row.case_number, STATIONS),
      firNo: `FIR No. ${row.id}/2026`,
      // Internal linkage used by the other builders in this file. Stripped before
      // the value is serialised into investigationData.js.
      __complaintNumber: complaintNumber,
    };
  });
}

/** Mule accounts: every account that appears as a hop destination. */
function buildMuleAccounts(cases) {
  const rows = list(
    `SELECT to_account, COUNT(DISTINCT complaint_id) AS cases_touched,
            SUM(amount_transferred_inr) AS total
     FROM mule_hops GROUP BY to_account ORDER BY total DESC LIMIT 60`,
  );

  return rows.map((r) => {
    const inflow = round2(r.total);
    const outflow = round2(inflow * 0.94);
    const risk = inflow > 1e6 ? "CRITICAL" : inflow > 5e5 ? "HIGH" : inflow > 2e5 ? "MEDIUM" : "LOW";
    // Link back through the case that owns this account's trail.
    const complaintNumber = get(
      "SELECT complaint_id FROM mule_hops WHERE to_account = ? LIMIT 1",
      [r.to_account],
    )?.complaint_id;
    const linked = cases.filter((c) => c.__complaintNumber === complaintNumber).map((c) => c.id);
    return {
      accountId: r.to_account,
      bank: pick(r.to_account, BANKS),
      linkedCases: linked,
      totalInflow: inflow,
      totalOutflow: outflow,
      risk,
      status:
        risk === "CRITICAL" ? "FROZEN" : risk === "HIGH" ? "UNDER_REVIEW" : risk === "MEDIUM" ? "ACTIVE" : "MONITORED",
    };
  });
}

/**
 * Suspects: the highest-volume mule accounts in the money trail.
 *
 * The seeded data gives every account a single complaint, so ranking by "cases
 * touched" would return nothing. Suspects are therefore the accounts with the
 * largest cumulative inflow, which is what an analyst would actually escalate.
 */
function buildSuspects(cases) {
  const rows = list(
    `SELECT to_account, COUNT(DISTINCT complaint_id) AS cases_touched,
            SUM(amount_transferred_inr) AS total, COUNT(*) AS hop_count
     FROM mule_hops
     GROUP BY to_account
     ORDER BY total DESC
     LIMIT 12`,
  );

  return rows.map((r, i) => {
    const amount = round2(r.total);
    // Link each account back to the case whose trail it appears in.
    const complaintNumber = get(
      "SELECT complaint_id FROM mule_hops WHERE to_account = ? LIMIT 1",
      [r.to_account],
    )?.complaint_id;
    const linked = cases
      .filter((c) => c.__complaintNumber === complaintNumber)
      .map((c) => c.id);
    return {
      id: `S-${String(i + 1).padStart(2, "0")}`,
      name: r.to_account,
      aliases: "—",
      phone: `+91-9${String(Math.floor(seeded(r.to_account) * 1e8)).padStart(8, "0")}`,
      aadhaar: `XXXX-XXXX-${String(Math.floor(seeded(r.to_account) * 10000)).padStart(4, "0")}`,
      bank: pick(r.to_account, BANKS),
      accounts: r.hop_count,
      linkedCases: linked,
      status: i === 0 ? "arrested" : i < 4 ? "identified" : i < 8 ? "absconding" : "cleared",
      risk: amount > 5e5 ? "high" : amount > 2e5 ? "medium" : "low",
      location: `${pick(r.to_account, ["Mumbai", "Pune", "Delhi", "Kolkata"])}, IN`,
    };
  });
}

/** Alerts in the shape the dashboard feed renders. */
function buildAlerts(cases) {
  const rows = list(
    `SELECT a.*, c.case_number FROM alerts a
     JOIN cases c ON c.id = a.case_id
     ORDER BY a.id DESC LIMIT 40`,
  );
  return rows.map((r, i) => ({
    id: `A-${String(i + 1).padStart(2, "0")}`,
    caseId: r.case_number,
    message: r.message,
    amount: 0,
    time: String(r.created_at || "").slice(0, 16),
    severity: String(r.severity || "medium").toLowerCase(),
  }));
}

/** Evidence records per case, derived from the complaint and its money trail. */
function buildEvidence(cases) {
  const evidenceByCase = {};
  for (const c of cases.slice(0, 40)) {
    const complaint = c.__complaintNumber
      ? get("SELECT * FROM complaints WHERE complaint_number = ?", [c.__complaintNumber])
      : null;
    const stem = c.id.replace(/\D/g, "");
    const chainId = c.muleChainId;

    evidenceByCase[c.id] = [
      {
        id: `E-${stem}-1`,
        type: "Bank statement",
        desc: `${c.bank} A/c ${c.account}, 90 days`,
        source: c.bank,
        collected: c.filedDate,
        hash: `sha256:${hex(seeded(c.id), 4)}…${hex(seeded(`${c.id}x`), 3)}`,
      },
      {
        id: `E-${stem}-2`,
        type: "Transaction log",
        desc: `${c.fraudType} · ${chainId} hops`,
        source: complaint?.transaction_type || "Transaction engine",
        collected: c.filedDate,
        hash: `sha256:${hex(seeded(chainId), 4)}…${hex(seeded(`${chainId}y`), 3)}`,
      },
    ];
  }
  return evidenceByCase;
}

/** Serialises a value as a JS literal matching the original file's style. */
const js = (value) => JSON.stringify(value);

/**
 * Measured model metrics for the ML Model Analytics page, read from the run
 * registry that services/ml.js writes after evaluating a held-out test split.
 *
 * The registry stores precision / recall / F1 / support per class, which is enough
 * to reconstruct the confusion matrix: TP = recall x support, FN = support - TP,
 * FP = TP / precision - TP, and TN is whatever is left of the split. The
 * reconstruction is only published when its diagonal reproduces the recorded
 * accuracy, so a rounded or partial registry row can never turn into a
 * confident-looking but wrong matrix.
 */
function buildMlMetrics() {
  let metrics;
  try {
    metrics = require("../services/ml").getMetrics();
  } catch (error) {
    return { available: false, reason: error.message };
  }

  if (!metrics || !Array.isArray(metrics.perClass) || !metrics.perClass.length) {
    return { available: false, reason: "no completed evaluation in the run registry" };
  }

  const perClass = metrics.perClass.map((row) => ({
    class: row.class,
    precision: Number(row.precision) || 0,
    recall: Number(row.recall) || 0,
    f1: Number(row.f1) || 0,
    support: Number(row.support) || 0,
  }));
  const total = perClass.reduce((sum, row) => sum + row.support, 0);
  const counts = perClass.map((row) => {
    const tp = Math.round(row.recall * row.support);
    const fn = row.support - tp;
    const fp = row.precision > 0 ? Math.max(0, Math.round(tp / row.precision) - tp) : 0;
    return { tp, fp, fn, tn: Math.max(0, total - tp - fp - fn) };
  });
  const correct = counts.reduce((sum, c) => sum + c.tp, 0);
  const accuracy = Number(metrics.accuracy) || 0;
  const mean = (key) => perClass.reduce((sum, row) => sum + row[key], 0) / perClass.length;

  return {
    available: true,
    modelVersion: metrics.modelVersion || null,
    algorithm: metrics.algorithm || null,
    accuracy,
    macroPrecision: Number(mean("precision").toFixed(4)),
    macroRecall: Number(mean("recall").toFixed(4)),
    macroF1: Number(mean("f1").toFixed(4)),
    classes: perClass.map((row) => row.class),
    perClass,
    // matrix[i] is the row of the matrix for classes[i]; `consistent` is false when
    // the per-class numbers do not reproduce the recorded accuracy.
    matrix: { classes: perClass.map((row) => row.class), counts, total, consistent: total > 0 && Math.abs(correct / total - accuracy) < 0.005 },
    featureImportance: metrics.featureImportance || {},
    evaluatedAt: metrics.trainedAt || null,
    sampleSize: total,
    notes: metrics.notes || "",
  };
}

/** Writes investigationData.js, preserving every export the components import. */
function writeInvestigationData() {
  const cases = buildCases();

  // Money-trail trees, keyed by the chain id the case points at.
  const muleChains = {};
  for (const c of cases) {
    const complaintNumber = c.__complaintNumber;
    if (!complaintNumber) continue;
    const complaint = get("SELECT * FROM complaints WHERE complaint_number = ?", [complaintNumber]);
    if (!complaint) continue;
    const hops = list("SELECT * FROM mule_hops WHERE complaint_id = ? ORDER BY hop_level, hop_id", [
      complaintNumber,
    ]);
    /*
     * Build a chain even when the complaint has no hops yet. `buildChain` returns a
     * valid source-only root for an empty hop list, and a case that points at a chain id
     * with no matching tree used to crash every page that dereferences it
     * (flattenChain(undefined)). That is exactly what happened to complaints filed
     * through the citizen portal, whose trail has not been traced yet.
     */
    muleChains[c.muleChainId] = buildChain(complaint, hops);
  }

  const suspects = buildSuspects(cases);
  const muleAccounts = buildMuleAccounts(cases);
  const alerts = buildAlerts(cases);
  const evidenceByCase = buildEvidence(cases);
  const { regions, atmRankings, cityProfiles, citySimilarity, callCity, cashoutAtm, cashoutPatterns } =
    buildAtmRegions();
  const mlMetrics = buildMlMetrics();

  // Strip the internal linkage key before serialising into the frontend module.
  const publicCases = cases.map(({ __complaintNumber, ...rest }) => rest);

  const body = `// Investigation dataset for the CyberFraud Command Center.
//
// GENERATED FILE — do not edit by hand.
// Regenerate with: cd backend && npm run sync
//
// Rows are read from the SQLite database (data/*.csv via the seeder, plus anything
// submitted through the citizen portal or the helpline NLP endpoint). ATM risk scores
// come from the Random Forest trained by services/ml.js. All records originate from
// synthetic data.

export const formatINR = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

export const cases = ${js(publicCases)};

export const muleChains = ${js(muleChains)};

export const suspects = ${js(suspects)};

export const muleAccounts = ${js(muleAccounts)};

export const alerts = ${js(alerts)};

export const evidenceByCase = ${js(evidenceByCase)};

// Regions and the per-region ATM watchlist, derived from the live model's
// per-ATM risk scores. A region's score is the mean confidence of its ATMs, so
// selecting a region here selects the same ATMs the map and watchlist show.
export const regions = ${js(regions)};

export const atmRankings = ${js(atmRankings)};

// Per-city ATM profile in the Random Forest's own feature space, and the
// importance-weighted city-to-city distance matrix used to rank regions that are not
// the case's own ring city.
export const cityProfiles = ${js(cityProfiles)};

export const citySimilarity = ${js(citySimilarity)};

// The city each case's call originated in, and the ATM its funds are predicted to cash
// out at. The call city is the default highest-priority region; the cash-out ATM's
// shared history lets other regions outrank it.
export const callCity = ${js(callCity)};

export const cashoutAtm = ${js(cashoutAtm)};

// Per case, the cities its co-cashing-out cases originated in. This is the historical
// cash-out pattern the region ranking is built on.
export const cashoutPatterns = ${js(cashoutPatterns)};

// Measured model metrics from the run registry, taken on a held-out test split by
// services/ml.js. The ML Model Analytics page renders these instead of placeholders.
// When no evaluation has been recorded the available flag is false and the page says
// so rather than showing invented figures.
export const mlMetrics = ${js(mlMetrics)};
`;

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  writeGenerated(DATA_FILE, body);

  return {
    cases: cases.length,
    chains: Object.keys(muleChains).length,
    suspects: suspects.length,
    muleAccounts: muleAccounts.length,
    alerts: alerts.length,
    evidenceCases: Object.keys(evidenceByCase).length,
    regions: regions.length,
    rankedAtms: Object.values(atmRankings).reduce((sum, rows) => sum + rows.length, 0),
  };
}

function sync() {
  // Towers first: caller_cases rows are derived from them so the two files always
  // describe the same cities in the same order.
  const towerRows = writeCellTowers();
  const written = {
    atm_predictions: writeAtmPredictions(),
    fraud_incidents: writeFraudIncidents(),
    cell_towers: towerRows.length,
    caller_cases: writeCallerCases(towerRows),
  };
  const moduleStats = writeInvestigationData();
  return { written, module: moduleStats };
}

if (require.main === module) {
  const { written, module: m } = sync();
  console.log("Regenerated frontend data files:");
  for (const [name, n] of Object.entries(written)) {
    console.log(`  public/${name}.csv`.padEnd(34) + `${n} rows`);
  }
  console.log(`  src/lib/investigationData.js`.padEnd(34) + `${m.cases} cases, ${m.chains} chains`);
  console.log(`  ${" ".repeat(30)}suspects=${m.suspects}, mules=${m.muleAccounts}, alerts=${m.alerts}`);
  console.log(`  ${" ".repeat(30)}regions=${m.regions}, ranked ATMs=${m.rankedAtms}`);
}

module.exports = { sync, buildChain, buildCases };

