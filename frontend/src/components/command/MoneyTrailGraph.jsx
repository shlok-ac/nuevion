import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Lock, MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CaseSelector from "@/components/command/CaseSelector";
import { getDashboardData, getFraudTrace } from "@/lib/api";
import { formatINR } from "@/lib/investigationData";
import { cn } from "@/lib/utils";

const COL_W = 320;
const ROW_H = 188;
const PAD_X = 40;
const PAD_Y = 48;
const NODE_W = 234;
const NODE_H = 132;

const roleTone = {
  complaint: "bg-blue-500/10 text-blue-600",
  "reported account": "bg-emerald-500/10 text-emerald-600",
  "NLP-extracted account": "bg-amber-500/10 text-amber-600",
  "reported transaction": "bg-violet-500/10 text-violet-600",
  "generated prototype mapping": "bg-slate-500/10 text-slate-600",
};

function makeTraceRoot(trace, caseItem) {
  const accounts = (trace.reported_accounts || []).map((account, index) => ({
    id: `reported-account-${index}`,
    role: "reported account",
    name: account.account_number || "Account identifier unavailable",
    account: account.account_number || "—",
    provenance: account.provenance,
    verified: account.verified,
  }));
  const extractedAccounts = (trace.NLP_extracted_accounts || []).map((account, index) => ({
    id: `extracted-account-${index}`,
    role: "NLP-extracted account",
    name: account.account_id || "Account identifier unavailable",
    account: account.account_id || "—",
    provenance: account.provenance,
    verified: account.verified,
  }));
  const transactions = (trace.reported_transactions || []).map((transaction, index) => ({
    id: `reported-transaction-${index}`,
    role: "reported transaction",
    name: transaction.transaction_id || "Transaction identifier unavailable",
    account: "—",
    bank: transaction.bank || "—",
    location: transaction.location || "—",
    amount: transaction.amount,
    txTime: [transaction.date, transaction.time].filter(Boolean).join(" ") || "Not provided by trace API",
    transactionType: transaction.transaction_type || "Not provided",
    provenance: transaction.provenance,
    verified: transaction.verified,
  }));
  const mappings = (trace.prototype_mappings || []).map((mapping, index) => ({
    id: `prototype-mapping-${index}`,
    role: "generated prototype mapping",
    name: mapping.atm_id || "ATM identifier unavailable",
    account: mapping.cashout_account || "—",
    bank: mapping.bank_name || "—",
    location: mapping.location || "—",
    provenance: mapping.provenance,
    verified: mapping.verified,
    label: mapping.label,
  }));

  return {
    id: `complaint-${trace.complaint_id}`,
    role: "complaint",
    name: trace.complaint_number || caseItem.case_number || "Complaint",
    bank: caseItem.bank_name || "—",
    account: caseItem.account || "—",
    amount: caseItem.amount,
    txTime: caseItem.lastActivity || "—",
    provenance: trace.provenance,
    verified: trace.verified,
    children: [...accounts, ...extractedAccounts, ...transactions, ...mappings],
  };
}

function findNode(root, id) {
  if (!root) return null;
  if (root.id === id) return root;
  return root.children?.find((child) => child.id === id) || null;
}

