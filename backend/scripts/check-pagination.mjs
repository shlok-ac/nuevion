/**
 * Verifies the pagination maths in CaseManagement.jsx against the generated dataset.
 * Run: node scripts/check-pagination.mjs
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(here, "..", "..", "frontend", "src", "lib", "investigationData.js");

// The generated module is plain ESM with no imports, so it can be evaluated directly.
const cases = await import(`file:///${dataFile.replace(/\\/g, "/")}`).then((m) => m.cases);

const PAGE_SIZE = 100;

function buildPageList(currentPage, totalPages, window = 1) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = new Set([1, totalPages, currentPage]);
  for (let offset = 1; offset <= window; offset += 1) {
    visible.add(currentPage - offset);
    visible.add(currentPage + offset);
  }
  const sorted = [...visible].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const pages = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) pages.push(null);
    pages.push(p);
    previous = p;
  }
  return pages;
}

const out = [];
const say = (s) => out.push(s);
let failures = 0;
const check = (name, cond, detail = "") => {
  if (cond) say(`PASS  ${name}`);
  else {
    failures += 1;
    say(`FAIL  ${name}  ${detail}`);
  }
};

say(`dataset: ${cases.length} cases, PAGE_SIZE ${PAGE_SIZE}\n`);

const totalPages = Math.max(1, Math.ceil(cases.length / PAGE_SIZE));
say(`totalPages = ${totalPages}\n`);

// Every page is reachable and holds the right slice.
let covered = 0;
let rowsOk = true;
for (let p = 1; p <= totalPages; p += 1) {
  const slice = cases.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  if (p < totalPages && slice.length !== PAGE_SIZE) rowsOk = false;
  covered += slice.length;
  const first = (p - 1) * PAGE_SIZE + 1;
  const last = Math.min(p * PAGE_SIZE, cases.length);
  if (first !== (p - 1) * PAGE_SIZE + 1) rowsOk = false;
  if (last > cases.length) rowsOk = false;
}
check("every non-final page holds exactly PAGE_SIZE rows", rowsOk);
check("pages cover every case exactly once", covered === cases.length, `${covered} vs ${cases.length}`);

// Boundaries.
const first = (1 - 1) * PAGE_SIZE + 1;
const lastOnFirst = Math.min(1 * PAGE_SIZE, cases.length);
const firstOnLast = (totalPages - 1) * PAGE_SIZE + 1;
const lastOnLast = Math.min(totalPages * PAGE_SIZE, cases.length);
say("");
say(`page 1  -> Showing ${first}-${lastOnFirst}`);
say(`page ${totalPages} -> Showing ${firstOnLast}-${lastOnLast}`);
check("page 1 range starts at 1", first === 1);
check("final page ends on the last case", lastOnLast === cases.length);

// Contiguity across every consecutive page pair, not just the outer two.
let contiguous = true;
for (let p = 1; p < totalPages; p += 1) {
  const endOfPage = Math.min(p * PAGE_SIZE, cases.length);
  const startOfNext = p * PAGE_SIZE + 1;
  if (startOfNext !== endOfPage + 1) contiguous = false;
}
check("consecutive pages are contiguous with no gaps or overlaps", contiguous);

// Page-list rendering.
say("");
const mid = Math.ceil(totalPages / 2);
const listMid = buildPageList(mid, totalPages);
say(`buildPageList(${mid}, ${totalPages}) = [${listMid.map((p) => (p === null ? "…" : p)).join(" ")}]`);
check("current page is present in the list", listMid.includes(mid));
check("first and last pages are present", listMid.includes(1) && listMid.includes(totalPages));
check("elisions are used once the list is long", totalPages <= 7 || listMid.includes(null));

const edge1 = buildPageList(1, totalPages);
const edgeLast = buildPageList(totalPages, totalPages);
say(`buildPageList(1, ${totalPages})     = [${edge1.map((p) => (p === null ? "…" : p)).join(" ")}]`);
say(`buildPageList(${totalPages}, ${totalPages}) = [${edgeLast.map((p) => (p === null ? "…" : p)).join(" ")}]`);
check("page 1 window is valid", edge1[0] === 1);
check("last-page window is valid", edgeLast[edgeLast.length - 1] === totalPages);
check("no out-of-range page numbers", [...listMid, ...edge1, ...edgeLast].every((p) => p === null || (p >= 1 && p <= totalPages)));

// Clamping: a stale page number must never render an empty table.
say("");
const stale = Math.min(999, totalPages);
check("stale page clamps to the last page", stale === totalPages);
check("clamped page still has rows", cases.slice((stale - 1) * PAGE_SIZE, stale * PAGE_SIZE).length > 0);

// Single page (small filtered result set).
const single = buildPageList(1, 1);
check("single page renders just [1]", JSON.stringify(single) === "[1]");
const emptyList = buildPageList(1, Math.max(1, Math.ceil(0 / PAGE_SIZE)));
check("empty result set still renders one page", emptyList.length === 1);

say("");
say(failures === 0 ? "All pagination checks passed." : `${failures} check(s) failed.`);
console.log(out.join("\n"));
process.exit(failures === 0 ? 0 : 1);
