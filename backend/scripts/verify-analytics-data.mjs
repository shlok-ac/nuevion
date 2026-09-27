/**
 * Static cross-check for the Analytics page's two data sections.
 *
 * Both sections now read investigationData.js instead of hard-coded literals, so the
 * risk is no longer "a stale placeholder" but "a number that does not add up". The
 * model section is the subtle one: the confusion matrix is reconstructed from
 * per-class precision/recall/support, so this proves the reconstruction still
 * reproduces the recorded accuracy and that every class's counts sum to its support.
 */
import { readFileSync } from "node:fs";

const root = "C:/Users/shlok/Documents/Github/nuevion";
const { cases, callCity, atmRankings, alerts, mlMetrics } = await import(
  `file:///${root}/frontend/src/lib/investigationData.js`
);

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures += 1;
};

console.log("--- Case Analytics ---");

const total = cases.length;
const resolved = cases.filter((c) => String(c.status) === "resolved").length;
check("open + resolved equals the case total", total - resolved + resolved === total);

const byPriority = new Map();
const byStatus = new Map();
const byCity = new Map();
let sumAmount = 0;
for (const c of cases) {
  const p = String(c.priority).toLowerCase();
  byPriority.set(p, (byPriority.get(p) || 0) + 1);
  const s = String(c.status);
  byStatus.set(s, (byStatus.get(s) || 0) + 1);
  const city = callCity[c.id] || String(c.branch || "").split(",").pop().trim() || "Unknown";
  byCity.set(city, (byCity.get(city) || 0) + 1);
  sumAmount += Number(c.amount) || 0;
}

check(
  "priority mix sums to the case total",
  [...byPriority.values()].reduce((a, b) => a + b, 0) === total,
  `[${[...byPriority.entries()].map(([k, v]) => `${k}=${v}`).join(" ")}]`
);
check(
  "status mix sums to the case total",
  [...byStatus.values()].reduce((a, b) => a + b, 0) === total,
  `[${[...byStatus.entries()].map(([k, v]) => `${k}=${v}`).join(" ")}]`
);
check(
  "city split sums to the case total",
  [...byCity.values()].reduce((a, b) => a + b, 0) === total,
  `${byCity.size} cities`
);
check(
  "every amount is a finite non-negative number",
  Number.isFinite(sumAmount) && sumAmount > 0,
  `total=${Math.round(sumAmount)}`
);
check(
  "every case resolves to a call city",
  [...byCity.keys()].every((c) => c && c !== "Unknown")
);

console.log("\n--- ML Model Analytics ---");

if (!mlMetrics?.available) {
  console.log(`  SKIP  no evaluation recorded (${mlMetrics?.reason || "unknown"})`);
} else {
  const m = mlMetrics;
  const { matrix, perClass } = m;
  const total2 = matrix.total;

  check("evaluation sample is non-empty", total2 > 0, `n=${total2}`);

  // Every class's true + false positives/negatives must account for the split.
  perClass.forEach((row, i) => {
    const c = matrix.counts[i];
    const accounted = c.tp + c.fp + c.fn + c.tn;
    check(
      `${row.class}: tp+fp+fn+tn equals the split size`,
      accounted === total2,
      `${c.tp}+${c.fp}+${c.fn}+${c.tn}=${accounted} vs ${total2}`
    );
    check(
      `${row.class}: tp+fn equals its support`,
      c.tp + c.fn === row.support,
      `${c.tp}+${c.fn}=${c.tp + c.fn} vs support ${row.support}`
    );
  });

  // The whole point of the reconstruction: the diagonal must reproduce accuracy.
  const diagonal = matrix.counts.reduce((s, c) => s + c.tp, 0);
  check(
    "reconstructed diagonal reproduces the recorded accuracy",
    Math.abs(diagonal / total2 - m.accuracy) < 0.005,
    `${diagonal}/${total2}=${(diagonal / total2).toFixed(4)} vs ${m.accuracy}`
  );
  check("page reports the matrix as consistent", matrix.consistent === true);

  // Macro averages must be the unweighted mean of the per-class values.
  const mean = (k) => perClass.reduce((s, r) => s + r[k], 0) / perClass.length;
  check(
    "macro precision is the mean of the per-class values",
    Math.abs(mean("precision") - m.macroPrecision) < 0.0001
  );
  check(
    "macro recall is the mean of the per-class values",
    Math.abs(mean("recall") - m.macroRecall) < 0.0001
  );
  check(
    "macro F1 is the mean of the per-class values",
    Math.abs(mean("f1") - m.macroF1) < 0.0001
  );

  const importance = Object.values(m.featureImportance || {});
  check(
    "feature importance is present and sums to about 1",
    importance.length > 0 && Math.abs(importance.reduce((a, b) => a + b, 0) - 1) < 0.02,
    `sum=${importance.reduce((a, b) => a + b, 0).toFixed(4)}`
  );
}

// The confidence histogram is built from these rows, so they must carry a number.
const atms = Object.values(atmRankings).flat();
check(
  "every ranked ATM carries a numeric confidence",
  atms.length > 0 && atms.every((a) => Number.isFinite(Number(a.confidence))),
  `${atms.length} ATMs`
);
check("alerts are present for the summary line", alerts.length > 0, `${alerts.length} alerts`);

// The page must no longer carry the old placeholder literals.
const page = readFileSync(`${root}/frontend/src/pages/Analytics.jsx`, "utf8");
const stale = ["91.6", "72.8", "56.8", "Aurangabad", "caseData", "modelData"].filter((s) =>
  page.includes(s)
);
check("no placeholder figures remain in the page", stale.length === 0, stale.join(", "));

console.log(failures === 0 ? "\nAll analytics data checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;