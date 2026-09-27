/**
 * Minimal RFC-4180 CSV reader/writer.
 *
 * The seed CSVs contain free-text description fields with commas, so a naive
 * `line.split(",")` would misalign every column after the description. This
 * handles quoted fields.
 */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows.shift().map((h) => h.trim());
  return rows
    .filter((cells) => cells.some((c) => c.trim() !== ""))
    .map((cells) => Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? "").trim()])));
}

/** Serialises a value for CSV: quotes only when the value contains a comma or quote. */
function csvCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(rows, columns) {
  const keys = columns || (rows.length ? Object.keys(rows[0]) : []);
  const lines = [keys.join(",")];
  for (const row of rows) lines.push(keys.map((k) => csvCell(row[k])).join(","));
  return `${lines.join("\n")}\n`;
}

module.exports = { parseCsv, toCsv, csvCell };
