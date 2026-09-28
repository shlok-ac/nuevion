import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { AlertTriangle, FolderOpen } from "lucide-react";
import { formatINR } from "@/lib/investigationData";
import { cn } from "@/lib/utils";
import FraudHeatmap from "@/components/command/FraudHeatmap";

const priorityTone = {
  critical: "bg-red-500/10 text-red-600 border-red-200",
  high: "bg-amber-500/10 text-amber-600 border-amber-200",
  medium: "bg-blue-500/10 text-blue-600 border-blue-200",
};
const statusTone = {
  active: "bg-emerald-500/10 text-emerald-600",
  received: "bg-blue-500/10 text-blue-600",
  "under investigation": "bg-blue-500/10 text-blue-600",
  resolved: "bg-emerald-500/10 text-emerald-600",
  frozen: "bg-blue-500/10 text-blue-600",
  monitoring: "bg-amber-500/10 text-amber-600",
  closed: "bg-muted text-muted-foreground",
};

export default function CaseQueue({ cases = [], alerts = [] }) {
  const sortedCases = [...cases].sort(
    (a, b) => Number(b.amount || b.fraud_amount || 0) - Number(a.amount || a.fraud_amount || 0)
  );
  const sortedAlerts = [...alerts].sort(
    (a, b) => new Date(b.time || b.created_at || 0) - new Date(a.time || a.created_at || 0)
  );

  return (
    <div className="grid gap-x-4 gap-y-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <FolderOpen className="h-5 w-5 shrink-0 text-emerald-500" /> Active Cases
          </CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">sorted by amount</span>
            <Badge variant="secondary" className="shrink-0 px-3 py-1 text-sm">{sortedCases.length}</Badge>
          </div>
        </CardHeader>
        <div aria-hidden="true" className="h-px bg-emerald-500/30" />
        <CardContent className="space-y-2 pt-4">
          {sortedCases.map((c) => (
            <Link key={c.id || c.case_number} to={`/cases/${c.id || c.case_number}`} className="block">
              <div className="group flex items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-accent hover:shadow-[0_8px_20px_-10px_rgb(15_23_42/0.25)]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{c.title || c.description || c.complaint_number}</span>
                    <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase", priorityTone[String(c.priority || "").toLowerCase()])}>
                      {c.priority || "Unrated"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground transition-colors duration-200 group-hover:text-foreground">{c.case_number || c.id} · {c.fraudType || c.transaction_type || "—"}</p>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-sm font-semibold">{formatINR(c.amount ?? c.fraud_amount ?? 0)}</p>
                  <span className={cn("mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", statusTone[String(c.status || "").toLowerCase()])}>
                    {c.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" /> Priority Alerts
          </CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">sorted by time</span>
            <Badge variant="secondary" className="shrink-0 px-3 py-1 text-sm">{sortedAlerts.length}</Badge>
          </div>
        </CardHeader>
        <div aria-hidden="true" className="h-px bg-red-500/30" />
        <CardContent className="space-y-2 pt-4">
          <p className="text-xs text-muted-foreground">Existing stored alerts only; new complaint-triggered cash-out alerts are disabled.</p>
          {sortedAlerts.length ? sortedAlerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
              <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", String(a.severity || "").toLowerCase() === "critical" ? "bg-red-500" : "bg-amber-500")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{a.message}</p>
                <p className="text-xs text-muted-foreground">{a.caseId || a.case_id || "Case"} · {a.time || a.created_at || "—"}</p>
              </div>
              <span className="text-sm font-semibold">{a.amount ? formatINR(a.amount) : "—"}</span>
            </div>
          )) : <p className="py-5 text-sm text-muted-foreground">No alerts are available.</p>}
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <FraudHeatmap />
      </div>
    </div>
  );
}