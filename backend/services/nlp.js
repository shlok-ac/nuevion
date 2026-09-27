/**
 * Rule-based helpline entity extraction.
 *
 * Ports the extraction rules described in `Team Leader/README.md` to plain JavaScript:
 * spoken Indian numeric phrasing (lakh/hazar/crore), payment rails, UPI VPAs and
 * bare account numbers, and the eight-way scam taxonomy.
 *
 * Deliberately dependency-free: the repo's Python notebooks need faster-whisper /
 * Bhashini for the ASR stage, and Python is not installed on the demo machine. This
 * service takes the text transcript and performs the extraction stage for real.
 */

const TAXONOMY = [
  { category: "CREDIT_CARD_FRAUD", patterns: [/\bcredit\s*card\b/i, /\bcard\b.{0,20}\b(charge|blocked|declined)/i] },
  { category: "DIGITAL_ARREST", patterns: [/\bdigital\s*arrest/i, /\bedp\b/i, /\bpolice.{0,30}\bcall/i, /\barrested?\b/i, /\bcyber\s*cell/i] },
  { category: "UTILITY_BILL_FRAUD", patterns: [/\bbill\b/i, /\belectric/i, /\bwater\s*bill/i, /\bgas\s*bill/i, /\belectricity/i] },
  { category: "TASK_JOB_FRAUD", patterns: [/\btask\s*job/i, /\bpart\s*time\s*job/i, /\bjob\s*offer/i, /\bwork\s*from\s*home/i, /\bearn\s*money/i] },
  { category: "INVESTMENT_TRADING_FRAUD", patterns: [/\binvest/i, /\btrading/i, /\bstock\b/i, /\bshare\b/i, /\bmutual\s*fund/i, /\bcrypto/i, /\bforex/i, /\bguarantee(d)?\s*return/i, /\bdoubles?\b/i, /\bprofit/i] },
  { category: "LOAN_APP_EXTORTION", patterns: [/\bloan\s*app/i, /\bloan\b/i, /\bextort/i, /\bblackmail/i, /\bexplicit\s*(photo|picture|video)/i] },
  { category: "REMOTE_ACCESS_MALWARE", patterns: [/\bremote\s*access/i, /\bscreen\s*shar/i, /\banydesk/i, /\bteamviewer/i, /\bquick\s*support/i, /\binstall.{0,20}\bapp/i] },
  { category: "FINANCIAL_FRAUD", patterns: [/\bfraud/i, /\bupi\b/i, /\bimps\b/i, /\bneft\b/i, /\brtgs\b/i, /\bmoney\b/i, /\bscam/i] },
];

const RAILS = [
  { mode: "UPI", patterns: [/\bupi\b/i, /\bvpa\b/i, /\bpaytm\b/i, /\bphonepe\b/i, /\bgpay\b/i, /\bbharatpe\b/i] },
  { mode: "IMPS", patterns: [/\bimps\b/i] },
  { mode: "NEFT", patterns: [/\bneft\b/i] },
  { mode: "RTGS", patterns: [/\brtgs\b/i] },
  { mode: "CARD_PAYMENT", patterns: [/\bcredit\s*card\b/i, /\bdebit\s*card\b/i, /\bcard\s*payment\b/i] },
  { mode: "NET_BANKING", patterns: [/\bnet\s*banking\b/i, /\bnetbanking\b/i] },
];

/** Spoken Indian scale words and their multipliers. */
const UNITS = {
  crore: 1e7, cr: 1e7, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5,
  hazar: 1e3, hazaar: 1e3, thousand: 1e3, thousand_: 1e3,
};

const WORD_NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, sau: 100, hazaar: 1000,
};

/**
 * Filler tokens that may appear inside a spoken amount without contributing to it.
 * Skipping these is what lets "4 lakh 20 hazaar rupay" parse as 420000 rather than
 * aborting at an unknown word.
 */
