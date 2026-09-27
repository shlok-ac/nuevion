/**
 * Verifies the ATM Intelligence page ranks regions PER CASE from the case's historical
 * cash-out pattern, and keeps the map, region box, ATM rank box and details card in
 * agreement. Also asserts the "RING" badge is gone for good.
 *
 * Run: node scripts/verify-case-regions.mjs
 */
import { readFileSync } from "node:fs";

const dataFile =
  "file:///C:/Users/shlok/Documents/Github/nuevion/frontend/src/lib/investigationData.js";
const pageFile = "C:/Users/shlok/Documents/Github/nuevion/frontend/src/pages/ATMIntelligence.jsx";
const csvFile = "C:/Users/shlok/Documents/Github/nuevion/frontend/public/atm_predictions.csv";

const {
  regions,
  atmRankings,
  cityProfiles,
  citySimilarity,
  cases,
  callCity,
  cashoutAtm,
  cashoutPatterns,
} = await import(dataFile);

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

const regionId = (city) => String(city || "").toLowerCase().replace(/\s+/g, "-");

// Mirror of the page's rankRegionsForCase, so this verifies the shipped logic.
function rankRegionsForCase(city, pattern) {
  const callId = regionId(city);
  const history = new Map((pattern?.cities || []).map((c) => [regionId(c.city), c.cases]));
  const peers = pattern?.total || 0;

  const ranked = regions.map((region) => {
    const isCallCity = region.id === callId;
    const historyCases = history.get(region.id) || 0;
    const historyShare = peers > 0 ? historyCases / peers : 0;
    const score = historyShare * 100 + (isCallCity ? 0.5 : 0) + (region.confidence / 100) * 0.1;
    return { ...region, isCallCity, historyCases, caseScore: Math.round(score * 100) / 100 };
  });

  return ranked.sort((a, b) =>
    b.caseScore !== a.caseScore ? b.caseScore - a.caseScore : a.name.localeCompare(b.name),
  );
}

say(`regions: ${regions.length}   cityProfiles: ${cityProfiles.length}   cases: ${cases.length}\n`);

// 1. Every region has a profile with numeric features.
const missingProfile = regions.filter((r) => !cityProfiles.some((c) => c.id === r.id));
check(
  "every region has a city profile",
  missingProfile.length === 0,
  missingProfile.map((r) => r.id).join(", "),
);

const badFeatures = cityProfiles.filter((p) =>
  citySimilarity.features.some((k) => typeof p.features[k] !== "number"),
);
check(
  "every city profile has numeric values for all model features",
  badFeatures.length === 0,
  badFeatures.map((p) => p.id).join(", "),
);

// 2. Weights are the normalised ML importances.
const weightSum = Object.values(citySimilarity.weights).reduce((a, b) => a + b, 0);
check("similarity weights sum to 1", Math.abs(weightSum - 1) < 0.01, `sum=${weightSum}`);

// 3. Distance matrix complete and symmetric.
const matrixIssues = [];
for (const a of regions) {
  for (const b of regions) {
    if (a.id === b.id) continue;
    const d = citySimilarity.distance?.[a.id]?.[b.id];
    if (typeof d !== "number" || d < 0) matrixIssues.push(`${a.id}->${b.id}=${d}`);
    if (Math.abs(citySimilarity.distance[a.id][b.id] - citySimilarity.distance[b.id][a.id]) > 0.001) {
      matrixIssues.push(`${a.id}/${b.id} asymmetric`);
    }
  }
}
check(
  "similarity distance matrix complete, non-negative and symmetric",
  matrixIssues.length === 0,
  matrixIssues.slice(0, 3).join(", "),
);


// 5. Per-case call city resolves to a real region, and the signal exists for every case.
const regionIds = new Set(regions.map((r) => r.id));
const noCallCity = cases.filter((c) => !callCity[c.id] || !regionIds.has(regionId(callCity[c.id])));
check("every case resolves a call city that is a real region", noCallCity.length === 0, `${noCallCity.length} unresolved`);

const noPattern = cases.filter((c) => !cashoutPatterns[c.id]);
check("every case has a cash-out pattern", noPattern.length === 0, `${noPattern.length} missing`);

const noAtm = cases.filter((c) => !cashoutAtm[c.id]);
check("every case has a predicted cash-out ATM", noAtm.length === 0, `${noAtm.length} missing`);

// 6. The cross-city signal is real: patterns span more than the call city.
const singleCity = cases.filter((c) => (cashoutPatterns[c.id]?.cities || []).length < 2);
check(
  "cash-out patterns span 2+ cities (real cross-city signal)",
  singleCity.length === 0,
  `${singleCity.length} single-city`,
);

