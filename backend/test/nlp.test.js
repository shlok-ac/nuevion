/**
 * Helpline NLP extractor checks.
 * Run with: node backend/test/nlp.test.js
 *
 * The transcripts are romanised-Hindi/English mixes of the kind recorded on the
 * 1930 helpline, so this covers the phrasings the extractor is expected to handle.
 */
const assert = require("node:assert");
const nlp = require("../services/nlp");

const CASES = [
  {
    name: "romanised Hindi UPI transfer",
    transcript:
      "Mera naam Ramesh Kumar hai, main Pune se bol raha hoon. Maine UPI se 4 lakh 20 hazaar rupay bheje the account 8842991190 par. Mera HDFC Bank ka account hai.",
    expect: { complainant_name: "Ramesh Kumar", stolen_amount_inr: 420000, transfer_mode: "UPI", location: "Pune" },
  },
  {
    name: "English net banking, Indian-grouped amount",
    transcript:
      "My name is Sunita Pillai. I lost 1,87,500 rupees through net banking to merchant@axis. Yes Bank account.",
    expect: { complainant_name: "Sunita Pillai", stolen_amount_inr: 187500, transfer_mode: "NET_BANKING" },
  },
  {
    name: "credit card, phone must not be read as amount",
    transcript: "I am calling from Mumbai, some fraudster took Rs 2.5 lakh via credit card. Call 9876543210.",
    expect: { stolen_amount_inr: 250000, transfer_mode: "CARD_PAYMENT", scam_category: "CREDIT_CARD_FRAUD" },
  },
  {
    name: "loan app extortion / digital arrest phrasing",
    transcript:
      "Fake loan app ne mere saath explicit photos ki dhamki di hai aur 60,000 rupees maange, digital arrest ka darr.",
    expect: { stolen_amount_inr: 60000, scam_category: "DIGITAL_ARREST" },
  },
  {
    name: "task job scam",
    transcript: "I was offered a part time job and paid 85000 for a task, work from home guarantee.",
    expect: { scam_category: "TASK_JOB_FRAUD" },
  },
  {
    name: "investment / trading lure",
    transcript: "They promised guaranteed return on crypto trading, I invested 12 lakh in the share market.",
    expect: { scam_category: "INVESTMENT_TRADING_FRAUD", stolen_amount_inr: 1200000 },
  },
  {
    name: "remote access malware",
    transcript: "A fraudster asked me to install AnyDesk and gave remote access to my laptop.",
    expect: { scam_category: "REMOTE_ACCESS_MALWARE" },
  },
  {
    name: "IMPS with account number",
    transcript: "Amount of 1,50,000 was debited by IMPS from account 6221774190 without my consent.",
    expect: { stolen_amount_inr: 150000, transfer_mode: "IMPS" },
  },
];

let failed = 0;
for (const testCase of CASES) {
  const result = nlp.extractFromTranscript(testCase.transcript);
  const problems = [];

  for (const [field, expected] of Object.entries(testCase.expect)) {
    if (result[field] !== expected) {
      problems.push(`${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(result[field])}`);
    }
  }

  if (problems.length) {
    failed += 1;
    console.log(`FAIL  ${testCase.name}`);
    problems.forEach((p) => console.log(`        ${p}`));
  } else {
    console.log(`PASS  ${testCase.name}`);
  }
}

// Direct unit checks on the amount parser and VPA extractor.
assert.strictEqual(nlp.parseAmount("4,20,000"), 420000, "Indian grouping must yield 420000");
assert.strictEqual(nlp.parseAmount("1,50,000"), 150000, "Indian grouping must yield 150000");
assert.strictEqual(nlp.parseAmount("250000"), 250000, "plain digits must parse as-is");
assert.strictEqual(nlp.parseAmount("2.5 lakh"), 250000, "decimal scale suffix must multiply");
assert.strictEqual(nlp.parseAmount("three lakh"), 300000, "spoken words must parse");
assert.deepStrictEqual(nlp.extractVpas("paid to ravi@paytm and sana@okhdfc"), ["ravi@paytm", "sana@okhdfc"]);
console.log("PASS  amount parser unit checks");
console.log("PASS  VPA extraction unit checks");

console.log(`\n${CASES.length - failed}/${CASES.length} transcript cases passed.`);
process.exit(failed === 0 ? 0 : 1);
