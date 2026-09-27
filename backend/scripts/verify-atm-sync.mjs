/**
 * Verifies the ATM Intelligence page's three boxes agree with each other and with the
 * map's own data source.
 *
 * Region -> map city filter -> watchlist must all resolve to the same set of ATMs.
 * Run: node scripts/verify-atm-sync.mjs
 */
import { readFileSync } from "node:fs";

const dataFile =
  "file:///C:/Users/shlok/Documents/Github/nuevion/frontend/src/lib/investigationData.js";
const csvFile = "C:/Users/shlok/Documents/Github/nuevion/frontend/public/atm_predictions.csv";

const { regions, atmRankings } = await import(dataFile);

const out = [];
const say = (s) => out.push(s);
let failures = 0;
const check = (name, cond, detail = "") => {
  if (cond) say(`PASS  ${name}`);
  else {
    failures += 1;
    say(`FAIL  ${name}  ${detail}`);
  }
};

// Parse the CSV the map actually fetches.
const lines = readFileSync(csvFile, "utf8").trim().split(/\r?\n/);
const headers = lines.shift().split(",");
const csvRows = lines.map((line) => Object.fromEntries(headers.map((h, i) => [h, line.split(",")[i] ?? ""])));

say(`regions: ${regions.length}   map CSV rows: ${csvRows.length}\n`);

// 1. Every region maps to a city that actually exists in the map's data.
const csvCities = new Set(csvRows.map((r) => r.city));
const badCity = regions.filter((r) => !csvCities.has(r.city));
check("every region city exists in the map's CSV", badCity.length === 0, badCity.map((r) => r.city).join(", "));

// 2. The map's city filter can be set to every region city.
check("map can be filtered to every region city", regions.every((r) => csvCities.has(r.city)));

// 3. Each region's watchlist holds exactly that city's ATMs from the map.
let countMismatch = [];
for (const region of regions) {
  const rows = atmRankings[region.id] || [];
  const expected = csvRows.filter((r) => r.city === region.city).length;
  if (rows.length !== expected) countMismatch.push(`${region.name}: ${rows.length} vs ${expected}`);
  if (rows.length !== region.matchedAtms) countMismatch.push(`${region.name}: rows ${rows.length} vs matchedAtms ${region.matchedAtms}`);
}
check("watchlist row count equals the city's ATM count in the map", countMismatch.length === 0, countMismatch.join("; "));

// 4. Watchlist ATMs are all from the selected region.
let crossCity = [];
for (const region of regions) {
  for (const row of atmRankings[region.id] || []) {
    if (row.city !== region.city) crossCity.push(`${row.atm} in ${region.name} but city=${row.city}`);
  }
}
check("no ATM leaks across regions", crossCity.length === 0, crossCity.slice(0, 3).join("; "));

// 5. Every watchlist ATM id really exists in the map's CSV.
const csvAtmIds = new Set(csvRows.map((r) => r.atm_id));
const unknown = [];
for (const rows of Object.values(atmRankings)) {
  for (const row of rows) if (!csvAtmIds.has(row.atm)) unknown.push(row.atm);
}
check("every watchlist ATM exists in the map's CSV", unknown.length === 0, unknown.slice(0, 5).join(", "));

// 6. Watchlist is ordered by severity then confidence, matching the model's labels.
const severityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
let outOfOrder = [];
for (const [id, rows] of Object.entries(atmRankings)) {
  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1];
    const curr = rows[i];
    const bySeverity = (severityRank[curr.riskLevel] || 0) - (severityRank[prev.riskLevel] || 0);
    if (bySeverity > 0 || (bySeverity === 0 && curr.confidence > prev.confidence)) {
      outOfOrder.push(`${id} #${i}`);
    }
  }
}
check("watchlist is ordered by severity then confidence", outOfOrder.length === 0, outOfOrder.slice(0, 3).join(", "));

// 7. Ranks are 1..n with no gaps.
let badRanks = [];
for (const [id, rows] of Object.entries(atmRankings)) {
  rows.forEach((r, i) => {
    if (r.rank !== i + 1) badRanks.push(id);
  });
}
check("ranks are sequential from 1", badRanks.length === 0, badRanks.slice(0, 3).join(", "));

// 8. Regions are sorted by descending risk index.
const sortedByRisk = [...regions].sort((a, b) => b.confidence - a.confidence);
check("regions are ranked by descending risk index", regions.every((r, i) => r.id === sortedByRisk[i].id));

// 9. The default selection (regions[0]) resolves to a non-empty watchlist.
const top = regions[0];
check("default region has a populated watchlist", (atmRankings[top.id] || []).length > 0);
say(`\ndefault region: ${top.name}  risk=${top.confidence}  rows=${(atmRankings[top.id] || []).length}`);

// 10. Regions have the fields the dialog renders.
const needed = ["confidence", "risk", "predictedWindow", "highRisk", "mediumRisk", "lowRisk", "linkedCases", "totalFraud", "reasons", "city", "matchedAtms"];
const missing = needed.filter((k) => regions.some((r) => r[k] === undefined));
check("every region carries the fields the dialog renders", missing.length === 0, missing.join(", "));

// 11. Watchlist rows carry the fields the table and details card render.
const rowNeeded = ["rank", "atm", "location", "riskScore", "linkedCases", "fraudAmount", "predictedWindow", "status", "riskLevel", "confidence", "features"];
const missingRow = rowNeeded.filter((k) => Object.values(atmRankings).some((rows) => rows.some((r) => r[k] === undefined)));
check("every watchlist row carries the fields the table renders", missingRow.length === 0, missingRow.join(", "));

// 12. No mock placeholders survive.
const serialised = JSON.stringify({ regions, atmRankings });
const mockMarkers = ["maharashtra-pune", "delhi-ncr", "mumbai-west", "ATM-001", "ATM-301", "FC Road", "Hinjewadi"];
const foundMocks = mockMarkers.filter((m) => serialised.includes(m));
check("no mock region or ATM ids remain", foundMocks.length === 0, foundMocks.join(", "));

say("");
say(failures === 0 ? "All ATM Intelligence sync checks passed." : `${failures} check(s) failed.`);
console.log(out.join("\n"));
process.exit(failures === 0 ? 0 : 1);
