/**
 * Trains the ATM risk model and writes the scores back into the database.
 *
 * Run with: npm run train
 * The same work happens on demand via POST /api/v1/ml/retrain.
 */
const { migrate } = require("../db/seed");
const ml = require("../services/ml");

migrate();

const metrics = ml.train();

console.log(`Trained ${metrics.modelVersion}`);
console.log(`  algorithm  : ${metrics.algorithm} (${metrics.nTrees} trees, seed ${metrics.seed})`);
console.log(`  features   : ${metrics.features.join(", ")}`);
console.log(`  train/test : ${metrics.trainSize}/${metrics.testSize} (stratified 80/20)`);
console.log(`  accuracy   : ${metrics.accuracy}`);
console.log("  per class  :");
for (const row of metrics.perClass) {
  console.log(
    `    ${row.class.padEnd(7)} P=${row.precision}  R=${row.recall}  F1=${row.f1}  n=${row.support}`,
  );
}
console.log("  importance :");
for (const [feature, value] of Object.entries(metrics.featureImportance).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${feature.padEnd(24)} ${value}`);
}
console.log(`  scored     : ${metrics.scoredAtms} ATMs written back to the database`);
console.log(`\n${metrics.disclaimer}`);
