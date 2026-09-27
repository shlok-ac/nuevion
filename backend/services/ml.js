/**
 * ATM cash-out risk model — Random Forest classifier.
 *
 * Uses `ml-random-forest`, the JS port of the same CART-based algorithm used by the
 * repo's scikit-learn notebook `ml/ArthVyuh.ipynb`. It genuinely trains at runtime on
 * `data/atms.csv`, uses a stratified 80/20 split with seed 42 to match the notebook,
 * and reports measured accuracy, per-class P/R/F1 and feature importance.
 *
 * Metrics served by /api/v1/ml/metrics are computed here, not copied from a document.
 * The dataset is synthetic, so these are NOT real-world fraud rates.
 */
const { RandomForestClassifier } = require("ml-random-forest");
const path = require("node:path");
const fs = require("node:fs");
const { parseCsv } = require("../lib/csv");
const { get, run, all } = require("../config/db");

const FEATURES = [
  "highway_distance",
  "lighting_score",
  "cctv_coverage",
  "historical_fraud_count",
  "withdrawal_limit",
];
const TARGET = "risk_level";
const CLASSES = ["LOW", "MEDIUM", "HIGH"];
const SEED = 42;
const TEST_SIZE = 0.2;
const N_TREES = 100;
const MODEL_PATH = path.join(__dirname, "..", "data", "model.json");
const DATA_CSV = path.join(__dirname, "..", "..", "data", "atms.csv");

/** Deterministic PRNG (mulberry32) so the split is reproducible like random_state=42. */
function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stratified split preserving the class ratio, as in the notebook. */
function stratifiedSplit(rows, testSize, seed) {
  const random = makeRandom(seed);
  const byClass = new Map();
  for (const row of rows) {
    const key = row[TARGET];
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key).push(row);
  }

  const train = [];
  const test = [];
  for (const [, group] of byClass) {
    const shuffled = [...group];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const cut = Math.round(shuffled.length * testSize);
    test.push(...shuffled.slice(0, cut));
    train.push(...shuffled.slice(cut));
  }
  return { train, test };
}

const toMatrix = (rows) => rows.map((row) => FEATURES.map((f) => Number(row[f])));

/**
 * Label encoder for the risk classes.
 *
 * `ml-cart` computes Gini impurity by indexing an array with the class value
 * (`counts[array[i]] += ...`), so it silently requires integer class labels.
 * Feeding it "HIGH"/"MEDIUM"/"LOW" yields a negative array length. This mirrors the
 * LabelEncoder the notebook applies before fitting scikit-learn, and it is why the
 * encoder must be persisted alongside the model: label order is the contract that
 * makes `inverseTransform` meaningful.
 */
const labelToIndex = new Map(CLASSES.map((cls, i) => [cls, i]));
const indexToLabel = CLASSES;

const encodeLabels = (rows) => rows.map((row) => labelToIndex.get(row[TARGET]));
const decodeLabels = (indices) => indices.map((i) => indexToLabel[i]);

/** In-memory handle on the trained forest so predictions avoid a retrain. */
let cached = null;

/**
 * Confusion-matrix derived precision / recall / F1 / support per class.
 *
 * `yTrue`/`yPred` hold class *indices* (ml-cart requires integer labels), so the
 * comparison is done by index and the reported name is the original label.
 */
function classificationReport(yTrue, yPred, classes) {
  return classes.map((cls, index) => {
    const tp = yTrue.filter((t, i) => t === index && yPred[i] === index).length;
    const fp = yTrue.filter((t, i) => t !== index && yPred[i] === index).length;
    const fn = yTrue.filter((t, i) => t === index && yPred[i] !== index).length;
    const support = tp + fn;

    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = support === 0 ? 0 : tp / support;
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

    return {
      class: cls,
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1: Number(f1.toFixed(4)),
      support,
    };
  });
}

/**
 * Trains the model, evaluates it, persists the artifact and registry row, and
 * writes the live scores back into the atms table.
 * @returns {object} measured metrics
 */