const AMOUNT_FILLER = new Set([
  "aur", "and", "plus", "or", "only", "about", "approx", "roughly", "total", "amount",
  "paisa", "paise", "rupees", "rupay", "rupaye", "rupaiya", "rs", "inr", "worth",
  "ka", "ki", "ke", "ko", "se", "hai", "he", "thi", "the", "bheje", "bheja", "bheji",
  "kiya", "kiye", "kaun", "kar", "karke", "kare", "karne", "dene", "dena", "diya",
  "di", "gaya", "gayab", "ho", "hona", "mera", "maine", "mujhe", "mere", "waala", "wala",
]);

const normalize = (text) => String(text || "").replace(/\s+/g, " ").trim();

/**
 * Parses a single amount expression into a Number.
 * Handles "1,50,000" / "150000" / "2.5 lakh" / "4 lakh 20 hazaar" / "four lakh".
 * @param {string} fragment
 * @returns {number|null}
 */
function parseAmount(fragment) {
  const raw = normalize(fragment).toLowerCase();
  if (!raw) return null;

  // Indian-grouped digits: 4,20,000 is 4 | 20 | 000. Stripping commas reads the
  // magnitude correctly, which a direct Number() cast would not (4.20).
  const grouped = raw.match(/^(\d{1,3}(?:,\d{2})*,\d{3})(?:\.\d+)?\s*([a-z_]+)?$/);
  if (grouped) {
    const value = Number(grouped[1].replace(/,/g, ""));
    if (Number.isFinite(value)) {
      const unit = grouped[2] ? UNITS[grouped[2]] : null;
      return unit ? Math.round(value * unit) : value;
    }
  }

  const text = raw.replace(/[₹,\s]+/g, " ").trim();

  // Bare number with an optional scale suffix: "150000", "1.5 lakh".
  const numeric = text.match(/^(\d+(?:\.\d+)?)\s*([a-z_]+)?$/);
  if (numeric) {
    const value = Number(numeric[1]);
    if (!Number.isFinite(value)) return null;
    const unit = numeric[2] ? UNITS[numeric[2]] : null;
    return unit ? Math.round(value * unit) : Math.round(value);
  }

  // Word-by-word walk. Every scale word flushes the accumulated sub-100 group, so
  // "4 lakh 20 hazaar" = 4 * 1e5 + 20 * 1e3 = 420000. Filler words (English and
  // romanised Hindi) are skipped rather than aborting the scan, so a phrase
  // interrupted by "aur" or "rupay" still parses.
  let total = 0;
  let current = 0;
  let matched = false;
  for (const word of text.split(" ")) {
    if (!word) continue;
    if (/^\d+(\.\d+)?$/.test(word)) {
      current += Number(word);
      matched = true;
      continue;
    }
    const key = word.replace(/[^a-z]/g, "");
    if (!key || AMOUNT_FILLER.has(key)) continue;
    if (UNITS[key]) {
      total += (current || 1) * UNITS[key];
      current = 0;
      matched = true;
    } else if (WORD_NUMBERS[key] !== undefined) {
      current += WORD_NUMBERS[key];
      matched = true;
    }
  }
  if (current) total += current;
  return matched && total > 0 ? Math.round(total) : null;
}

/**
 * Extracts the stolen amount from a transcript.
 *
 * Rather than matching fragile regex windows, this scans the whole text token by
 * token and evaluates every token that could start or continue an amount
 * expression. The largest value within plausible fraud bounds wins, so an account
 * number never masquerades as a loss figure.
 */
