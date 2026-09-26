import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { cases, alerts, formatINR } from "@/lib/investigationData";
import { cn } from "@/lib/utils";
import FraudHeatmap from "@/components/command/FraudHeatmap";

const priorityTone = {
  critical: "bg-red-500/10 text-red-600 border-red-200",
  high: "bg-amber-500/10 text-amber-600 border-amber-200",
  medium: "bg-blue-500/10 text-blue-600 border-blue-200",
};
const statusTone = {
  active: "bg-emerald-500/10 text-emerald-600",
  frozen: "bg-blue-500/10 text-blue-600",
  monitoring: "bg-amber-500/10 text-amber-600",
  closed: "bg-muted text-muted-foreground",
};

export default function CaseQueue() {
  const sortedCases = [...cases].sort((a, b) => b.amount - a.amount);
  const sortedAlerts = [...alerts].sort((a, b) => new Date(b.time) - new Date(a.time));

  return (
    <div className="grid gap-x-4 gap-y-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Active Cases</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">sorted by amount</span>
            <Badge variant="secondary" className="shrink-0 px-3 py-1 text-sm">{sortedCases.length}</Badge>
          </div>
        </CardHeader>
        <div aria-hidden="true" className="h-px bg-emerald-500/30" />
        <CardContent className="space-y-2 pt-4">
          {sortedCases.map((c) => (
            <Link key={c.id} to={`/cases/${c.id}`} className="block">
              <div className="group flex items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-accent hover:shadow-[0_8px_20px_-10px_rgb(15_23_42/0.25)]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{c.title}</span>
                    <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase", priorityTone[c.priority])}>
                      {c.priority}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground transition-colors duration-200 group-hover:text-foreground">{c.id} · {c.fraudType}</p>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-sm font-semibold">{formatINR(c.amount)}</p>
                  <span className={cn("mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", statusTone[c.status])}>
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
          {sortedAlerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
              <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", a.severity === "critical" ? "bg-red-500" : "bg-amber-500")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{a.message}</p>
                <p className="text-xs text-muted-foreground">{a.caseId} · {a.time}</p>
              </div>
              <span className="text-sm font-semibold">{a.amount ? formatINR(a.amount) : "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <FraudHeatmap />
      </div>
    </div>
  );
}