export default function MoneyTrailGraph({ initialCaseId }) {
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState("");
  const [trace, setTrace] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [layerFilter, setLayerFilter] = useState("all");
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const drag = useRef(null);

  useEffect(() => {
    let active = true;
    getDashboardData()
      .then((data) => {
        const liveCases = (data.cases || []).map((item) => ({
          ...item,
          id: String(item.id),
          title: item.description || item.complaint_number || item.case_number,
        }));
        if (!active) return;
        setCases(liveCases);
        const requested = liveCases.find((item) =>
          [item.id, String(item.complaint_id), item.case_number].includes(String(initialCaseId || ""))
        );
        setCaseId(requested?.id || liveCases[0]?.id || "");
      })
      .catch((error) => {
        if (active) {
          setLoadError(error.message || "Live cases are unavailable.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [initialCaseId]);

  const activeCase = cases.find((item) => item.id === caseId);

  useEffect(() => {
    if (!activeCase?.complaint_id) {
      setTrace(null);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setLoadError("");
    getFraudTrace(activeCase.complaint_id)
      .then((response) => {
        if (active) {
          setTrace(response?.data || null);
          setExpanded(new Set([`complaint-${response?.data?.complaint_id}`]));
          setSelected(null);
          setPan({ x: 40, y: 30 });
        }
      })
      .catch((error) => {
        if (active) {
          setTrace(null);
          setLoadError(error.message || "Complaint trace is unavailable.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeCase]);

  const root = useMemo(
    () => trace && activeCase ? makeTraceRoot(trace, activeCase) : null,
    [trace, activeCase]
  );

  const layout = useMemo(() => {
    const nodes = [];
    const edges = [];
    let leaf = 0;
    function walk(node, depth, parent) {
      const x = PAD_X + depth * COL_W;
      const isOpen = expanded.has(node.id) && node.children?.length;
      let y;
      if (isOpen) {
        const ys = node.children.map((child) => walk(child, depth + 1, node));
        y = (ys[0] + ys[ys.length - 1]) / 2;
      } else {
        y = PAD_Y + leaf * ROW_H + NODE_H / 2;
        leaf++;
      }
      nodes.push({ node, x, y, depth });
      if (parent) edges.push({ from: parent, to: node });
      return y;
    }
    if (root) walk(root, 0, null);
    const maxDepth = nodes.reduce((max, item) => Math.max(max, item.depth), 0);
    return {
      nodes,
      edges,
      width: PAD_X * 2 + (maxDepth + 1) * COL_W,
      height: PAD_Y * 2 + leaf * ROW_H,
    };
  }, [root, expanded]);

  const maxDepth = layout.nodes.reduce((max, item) => Math.max(max, item.depth), 0);
  const toggle = (id) => setExpanded((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const onCaseChange = (value) => {
    setCaseId(value);
    setTrace(null);
    setSelected(null);
    setPan({ x: 40, y: 30 });
  };

  const onPointerDown = (event) => {
    if (event.target.closest("[data-node]")) return;
    drag.current = { sx: event.clientX, sy: event.clientY, ox: pan.x, oy: pan.y };
  };
  const onPointerMove = (event) => {
    if (!drag.current) return;
    setPan({
      x: drag.current.ox + (event.clientX - drag.current.sx),
      y: drag.current.oy + (event.clientY - drag.current.sy),
    });
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <CaseSelector cases={cases} value={caseId} onValueChange={onCaseChange} className="w-64" />
        <Select value={layerFilter} onValueChange={setLayerFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All layers</SelectItem>
          {[...Array(maxDepth + 1).keys()].map((layer) => (
              <SelectItem key={layer} value={String(layer)}>Layer {layer}</SelectItem>
          ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          Drag the canvas to pan · click the complaint to expand · use ⋮ for details
        </span>
      </div>

      {loadError && (
        <p role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
          Trace data unavailable: {loadError}
        </p>
      )}
      <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900">
        Complaint-linked accounts and transactions are rendered with their source provenance. Generated prototype mappings are unverified references, not cash-out events. Lines do not imply relationships between sibling records.
      </p>
      {loading && <p className="text-sm text-muted-foreground">Loading live complaint trace…</p>}
      {!loading && !loadError && !root && (
        <p className="text-sm text-muted-foreground">No live complaint trace is available for this case.</p>
      )}

      {root && (
        <div
          className="relative w-full cursor-grab overflow-hidden rounded-lg border active:cursor-grabbing"
          style={{
            height: "80vh",
            backgroundImage: "radial-gradient(circle, #e2e8f0 1.5px, transparent 1.5px)",
            backgroundSize: "22px 22px",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          <div className="absolute" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
            <svg className="absolute" style={{ width: layout.width, height: layout.height }}>
              {layout.edges.map((edge, index) => {
                const from = layout.nodes.find((item) => item.node.id === edge.from.id);
                const to = layout.nodes.find((item) => item.node.id === edge.to.id);
                if (!from || !to) return null;
                const x1 = from.x + NODE_W;
                const y1 = from.y;
                const x2 = to.x;
                const y2 = to.y;
                const midpoint = (x1 + x2) / 2;
                return (
                  <path
                    key={index}
                    d={`M ${x1} ${y1} C ${midpoint} ${y1}, ${midpoint} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth={1.5}
                  />
                );
              })}
            </svg>
            {layout.nodes.map(({ node, x, y, depth }) => {
              const dim = layerFilter !== "all" && String(depth) !== layerFilter;
              const isOpen = expanded.has(node.id);
              const hasChildren = node.children?.length || 0;
              return (
                <div
                  key={node.id}
                  data-node
                  className={cn("absolute transition-opacity", dim && "opacity-30")}
                  style={{ left: x, top: y - NODE_H / 2, width: NODE_W }}
                >
                  <div className={cn("rounded-lg border bg-card p-3 shadow-sm", selected === node.id && "ring-2 ring-primary")}>
                    <div className="flex items-center justify-between">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", roleTone[node.role] || "bg-muted text-muted-foreground")}>
                        {node.role}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded p-0.5 hover:bg-accent" aria-label={`Details for ${node.name}`}>
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>Trace record</DropdownMenuLabel>
                          <DropdownMenuItem className="flex justify-between">
                            <span>{node.role === "complaint" ? "Reported amount" : "Amount"}</span>
                            <span className="font-medium">{node.amount == null ? "Not provided" : formatINR(node.amount)}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex justify-between">
                            <span>Time</span><span>{node.txTime || "Not provided"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex justify-between">
                            <span>Account</span><span className="font-mono text-xs">{node.account || "—"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex justify-between">
                            <span>Location</span><span>{node.location || "—"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setSelected(node.id)}>Open detail panel</DropdownMenuItem>
                          {activeCase && (
                            <DropdownMenuItem asChild>
                              <Link to={`/legal?case=${encodeURIComponent(activeCase.id)}`}>
                                <Lock className="h-3.5 w-3.5" /> Open notice preview
                              </Link>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{node.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{node.bank || "—"} · {node.account || "—"}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold">{node.amount == null ? "—" : formatINR(node.amount)}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {node.verified ? "Verified" : node.verified === false ? "Unverified" : "Verification unknown"}
                      </span>
                    </div>
                    {hasChildren > 0 && (
                      <button
                        onClick={() => toggle(node.id)}
                        className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md border py-1 text-xs hover:bg-accent"
                      >
                        {isOpen ? "Collapse" : `Expand ${hasChildren} trace record${hasChildren === 1 ? "" : "s"}`}
                        <ChevronRight className={cn("h-3 w-3 transition-transform", isOpen && "rotate-90")} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute left-3 top-3 rounded bg-card/80 px-2 py-1 text-xs text-muted-foreground">
            Live complaint trace · provenance retained
          </div>
          <button
            onClick={() => setPan({ x: 40, y: 30 })}
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute right-3 top-3 rounded-md border bg-card px-2 py-1 text-xs hover:bg-accent"
          >
            Reset view
          </button>
          <div onPointerDown={(event) => event.stopPropagation()} className="absolute right-3 top-12 w-72">
            <DetailPanel node={selected ? findNode(root, selected) : null} />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailPanel({ node }) {
  if (!node) return null;
  return (
    <div className="rounded-lg border bg-card/95 p-3 text-xs shadow-sm">
      <p className="font-semibold">{node.name}</p>
      <p className="mt-1 text-muted-foreground">{node.role}</p>
      <dl className="mt-3 space-y-2">
        <Row label="Provenance" value={node.provenance || "Not provided"} />
        <Row label="Verified" value={node.verified == null ? "Unknown" : node.verified ? "Yes" : "No"} />
        {node.label && <Row label="Reference status" value={node.label} />}
        {node.transactionType && <Row label="Transaction type" value={node.transactionType} />}
      </dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[70%] text-right font-medium">{value}</span>
    </div>
  );
}