function extractAmount(text) {
  const source = normalize(text).toLowerCase();
  const candidates = [];

  // An amount never starts on a token that is clearly a bank/rail/context word, and
  // account-length digit runs (9+ digits) are excluded unless comma-grouped.
  const push = (value) => {
    if (value && value >= 1000 && value <= 5e8) candidates.push(value);
  };

  // Indian-grouped digit runs are matched on the RAW text first, because the
  // tokeniser below splits on commas and would otherwise never see them intact.
  for (const match of source.match(/\b\d{1,3}(?:,\d{2})*,\d{3}\b/g) || []) {
    push(parseAmount(match));
  }

  const tokens = source.replace(/₹/g, " rs ").split(/[\s,]+/).filter(Boolean);

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    // 1. Currency-prefixed figure: "rs 2.5 lakh", "rupees 150000".
    if (token === "rs" || token === "rupees" || token === "rupee") {
      const window = [];
      for (let j = i + 1; j < tokens.length && window.length < 4; j += 1) {
        const t = tokens[j];
        const key = t.replace(/[^a-z]/g, "");
        if (!/^\d+(\.\d+)?$/.test(t) && UNITS[t] === undefined && WORD_NUMBERS[key] === undefined) break;
        window.push(t);
        if (UNITS[t] !== undefined) break;
      }
      if (window.length) push(parseAmount(window.join(" ")));
      continue;
    }

    // 2. Indian-grouped digits.
    if (/^\d{1,3}(?:,\d{2})*,\d{3}$/.test(token)) {
      push(parseAmount(token));
      continue;
    }

    // 3. Scale-word phrases: walk forward while tokens keep contributing to the sum.
    if (UNITS[token] || WORD_NUMBERS[token] !== undefined || /^\d+(\.\d+)?$/.test(token)) {
      const window = [];
      for (let j = i; j < tokens.length; j += 1) {
        const t = tokens[j];
        const key = t.replace(/[^a-z]/g, "");
        const contributes =
          UNITS[t] !== undefined ||
          WORD_NUMBERS[key] !== undefined ||
          /^\d+(\.\d+)?$/.test(t) ||
          AMOUNT_FILLER.has(key);
        if (!contributes) break;
        window.push(t);
        // Stop once a scale word has been consumed and nothing numeric follows.
        if (UNITS[t] !== undefined) {
          const rest = tokens.slice(j + 1, j + 3).filter(
            (w) => WORD_NUMBERS[w.replace(/[^a-z]/g, "")] !== undefined || /^\d+$/.test(w),
          );
          if (!rest.length) break;
        }
      }
      if (window.some((w) => UNITS[w] !== undefined)) {
        push(parseAmount(window.join(" ")));
      }
      continue;
    }
  }

  return candidates.length ? Math.max(...candidates) : null;
}

function classifyScam(text) {
  for (const { category, patterns } of TAXONOMY) {
    if (patterns.some((p) => p.test(text))) return category;
  }
  return "FINANCIAL_FRAUD";
}

function detectRail(text) {
  for (const { mode, patterns } of RAILS) {
    if (patterns.some((p) => p.test(text))) return mode;
  }
  return "UPI";
}

/** UPI VPAs look like user@bank. */
function extractVpas(text) {
  return [...new Set(normalize(text).match(/\b[a-z0-9._-]{2,}@[a-z0-9.-]+\b/gi) || [])];
}

/** Bare account numbers: 9-18 consecutive digits, ignoring UPI handles. */
function extractAccountNumbers(text) {
  return [...new Set(normalize(text).match(/\b\d{9,18}\b/g) || [])];
}

/** Digit-spoken mule ids, e.g. "account 4 5 9 3" runs of nine or more digits. */
function extractSpokenAccountIds(text) {
  const digits = normalize(text).match(/\b\d[\d\s]{8,24}\d\b/g) || [];
  return digits
    .map((chunk) => chunk.replace(/\s/g, ""))
    .filter((chunk) => chunk.length >= 9 && chunk.length <= 18)
    .map((chunk) => [...new Set(chunk)].join(""));
}

