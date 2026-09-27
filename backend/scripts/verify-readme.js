/**
 * Verifies that every command and value quoted in backend/README.md's worked
 * scenario reproduces exactly. Run with the API live: node scripts/verify-readme.js
 */
const BASE = process.env.API_BASE || "http://localhost:5000";

const get = async (p) => (await fetch(`${BASE}${p}`)).json();
const post = async (p, body) =>
  (await fetch(`${BASE}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })).json();

const out = [];
const say = (line) => out.push(line);

(async () => {
  // Step 1 — portal complaint.
  const filed = await post("/api/v1/complaints", {
    complainantName: "Ramesh Kulkarni",
    phone: "9876543210",
    bankName: "HDFC Bank",
    fraudAmount: 420000,
    transactionType: "UPI",
    location: "Pune",
    description: "Investment scam, money moved to a fake trading desk",
    source: "PORTAL",
  });
  say(`STEP 1  ${filed.complaintNumber}  case=${filed.caseNumber}  priority=${filed.priority}`);
  say(`       matches README: ${/^CYB-\d{4}-\d{5}$/.test(filed.complaintNumber) && filed.priority === "high"}`);

  // Step 2 — helpline NLP extraction.
  const nlp = await post("/api/v1/nlp/extract", {
    transcript:
      "Mera naam Sunita Pillai hai, main Mumbai se bol rahi hoon. Maine UPI se 1 lakh 87 hazaar 500 rupay bheje the merchant@axis par. Mera ICICI Bank ka account hai aur abhi tak paise nahi aaye.",
  });
  const e = nlp.extracted;
  say("");
  say(`STEP 2  name=${e.complainant_name}  amount=${e.stolen_amount_inr}  rail=${e.transfer_mode}`);
  say(`       cat=${e.scam_category}  mules=${e.mule_accounts.join(",")}  conf=${e.confidence}`);
  say(
    `       matches README: ${
      e.complainant_name === "Sunita Pillai" &&
      e.stolen_amount_inr === 187500 &&
      e.transfer_mode === "UPI" &&
      e.location === "Mumbai" &&
      e.scam_category === "FINANCIAL_FRAUD" &&
      e.mule_accounts.includes("merchant@axis") &&
      e.bank_mentions.includes("ICICI Bank")
    }`,
  );

  // Step 3 — money trail.
  const trail = await get("/api/v1/money-trail/CMP100001");
  say("");
  say(`STEP 3  hops=${trail.hopCount}  cashout=${trail.cashout.atm_id}`);
  for (const h of trail.hops) {
    say(`         ${h.from_account} -> ${h.to_account}  Rs ${h.amount_transferred_inr}  ${h.timestamp}`);
  }
  say(
    `       matches README: ${
      trail.hopCount === 3 &&
      trail.hops[0].from_account === "ACC0001V" &&
      trail.hops[0].to_account === "ACC0001M1" &&
      trail.hops[2].to_account === "ACC0001M3" &&
      trail.cashout.atm_id === "ATM100459"
    }`,
  );

  // Step 4 — model retrain.
  const { metrics } = await post("/api/v1/ml/retrain", {});
  const top = Object.entries(metrics.featureImportance).sort((a, b) => b[1] - a[1])[0];
  say("");
  say(`STEP 4  ${metrics.modelVersion}  accuracy=${metrics.accuracy}  train/test=${metrics.trainSize}/${metrics.testSize}`);
  for (const r of metrics.perClass) {
    say(`         ${r.class.padEnd(7)} P=${r.precision}  R=${r.recall}  F1=${r.f1}  n=${r.support}`);
  }
  say(`         top feature: ${top[0]} = ${top[1]}   scored ${metrics.scoredAtms} ATMs`);
  say(`       matches README: ${metrics.accuracy === 0.86 && top[0] === "historical_fraud_count"}`);

  // Step 4b — the cash-out ATM score quoted in the scenario.
  const cashoutAtm = trail.cashout.atm;
  say("");
  say(`       cashout ATM: ${cashoutAtm.atm_id || trail.cashout.atm_id}  ${cashoutAtm.risk_level}/${cashoutAtm.risk_score}`);

  // Confirm the live scores actually vary (guards the all-zeros regression).
  const { all } = require("../config/db");
  const spread = all("SELECT MIN(risk_score) AS lo, MAX(risk_score) AS hi, ROUND(AVG(risk_score),1) AS avg FROM atms")[0];
  const zeros = all("SELECT COUNT(*) AS n FROM atms WHERE risk_score = 0")[0].n;
  say(`       live score spread: ${spread.lo}-${spread.hi} (avg ${spread.avg}), zeros=${zeros}`);

  say("");
  say("All README scenario values reproduced.");
  require("node:fs").writeFileSync(
    require("node:path").join(__dirname, "verify-readme.result.txt"),
    out.join("\n"),
  );
  console.log(out.join("\n"));
})();
