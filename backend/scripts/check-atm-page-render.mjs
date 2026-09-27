/**
 * Renders the ATM Intelligence page's unguarded data derivations for EVERY case and
 * reports which ones throw. A case whose mule chain, ATM watchlist or region is missing
 * crashes the whole page, which a build cannot detect.
 */
const m = await import(
  "file:///C:/Users/shlok/Documents/Github/nuevion/frontend/src/lib/investigationData.js"
);

const { cases, regions, atmRankings, muleChains, suspects, callCity, cashoutPatterns } = m;
const regionId = (c) => String(c || "").toLowerCase().replace(/\s+/g, "-");

const flattenChain = (node, acc = []) => {
  acc.push(node);
  if (node.children) node.children.forEach((c) => flattenChain(c, acc));
  return acc;
};

const crashes = { chain: [], atms: [], suspects: [], region: [], pattern: [] };

for (const k of cases) {
  // page: const chain = muleChains[activeCase.muleChainId]; flattenChain(chain)
  try {
    const chain = muleChains[k.muleChainId];
    flattenChain(chain);
  } catch (e) {
    crashes.chain.push(`${k.id} (${k.muleChainId}): ${e.message}`);
  }

  // page: suspects.filter((s) => s.linkedCases.includes(activeCase.id))
  try {
    suspects.filter((s) => s.linkedCases.includes(k.id));
  } catch (e) {
    crashes.suspects.push(`${k.id}: ${e.message}`);
  }

  // page: cashoutPatterns[activeCase.id] -> pattern.cities
  const p = cashoutPatterns[k.id];
  if (!p || !Array.isArray(p.cities)) crashes.pattern.push(k.id);

  // page: selectedAtms = atmRankings[selectedRegion.id] ?? []
  const top = regions
    .map((r) => {
      const hist = new Map((p?.cities || []).map((c) => [regionId(c.city), c.cases]));
      const share = p?.total ? (hist.get(r.id) || 0) / p.total : 0;
      return { r, s: share * 100 + (r.id === regionId(callCity[k.id]) ? 0.5 : 0) };
    })
    .sort((a, b) => b.s - a.s || a.r.name.localeCompare(b.r.name))[0];
  if (!top) crashes.region.push(`${k.id}: no region`);
  else if (!atmRankings[top.r.id] || !atmRankings[top.r.id].length) {
    crashes.atms.push(`${k.id} -> ${top.r.name} (${top.r.id})`);
  }
}

console.log(`cases: ${cases.length}\n`);
for (const [name, list] of Object.entries(crashes)) {
  console.log(`${list.length ? "CRASH" : "ok   "}  ${name.padEnd(8)} ${list.length}`);
  list.slice(0, 4).forEach((x) => console.log(`         ${x}`));
}

const total = Object.values(crashes).reduce((a, l) => a + l.length, 0);
console.log(`\ntotal offending cases: ${total}`);
process.exitCode = total ? 1 : 0;