const BANK_HINTS = [
  "HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank",
  "Punjab National Bank", "Bank of Baroda", "Canara Bank", "Union Bank of India",
  "IndusInd Bank", "Federal Bank", "Bandhan Bank", "IDBI Bank", "Yes Bank",
  "Kotak Mahindra", "Paytm Payments Bank", "Airtel Payments Bank", "PhonePe",
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function extractBanks(text) {
  const source = normalize(text);
  return BANK_HINTS.filter((bank) => new RegExp(`\\b${escapeRegExp(bank)}\\b`, "i").test(source));
}

/** Filler words that must never appear inside a captured name. */
const NAME_NOISE = /\b(hai|hoon|he|se|aur|main|mera|nam|ka|ki|ke|ko|from|calling|speaking|this|is|am|my|name|i|and|the|with)\b/gi;

/**
 * Best-effort complainant name across English and romanised Hindi phrasings.
 *
 * Captures at most three words and then trims from the first filler word onward,
 * so "Sunita Pillai. I lost ..." yields "Sunita Pillai" rather than the run-on.
 */
function extractName(text) {
  const source = normalize(text);
  const patterns = [
    /\bmy\s*name\s+is\s+([a-zA-Z. ]{3,40})/i,
    /\bmera\s*naam\s+([a-zA-Z. ]{3,40})/i,
    /\bmain\s+([a-zA-Z. ]{3,40}?)\s+hoon\b/i,
    /\bthis\s*is\s+([a-zA-Z. ]{3,40})\s+(?:speaking|calling)/i,
    /\bi\s*am\s+([a-zA-Z. ]{3,40}?)(?:\s+from|\s+calling|\s+in\b|,|\.)/i,
    /\bi'?m\s+([a-zA-Z. ]{3,40}?)(?:\s+from|\s+calling|,|\.)/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match) continue;

    const words = match[1]
      .replace(/[^a-zA-Z. ]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3);

    // Cut at the first filler word so trailing sentence words never enter the name,
    // and drop a trailing sentence period ("Pillai." -> "Pillai").
    const clean = [];
    for (const word of words) {
      if (NAME_NOISE.test(word)) break;
      NAME_NOISE.lastIndex = 0;
      const stripped = word.replace(/[^a-zA-Z]/g, "");
      if (stripped.length < 2) break;
      clean.push(stripped);
    }

    if (clean.length >= 2) {
      return clean.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
  }
  return null;
}

function extractPhone(text) {
  const match = normalize(text).match(/\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/);
  return match ? match[0].replace(/\D/g, "").slice(-10) : null;
}

const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Bengaluru", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Nagpur", "Nashik", "Jaipur", "Lucknow", "Patna", "Bhopal",
];

function extractLocation(text) {
  const source = normalize(text);
  return CITIES.find((city) => new RegExp(`\\b${city}\\b`, "i").test(source)) || null;
}

/**
 * Runs the extraction stage over a helpline transcript.
 * @returns {object} structured incident payload
 */
function extractFromTranscript(transcript) {
  const text = normalize(transcript);

  const amount = extractAmount(text);
  const vpas = extractVpas(text);
  const accounts = extractAccountNumbers(text);
  const spoken = extractSpokenAccountIds(text);
  const banks = extractBanks(text);

  // An explicit VPA is a stronger mule identifier than a bare digit run.
  const muleAccounts = [...new Set([...vpas, ...spoken, ...accounts])];

  // Confidence: how many independent signals the extractor actually fired on.
  const signals = [amount !== null, vpas.length > 0, accounts.length > 0, spoken.length > 0, banks.length > 0];
  const confidence = Math.round((signals.filter(Boolean).length / signals.length) * 100) / 100;

  return {
    transcript: text,
    complainant_name: extractName(text),
    phone_number: extractPhone(text),
    location: extractLocation(text),
    stolen_amount_inr: amount,
    transfer_mode: detectRail(text),
    scam_category: classifyScam(text),
    mule_accounts: muleAccounts,
    bank_mentions: banks,
    confidence,
  };
}

module.exports = {
  extractFromTranscript,
  parseAmount,
  extractAmount,
  classifyScam,
  detectRail,
  extractVpas,
  extractAccountNumbers,
  extractBanks,
  extractName,
  TAXONOMY,
  RAILS,
};
