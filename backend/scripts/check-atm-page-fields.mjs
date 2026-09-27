/**
 * Static cross-check: every region field the ATM Intelligence page reads must exist in
 * the generated data. A missing field is a runtime crash, which the Vite build cannot
 * catch because it only parses.
 */
import { readFileSync } from "node:fs";

const pageFile = "C:/Users/shlok/Documents/Github/nuevion/frontend/src/pages/ATMIntelligence.jsx";
const m = await import(
  "file:///C:/Users/shlok/Documents/Github/nuevion/frontend/src/lib/investigationData.js"
);

const src = readFileSync(pageFile, "utf8");

// Fields the page's rankRegionsForCase adds on top of the stored region.
const derived = new Set([
  "isCallCity",
  "historyCases",
  "historyShare",
  "cashoutAtm",
  "peerCases",
  "caseScore",
]);

// Scan the page with comments and string literals blanked out, so a sentence-ending
// "." in a comment (or text inside a string) cannot be mistaken for a field access.
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/\/\/[^\n]*/g, " ")
  .replace(/`(?:\\.|[^`\\])*`/g, '""')
  .replace(/"(?:\\.|[^"\\])*"/g, '""')
  .replace(/'(?:\\.|[^'\\])*'/g, '""');

const have = new Set([...Object.keys(m.regions[0]), ...derived]);

// Anything read off a region-ish object in the page.
const used = new Set();
const re = /(?:selectedRegion|dialogRegion|region|top)\s*\??\.\s*([A-Za-z_][A-Za-z0-9_]*)/g;
let hit;
while ((hit = re.exec(code))) used.add(hit[1]);

const missing = [...used].filter((k) => !have.has(k)).sort();

console.log(`region fields read by page (${used.size}): ${[...used].sort().join(", ")}`);
console.log(`\nstored region fields      (${Object.keys(m.regions[0]).length}): ${Object.keys(m.regions[0]).join(", ")}`);
console.log(`\nMISSING from data: ${missing.length ? missing.join(", ") : "(none)"}`);

// Also confirm every imported name from investigationData actually exists.
// Read the whole import statement (it may span several lines) and keep both the
// source name and the local alias: `callCity as callCityByCase` requires
// investigationData to export `callCity`, not `callCityByCase`.
const importStmt = src.match(
  /import\s*\{([^}]*?)\}\s*from\s*["'][^"']*investigationData["']/
);
const names = importStmt
  ? importStmt[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const parts = s.split(/\s+as\s+/);
        return { local: (parts[1] || parts[0]).trim(), source: parts[0].trim() };
      })
  : [];
const badImports = names.filter((n) => !(n.source in m));
console.log(`\nimported: ${names.map((n) => n.local).join(", ")}`);
console.log(
  `MISSING exports: ${
    badImports.length
      ? badImports.map((n) => `${n.source} (imported as ${n.local})`).join(", ")
      : "(none)"
  }`
);

process.exitCode = missing.length || badImports.length ? 1 : 0;
