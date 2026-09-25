import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Banknote, Download, MapPin, Scale, Share2, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cases, formatINR, muleChains, suspects } from "@/lib/investigationData";
import { cn } from "@/lib/utils";

const priorityTone = {
  critical: "border-red-200 bg-red-500/10 text-red-600",
  high: "border-amber-200 bg-amber-500/10 text-amber-600",
  medium: "border-blue-200 bg-blue-500/10 text-blue-600",
  low: "border-slate-200 bg-slate-500/10 text-slate-600",
};

const statusTone = {
  active: "bg-emerald-500/10 text-emerald-600",
  monitoring: "bg-amber-500/10 text-amber-600",
  frozen: "bg-blue-500/10 text-blue-600",
  resolved: "bg-emerald-500/10 text-emerald-600",
  closed: "bg-muted text-muted-foreground",
};

const actions = [
  { label: "ATM Intelligence", description: "View linked ATMs, risk scores, activity, and predicted withdrawal locations.", path: "/atm-intelligence", icon: Banknote },
  { label: "Money Trail", description: "Investigate the transaction and mule-chain graph for connected accounts and entities.", path: "/money-trail", icon: Share2 },
  { label: "Legal Window", description: "Prepare the relevant bank notice in the legal notice workspace.", path: "/legal", icon: Scale },
  { label: "Freeze Simulation", description: "Open the simulated account and ATM freeze workflow for this case.", path: "/freeze-sim", icon: Snowflake },
  { label: "Export", description: "Generate the case report and evidence documents.", path: "/export", icon: Download },
];

const formatDate = (value) =>
  new Date(`${value}T00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatActivity = (value) => {
  const date = new Date(value.replace(" ", "T"));
  return {
    date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
};

function flattenChain(node, result = []) {
  if (!node) return result;
  result.push(node);
  node.children?.forEach((child) => flattenChain(child, result));
  return result;
}

export default function CaseDetails() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const caseItem = cases.find((item) => item.id === caseId);

  if (!caseItem) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" onClick={() => navigate("/case-management")}><ArrowLeft className="h-4 w-4" /> Back to Cases</Button>
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Case not found.</CardContent></Card>
      </div>
    );
  }

  const activity = formatActivity(caseItem.lastActivity);
  const chain = flattenChain(muleChains[caseItem.muleChainId]);
  const linkedSuspects = suspects.filter((suspect) => suspect.linkedCases.includes(caseItem.id));
  const linkedAccounts = chain.slice(0, 6);
  const timeline = [
    ["14:20", "Fraud complaint received"],
    ["14:28", "Mule account identified"],
    ["14:35", "Suspicious transfer detected"],
    ["14:42", "ATM linked to case"],
    ["15:03", "Investigation escalated"],
  ];

  return (
    <div className="space-y-5 p-6">
      <Button variant="ghost" className="-ml-3" onClick={() => navigate("/case-management")}>
        <ArrowLeft className="h-4 w-4" /> Back to Cases
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-muted-foreground">{caseItem.id}</p>
            <h2 className="mt-1 text-xl font-semibold">{caseItem.title}</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Risk</p><Badge className={cn("mt-1 uppercase", priorityTone[caseItem.priority])}>{caseItem.priority}</Badge></div>
            <div><p className="text-xs text-muted-foreground">Status</p><Badge className={cn("mt-1 uppercase", statusTone[caseItem.status])}>{caseItem.status}</Badge></div>
            <div><p className="text-xs text-muted-foreground">Fraud Amount</p><p className="mt-1 font-semibold">{formatINR(caseItem.amount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Last Activity</p><p className="mt-1 font-medium">{activity.date}<br />{activity.time}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader><CardTitle className="text-sm">Case Overview</CardTitle></CardHeader>
          <CardContent className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Crime Type</p><p className="mt-1">{caseItem.fraudType}</p></div>
            <div><p className="text-xs text-muted-foreground">Location</p><p className="mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{caseItem.branch}</p></div>
            <div><p className="text-xs text-muted-foreground">Date Reported</p><p className="mt-1">{formatDate(caseItem.filedDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">Last Activity</p><p className="mt-1">{activity.date}, {activity.time}</p></div>
            <div><p className="text-xs text-muted-foreground">Victim</p><p className="mt-1">{caseItem.victim}</p></div>
            <div><p className="text-xs text-muted-foreground">Linked Accounts</p><p className="mt-1 font-medium">{linkedAccounts.length}</p></div>
            <div><p className="text-xs text-muted-foreground">Linked ATMs</p><p className="mt-1 font-medium">{caseItem.suspectIds.length}</p></div>
            <div><p className="text-xs text-muted-foreground">Linked Suspects</p><p className="mt-1 font-medium">{linkedSuspects.length || caseItem.suspectIds.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle><p className="text-xs text-muted-foreground">Open case-specific investigation tools</p></CardHeader>
          <CardContent className="space-y-1">
            {actions.map(({ label, description, path, icon: Icon }) => (
              <Link key={label} to={`${path}?case=${encodeURIComponent(caseItem.id)}`} className="group flex items-start gap-3 rounded-md p-2.5 transition-colors hover:bg-accent">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span></span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide">Case Summary</CardTitle></CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          {caseItem.title} is a {caseItem.fraudType.toLowerCase()} investigation involving {caseItem.victim}. The case is being handled by {caseItem.officer} at {caseItem.station}, with {formatINR(caseItem.amount)} currently associated with the reported fraud.
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader><CardTitle className="text-sm uppercase tracking-wide">Investigation Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {timeline.map(([time, label]) => <div key={`${time}-${label}`} className="flex gap-4 text-sm"><span className="w-12 shrink-0 font-mono text-xs font-semibold text-muted-foreground">{time}</span><span className="border-l border-border pl-4">{label}</span></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm uppercase tracking-wide">Case Status Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Current Status</span><Badge className={cn("uppercase", statusTone[caseItem.status])}>{caseItem.status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Risk</span><Badge className={cn("uppercase", priorityTone[caseItem.priority])}>{caseItem.priority}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className="font-medium">Immediate Attention</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide">Linked Entities</CardTitle></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <EntityGroup title="Linked Accounts" items={linkedAccounts.slice(0, 3).map((item) => [item.account, item.status])} />
          <EntityGroup title="Linked ATMs" items={caseItem.suspectIds.slice(0, 3).map((id, index) => [`ATM-${String(index + 1).padStart(3, "0")}`, `Risk ${94 - index * 5}`])} />
          <EntityGroup title="Linked Suspects" items={linkedSuspects.slice(0, 3).map((suspect) => [suspect.id, suspect.risk])} />
        </CardContent>
      </Card>
    </div>
  );
}

function EntityGroup({ title, items }) {
  return <div><h3 className="mb-2 text-sm font-medium">{title}</h3><div className="space-y-1">{items.length ? items.map(([name, detail]) => <div key={name} className="flex justify-between rounded-md border border-border/60 px-3 py-2 text-xs"><span className="font-medium">{name}</span><span className="text-muted-foreground">{detail}</span></div>) : <p className="text-xs text-muted-foreground">No linked entities.</p>}</div></div>;
}