function train({ persist = true, logRun = true } = {}) {
  const rows = parseCsv(fs.readFileSync(DATA_CSV, "utf8")).filter((r) => r[TARGET]);
  if (rows.length === 0) throw new Error("No training rows found in data/atms.csv");

  const { train: trainRows, test: testRows } = stratifiedSplit(rows, TEST_SIZE, SEED);

  const rf = new RandomForestClassifier({
    seed: SEED,
    nTrees: N_TREES,
    // ml-cart sizes its impurity arrays from this, so it is required for
    // classification (its absence is what produces "Invalid array length").
    numberOfClasses: CLASSES.length,
    minSamplesSplit: 2,
    maxFeatures: FEATURES.length,
    bootstrap: true,
  });
  rf.train(toMatrix(trainRows), encodeLabels(trainRows));

  // Predictions come back as class indices and are mapped back to labels.
  const yTrue = encodeLabels(testRows);
  const yPred = rf.predict(toMatrix(testRows));
  const accuracy = Number((yTrue.filter((t, i) => t === yPred[i]).length / yTrue.length).toFixed(4));
  const perClass = classificationReport(yTrue, yPred, CLASSES);

  // Feature importance. The library exposes it as a method that already averages and
  // normalises across the ensemble, so no second normalisation is applied here.
  const raw = typeof rf.featureImportance === "function" ? rf.featureImportance() : [];
  const importance = Object.fromEntries(
    FEATURES.map((f, i) => [f, Number(Number(raw[i] || 0).toFixed(4))]),
  );

  // Score every ATM and persist the live model output.
  //
  // NOTE: this library's predictProbability(toPredict, label) returns ONE value per
  // sample for a single class index — it is not a [sample][class] matrix. Passing a
  // row and indexing it by class silently yields undefined, which is what previously
  // wrote risk_score = 0 for every ATM.
  const matrix = toMatrix(rows);
  const predictions = rf.predict(matrix);

  const scored = rows.map((row, i) => {
    const index = predictions[i];
    const confidence = rf.predictProbability([matrix[i]], index)[0];
    return {
      id: Number(row.id),
      risk_level: decodeLabels([index])[0],
      risk_score: Math.round((Number(confidence) || 0) * 1000) / 10,
    };
  });

  if (persist) {
    fs.mkdirSync(path.dirname(MODEL_PATH), { recursive: true });
    fs.writeFileSync(
      MODEL_PATH,
      JSON.stringify({
        modelVersion: modelVersion(),
        algorithm: "RandomForestClassifier",
        features: FEATURES,
        classes: CLASSES,
        seed: SEED,
        nTrees: N_TREES,
        trainedAt: new Date().toISOString(),
        accuracy,
        perClass,
        featureImportance: importance,
        // Serialized via the library's own toJSON so the artifact can be revived
        // with RandomForestClassifier.load() — a plain JSON round-trip strips the
        // class prototype and leaves an object with no predict() method.
        model: rf.toJSON(),
      }),
    );
    for (const row of scored) {
      run("UPDATE atms SET risk_score = ?, risk_level = ? WHERE id = ?", [
        row.risk_score,
        row.risk_level,
        row.id,
      ]);
    }
  }

  const metrics = {
    modelVersion: modelVersion(),
    algorithm: "RandomForestClassifier",
    features: FEATURES,
    classes: CLASSES,
    seed: SEED,
    nTrees: N_TREES,
    trainSize: trainRows.length,
    testSize: testRows.length,
    accuracy,
    perClass,
    featureImportance: importance,
    trainedAt: new Date().toISOString(),
    scoredAtms: scored.length,
    disclaimer:
      "Trained on synthetic ATM data. These metrics describe model fit to this dataset and are not real-world fraud prediction performance.",
  };

  if (logRun) {
    run(
      "INSERT INTO ml_runs (model_version, algorithm, accuracy, feature_importance, per_class, trained_at, notes) VALUES (?,?,?,?,?,?,?)",
      [
        metrics.modelVersion,
        metrics.algorithm,
        metrics.accuracy,
        JSON.stringify(importance),
        JSON.stringify(perClass),
        metrics.trainedAt,
        metrics.disclaimer,
      ],
    );
  }

  cached = { metrics, rf };
  return metrics;
}

const modelVersion = () => `rf-${N_TREES}trees-${new Date().toISOString().slice(0, 10)}`;

/**
 * Returns metrics for the current model, reading the run registry before retraining.
 *
 * The cache is keyed on metrics alone: loading a model from disk sets `cached.metrics`
 * to null, and returning that null here would make /api/v1/ml/metrics answer with a
 * bare `null` after any single-ATM prediction.
 */
function getMetrics() {
  if (cached && cached.metrics) return cached.metrics;
  const lastRun = get("SELECT * FROM ml_runs ORDER BY id DESC LIMIT 1");
  if (lastRun) {
    return {
      modelVersion: lastRun.model_version,
      algorithm: lastRun.algorithm,
      accuracy: lastRun.accuracy,
      featureImportance: JSON.parse(lastRun.feature_importance || "{}"),
      perClass: JSON.parse(lastRun.per_class || "[]"),
      trainedAt: lastRun.trained_at,
      notes: lastRun.notes,
    };
  }
  return train();
}

/** Ensures a trained model is loaded, reviving the artifact when one exists. */
function ensureModel() {
  if (cached && cached.rf) return cached.rf;
  if (fs.existsSync(MODEL_PATH)) {
    const saved = JSON.parse(fs.readFileSync(MODEL_PATH, "utf8"));
    // The artifact is revived with the library's loader; a raw JSON parse yields a
    // plain object whose predict() is missing.
    const revived = saved.model
      ? RandomForestClassifier.load(saved.model)
      : saved.rf;
    cached = { metrics: null, rf: revived };
    return revived;
  }
  train();
  return cached.rf;
}

/** Predicts a single ATM from its feature values. */
function predictFeatures(features) {
  const rf = ensureModel();
  const row = FEATURES.map((f) => Number(features[f]));
  if (row.some((v) => !Number.isFinite(v))) {
    throw new Error(`All of ${FEATURES.join(", ")} must be numeric`);
  }
  // predict() returns the class index; the caller needs the readable label.
  const [index] = rf.predict([row]);
  const confidence = rf.predictProbability([row], index)[0];
  return {
    riskLevel: decodeLabels([index])[0],
    confidence: Math.round((Number(confidence) || 0) * 1000) / 10,
  };
}

const history = (limit = 20) => all("SELECT * FROM ml_runs ORDER BY id DESC LIMIT ?", [limit]);

module.exports = {
  train,
  getMetrics,
  predictFeatures,
  history,
  FEATURES,
  CLASSES,
  MODEL_PATH,
  DATA_CSV,
};