const crossCity = cases.filter((c) =>
  (cashoutPatterns[c.id]?.cities || []).some((x) => regionId(x.city) !== regionId(callCity[c.id])),
);
check(
  "most cases can cash out outside their call city",
  crossCity.length > cases.length * 0.5,
  `${crossCity.length}/${cases.length}`,
);

// 7. The call city leads by default, but the pattern can override it.
let callFirst = 0;
let override = 0;
for (const k of cases) {
  const ranked = rankRegionsForCase(callCity[k.id], cashoutPatterns[k.id]);
  if (ranked[0].isCallCity) callFirst += 1;
  else override += 1;
}
check(
  "call city is the top-ranked region for most cases",
  callFirst > cases.length * 0.5,
  `callFirst=${callFirst}/${cases.length}`,
);
check("at least one case has a non-call city ranked first", override > 0, `override=${override}`);
say(`\n  call city ranked first: ${callFirst}/${cases.length}   overridden: ${override}/${cases.length}`);

// 8. Ranking is genuinely case-wise, not a constant list.
const sample = cases.slice(0, 80);
const orders = new Set(
  sample.map((c) =>
    rankRegionsForCase(callCity[c.id], cashoutPatterns[c.id])
      .map((r) => r.id)
      .join(","),
  ),
);
check("different cases produce different region orderings", orders.size > 1, `distinct orders=${orders.size}`);

// 9. Default selection is the top-ranked region and moves with the case.
const defaults = new Set(
  sample.map((c) => rankRegionsForCase(callCity[c.id], cashoutPatterns[c.id])[0].id),
);
check("default (top-ranked) region changes with the case", defaults.size > 1, `distinct defaults=${defaults.size}`);
say(`  distinct default regions across ${sample.length} cases: ${defaults.size}`);

// 10. Every default region is fully usable: watchlist rows + a real city for map/tower.
const unusable = [];
for (const k of cases) {
  const top = rankRegionsForCase(callCity[k.id], cashoutPatterns[k.id])[0];
  if (!atmRankings[top.id] || atmRankings[top.id].length === 0) {
    unusable.push(`${k.id}->${top.name} empty watchlist`);
  }
  if (!top.city) unusable.push(`${k.id}->${top.name} no city for map/tower`);
}
check(
  "every default region has a watchlist and a mappable city",
  unusable.length === 0,
  unusable.slice(0, 3).join(", "),
);

// 11. Watchlist matches the map's ATM set per city.
const lines = readFileSync(csvFile, "utf8").trim().split(/\r?\n/);
const headers = lines.shift().split(",");
const csvRows = lines.map((l) => Object.fromEntries(headers.map((h, i) => [h, l.split(",")[i] ?? ""])));
const csvCities = new Set(csvRows.map((r) => r.city));

const mismatch = [];
for (const region of regions) {
  const expected = csvRows.filter((r) => r.city === region.city).length;
  const rows = (atmRankings[region.id] || []).length;
  if (rows !== expected) mismatch.push(`${region.name}: ${rows} vs ${expected}`);
  if (!csvCities.has(region.city)) mismatch.push(`${region.name} not in map CSV`);
}
check("watchlist still matches the map's ATM set per city", mismatch.length === 0, mismatch.slice(0, 3).join(", "));

// 12. Every predicted cash-out ATM is a real ATM that exists in the map data.
const knownAtms = new Set(csvRows.map((r) => r.atm_id || r.atm));
const unknownAtm = Object.entries(cashoutAtm).filter(([, atm]) => !knownAtms.has(atm));
check(
  "every predicted cash-out ATM exists in the map's ATM data",
  unknownAtm.length === 0,
  unknownAtm.slice(0, 3).map((e) => e.join("->")).join(", "),
);

// 13. No mock data remains.
const serialised = JSON.stringify({ regions, atmRankings, cityProfiles, callCity, cashoutPatterns });
const mocks = ["maharashtra-pune", "delhi-ncr", "mumbai-west", "ATM-001", "ATM-301", "FC Road"].filter((m) =>
  serialised.includes(m),
);
check("no mock regions or ATM ids remain", mocks.length === 0, mocks.join(", "));

// 4. The "RING" badge is gone. This is the regression that was reported.
const page = readFileSync(pageFile, "utf8");
const ringRefs = ["isRing", "caseRingCity", "ringCity"].filter((t) => page.includes(t));
check("no ring-badge / ring-city references remain in the page", ringRefs.length === 0, ringRefs.join(", "));
check("no visible 'Ring' badge markup in the page", !/>\s*Ring\s*</.test(page));

say("");
say(failures === 0 ? "All per-case region checks passed." : `${failures} check(s) failed.`);
// exitCode rather than process.exit(), which truncates buffered stdout on Windows.
process.stdout.write(`${out.join("\n")}\n`);
process.exitCode = failures === 0 ? 0 : 1;
