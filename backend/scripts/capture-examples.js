/**
 * Captures real API output for the examples in example.md.
 * Run with the API live: node scripts/capture-examples.js
 */
const BASE = process.env.API_BASE || "http://localhost:5000";

const get = async (p) => (await fetch(`${BASE}${p}`)).json();
const post = async (p, b) =>
  (await fetch(`${BASE}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
  })).json();

const out = [];
const say = (s) => out.push(s);
const show = (label, value) => say(`${label}\n${JSON.stringify(value, null, 2)}`);

(async () => {
  // --- 1. Digital-arrest / task-job helpline call -----------------------------
  const arrest = await post("/api/v1/nlp/extract", {
    transcript:
      "Hello, my name is Anjali Sharma. I am calling from Jaipur. Some fraudster trapped me in a fake task job and made me install AnyDesk for remote access. They are threatening digital arrest unless I pay 2.5 lakh to 9876543210.",
  });
  show("\n[1] digital-arrest transcript ->", arrest.extracted);

  // --- 2. Loan-app extortion --------------------------------------------------
  const loan = await post("/api/v1/nlp/extract", {
    transcript:
      "Mera naam Kavita Menon hai, main Kochi se. Ek fake loan app ne mere saath explicit photos ki dhamki di aur 60,000 rupees maange, warna police ko batayenge.",
    persist: false,
  });
  show("\n[2] loan-app extortion (dry run) ->", loan.extracted);

  // --- 3. Investment scam, card rail ------------------------------------------
  const invest = await post("/api/v1/nlp/extract", {
    transcript:
      "My name is Ramesh Kulkarni from Pune. I was promised guaranteed returns on crypto trading and invested 12,50,000 on my credit card. The dashboard now shows zero balance.",
    persist: false,
  });
  show("\n[3] investment scam, card rail (dry run) ->", invest.extracted);

  // --- 4. Case triage: patch priority + status --------------------------------
  const recent = await get("/api/v1/cases?limit=1");
  const target = recent[0];
  say(`\n[4] case before patch -> ${JSON.stringify(target)}`);

  const res = await fetch(`${BASE}/api/v1/cases/${target.case_number}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "frozen", priority: "critical", riskLevel: "CRITICAL" }),
  });
  say(`case after patch -> ${JSON.stringify(await res.json())}`);

  // --- 5. Alerts filtered to one case ----------------------------------------
  const alerts = await get(`/api/v1/alerts?case=${target.case_number}`);
  show(`\n[5] alerts for ${target.case_number} ->`, alerts.slice(0, 3));

  // --- 6. Top-risk ATMs in one city ------------------------------------------
  const mumbai = await get("/api/v1/atms/top-risk?limit=5&city=Mumbai");
  show("\n[6] top 5 risk ATMs in Mumbai ->", mumbai.map((a) => ({
    atm_id: a.atm_id, bank: a.bank_name, risk_level: a.risk_level, risk_score: a.risk_score,
  })));

  // --- 7. Single-ATM ad-hoc scoring -------------------------------------------
  const scored = await post("/api/v1/ml/predict", {
    highway_distance: 2.1,
    lighting_score: 90,
    cctv_coverage: 85,
    historical_fraud_count: 3,
    withdrawal_limit: 20000,
  });
  show("\n[7] score a hypothetical well-lit, low-crime ATM ->", scored);

  const scored2 = await post("/api/v1/ml/predict", {
    highway_distance: 9.4,
    lighting_score: 12,
    cctv_coverage: 8,
    historical_fraud_count: 88,
    withdrawal_limit: 100000,
  });
  show("[7b] score a hypothetical dark, high-crime ATM ->", scored2);

  // --- 8. Money trail for a complaint with hops ------------------------------
  const trail = await get("/api/v1/money-trail/CMP100002");
  say(`\n[8] money trail CMP100002 -> ${trail.hopCount} hops, cash-out ${trail.cashout.atm_id} (${trail.cashout.predicted_risk_level})`);

  // --- 9. Login + rejection ---------------------------------------------------
  const ok = await post("/api/v1/auth/login", { email: "analyst@demo.gov", password: "Demo@123" });
  say(`\n[9] login -> user=${JSON.stringify(ok.user)} token=${ok.token.slice(0, 24)}...`);
  const bad = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "analyst@demo.gov", password: "nope" }),
  });
  say(`login with wrong password -> HTTP ${bad.status} ${JSON.stringify(await bad.json())}`);

  const accounts = await get("/api/v1/auth/demo-accounts");
  show("\n[9b] demo accounts ->", accounts);

  // --- 10. Duplicate complaint number is rejected -----------------------------
  const dup = await fetch(`${BASE}/api/v1/complaints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ complaintNumber: "CYB-2026-00001", complainantName: "Test" }),
  });
  say(`\n[10] duplicate complaint number -> HTTP ${dup.status} ${JSON.stringify(await dup.json())}`);

  // --- 11. ML metrics + history ----------------------------------------------
  const metrics = await get("/api/v1/ml/metrics");
  say(`\n[11] ml metrics -> ${metrics.modelVersion} accuracy=${metrics.accuracy}`);
  const history = await get("/api/v1/ml/history?limit=3");
  say(`ml history rows -> ${history.length} (most recent ${history[0]?.model_version} at ${history[0]?.trained_at})`);

  require("node:fs").writeFileSync(
    require("node:path").join(__dirname, "capture-examples.result.txt"),
    out.join("\n"),
  );
  console.log(out.join("\n"));
})();
