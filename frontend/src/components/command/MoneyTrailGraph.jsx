import { useMemo, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CaseSelector from "@/components/command/CaseSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { ChevronRight, MoreVertical, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { muleChains, cases, formatINR } from "@/lib/investigationData";
import { cn } from "@/lib/utils";

const COL_W = 320;
const ROW_H = 188;
const PAD_X = 40;
const PAD_Y = 48;
const NODE_W = 234;
const NODE_H = 132;

const roleTone = {
  source: "bg-emerald-500/10 text-emerald-600",
  "layer-1 mule": "bg-amber-500/10 text-amber-600",
  "layer-2 mule": "bg-orange-500/10 text-orange-600",
  "layer-3 mule": "bg-red-500/10 text-red-600",
  "cash-out": "bg-red-600 text-white"
};
const statusDot = {
  received: "bg-emerald-500",
  debited: "bg-blue-500",
  frozen: "bg-blue-600",
  converted: "bg-purple-500",
  withdrawn: "bg-red-500"
};

function findNode(root, id) {
  if (!root) return null;
  if (root.id === id) return root;
  for (const c of root.children ?? []) {
    const r = findNode(c, id);
    if (r) return r;
  }
  return null;
}

export default function MoneyTrailGraph({ initialCaseId }) {
  const [caseId, setCaseId] = useState(initialCaseId ?? cases[0].muleChainId);
  const [expanded, setExpanded] = useState(() => new Set([cases[0].muleChainId]));
  const [selected, setSelected] = useState(null);
  const [layerFilter, setLayerFilter] = useState("all");
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const drag = useRef(null);

  const root = muleChains[caseId];
  const activeCase = cases.find((c) => c.muleChainId === caseId);

  const layout = useMemo(() => {
    const nodes = [];
    const edges = [];
    let leaf = 0;
    function walk(node, depth, parent) {
      const x = PAD_X + depth * COL_W;
      const isOpen = expanded.has(node.id) && node.children?.length;
      let y;
      if (isOpen) {
        const ys = node.children.map((c) => walk(c, depth + 1, node));
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
    const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
    return {
      nodes,
      edges,
      width: PAD_X * 2 + (maxDepth + 1) * COL_W,
      height: PAD_Y * 2 + leaf * ROW_H
    };
  }, [root, expanded]);

  const maxDepth = layout.nodes.reduce((m, n) => Math.max(m, n.depth), 0);

  const toggle = (id) =>
  setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);else
    next.add(id);
    return next;
  });

  const onCaseChange = (v) => {
    setCaseId(v);
    setExpanded(new Set([v]));
    setSelected(null);
    setPan({ x: 40, y: 30 });
  };

  const onPointerDown = (e) => {
    if (e.target.closest("[data-node]")) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setPan({
      x: drag.current.ox + (e.clientX - drag.current.sx),
      y: drag.current.oy + (e.clientY - drag.current.sy)
    });
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <CaseSelector cases={cases} value={caseId} onValueChange={onCaseChange} valueKey="muleChainId" className="w-64" />
        <Select value={layerFilter} onValueChange={setLayerFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All layers</SelectItem>
            {[...Array(maxDepth + 1).keys()].map((l) =>
            <SelectItem key={l} value={String(l)}>
                Layer {l}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          Drag the canvas to pan · click a node to expand · use ⋮ for details
        </span>
      </div>

      <div
        className="relative w-full cursor-grab overflow-hidden rounded-lg border active:cursor-grabbing"
        style={{
          height: "80vh",
          backgroundImage: "radial-gradient(circle, #e2e8f0 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px"
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}>
        
        <div className="absolute" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
          <svg className="absolute" style={{ width: layout.width, height: layout.height }}>
            {layout.edges.map((e, i) => {
              const from = layout.nodes.find((n) => n.node.id === e.from.id);
              const to = layout.nodes.find((n) => n.node.id === e.to.id);
              if (!from || !to) return null;
              const x1 = from.x + NODE_W;
              const y1 = from.y;
              const x2 = to.x;
              const y2 = to.y;
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth={1.5} />);


            })}
          </svg>
          {layout.nodes.map(({ node, x, y, depth }) => {
            const dim = layerFilter !== "all" && String(depth) !== layerFilter;
            const isOpen = expanded.has(node.id);
            const hasChildren = node.children?.length;
            return (
              <div
                key={node.id}
                data-node
                className={cn("absolute transition-opacity", dim && "opacity-30")}
                style={{ left: x, top: y - NODE_H / 2, width: NODE_W }}>
                
                <div className={cn("rounded-lg border bg-card p-3 shadow-sm", selected === node.id && "ring-2 ring-primary")}>
                  <div className="flex items-center justify-between">
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", roleTone[node.role] ?? "bg-muted text-muted-foreground")}>
                      {node.role}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded p-0.5 hover:bg-accent">
                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Transaction</DropdownMenuLabel>
                        <DropdownMenuItem className="flex justify-between">
                          <span>Amount</span>
                          <span className="font-medium">{formatINR(node.amount)}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex justify-between">
                          <span>Time</span>
                          <span>{node.txTime}</span>
                        </DropdownMenuItem>
                        {node.utr &&
                        <DropdownMenuItem className="flex justify-between">
                            <span>UTR</span>
                            <span className="font-mono text-xs">{node.utr}</span>
                          </DropdownMenuItem>
                        }
                        <DropdownMenuItem className="flex justify-between">
                          <span>Account</span>
                          <span className="font-mono text-xs">{node.account}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setSelected(node.id)}>Open detail panel</DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/legal" state={{ caseId: activeCase?.muleChainId, account: node.account, bank: node.bank }}>
                            <Lock className="h-3.5 w-3.5" /> Generate freeze notice
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{node.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{node.bank} · {node.account}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-sm font-semibold">{formatINR(node.amount)}</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[node.status] ?? "bg-muted")} />
                      {node.status}
                    </span>
                  </div>
                  {hasChildren ?
                  <button
                    onClick={() => toggle(node.id)}
                    className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md border py-1 text-xs hover:bg-accent">
                    
                      {isOpen ? "Collapse" : `Expand ${hasChildren} mule${hasChildren > 1 ? "s" : ""}`}
                      <ChevronRight className={cn("h-3 w-3 transition-transform", isOpen && "rotate-90")} />
                    </button> :
                  null}
                </div>
              </div>);

          })}
        </div>

        <div className="pointer-events-none absolute left-3 top-3 rounded bg-card/80 px-2 py-1 text-xs text-muted-foreground">
          Drag to pan
        </div>
        <button
          onClick={() => setPan({ x: 40, y: 30 })}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-3 top-3 rounded-md border bg-card px-2 py-1 text-xs hover:bg-accent">
          
          Reset view
        </button>
        <div onPointerDown={(e) => e.stopPropagation()} className="absolute right-3 top-12 w-72">
          <DetailPanel node={selected ? findNode(root, selected) : null} activeCase={activeCase} />
        </div>
      </div>
    </div>);

}

function DetailPanel({ node, activeCase }) {
  return null;



























}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right font-medium", mono && "font-mono text-xs")}>{value}</span>
    </div>);

}