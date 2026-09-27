/**
 * Regression probe for the /api/v1/ml/metrics null bug.
 *
 * Loading a model from disk set cached.metrics to null, so any later metrics read
 * answered with a bare `null`. This reproduces the exact sequence.
 */
const BASE = process.env.API_BASE || "http://localhost:5000";

const json = async (p) => (await fetch(`${BASE}${p}`)).json();
const post = async (p, b) =>
  (
    await fetch(`${BASE}${p}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    })
  ).json();

/** Polls /health until the API answers, so the probe does not race startup. */
async function waitForServer(attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/v1/health`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

(async () => {
  if (!(await waitForServer())) {
    console.log("API never came up at " + BASE);
    process.exit(1);
  }

  const before = await json("/api/v1/ml/metrics");
  console.log("1. metrics before any predict :", before ? `${before.modelVersion} acc=${before.accuracy}` : "NULL");

  const scored = await post("/api/v1/ml/predict", {
    highway_distance: 2.1,
    lighting_score: 90,
    cctv_coverage: 85,
    historical_fraud_count: 3,
    withdrawal_limit: 20000,
  });
  console.log("2. single-ATM predict          :", JSON.stringify(scored));

  const after = await json("/api/v1/ml/metrics");
  console.log("3. metrics after predict       :", after ? `${after.modelVersion} acc=${after.accuracy}` : "NULL");

  const ok = Boolean(before) && Boolean(after);
  console.log("");
  console.log(ok ? "PASS  metrics survive a model load" : "FAIL  metrics returned null");
  process.exit(ok ? 0 : 1);
})();
