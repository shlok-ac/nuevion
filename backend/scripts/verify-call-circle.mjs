/**
 * Static cross-check: the ATM Intelligence map must draw exactly ONE call circle per
 * case, anchored to the city the call was placed from - not one per cash-out region.
 *
 * The page passes `towerCity={callCity}`; the map resolves that city to a row in
 * caller_cases.csv, then to a tower in cell_towers.csv, and draws a single L.circle.
 * This script proves that resolution succeeds and stays unique for every case, so a
 * case can never end up with a circle in the wrong city or with a circle per region.
 */
import { readFileSync } from "node:fs";

const root = "C:/Users/shlok/Documents/Github/nuevion";
const { cases, callCity } = await import(
  `file:///${root}/frontend/src/lib/investigationData.js`
);

function readCsv(name) {
  const lines = readFileSync(`${root}/frontend/public/${name}`, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const headers = lines.shift().split(",").map((h) => h.trim());
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] || "").trim()]));
  });
}

const callerCases = readCsv("caller_cases.csv");
const towers = readCsv("cell_towers.csv");

const callerCities = new Set(callerCases.map((c) => c.city));
const towerById = new Map(towers.map((t) => [t.tower_id, t]));

let pass = 0;
const unknownCity = [];
const missingTower = [];
const multiTower = [];

for (const c of cases) {
  // Exactly what the page passes, and exactly what the map resolves.
  const towerCity = callCity[c.id] || String(c.branch || "").split(",").pop().trim();

  if (!callerCities.has(towerCity)) {
    unknownCity.push(`${c.id}: ${towerCity}`);
    continue;
  }

  // The map picks the first caller row for that city, then that row's tower.
  const callerRow = callerCases.find((r) => r.city === towerCity);
  const tower = towerById.get(callerRow.tower_id);

  if (!tower) {
    missingTower.push(`${c.id}: ${towerCity} -> ${callerRow.tower_id}`);
    continue;
  }
  if (!Number.isFinite(Number(tower.latitude)) || !Number.isFinite(Number(tower.longitude))) {
    missingTower.push(`${c.id}: ${towerCity} -> ${callerRow.tower_id} (no coords)`);
    continue;
  }

  // One city -> one caller row -> one tower. More than one would mean a
  // circle per city again.
  const rows = callerCases.filter((r) => r.city === towerCity);
  if (rows.length !== 1) multiTower.push(`${c.id}: ${towerCity} x${rows.length}`);

  pass++;
}

console.log(`cases checked: ${cases.length}`);
console.log(`  one call circle, at the call city: ${pass}`);
console.log(`  call city not in caller_cases.csv: ${unknownCity.length}`);
console.log(`  caller row with no usable tower  : ${missingTower.length}`);
console.log(`  cities with more than one row    : ${multiTower.length}`);

for (const [label, list] of [
  ["unknown call city", unknownCity],
  ["missing tower", missingTower],
  ["duplicate caller rows", multiTower],
]) {
  if (list.length) console.log(`\n${label}:\n  ${list.slice(0, 10).join("\n  ")}`);
}

const bad = unknownCity.length + missingTower.length + multiTower.length;
console.log(bad === 0 ? "\nPASS  every case resolves to exactly one call circle." : "\nFAIL");
process.exitCode = bad === 0 ? 0 : 1;