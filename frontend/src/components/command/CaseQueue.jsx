import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { AlertTriangle, FolderOpen } from "lucide-react";
import { cases, alerts, formatINR } from "@/lib/investigationData";
import { cn } from "@/lib/utils";
import FraudHeatmap from "@/components/command/FraudHeatmap";

/*
 * Both lists are pinned to a fixed height and scroll internally.
 *
 * They previously sized themselves to their contents, so the original three-case
 * dataset produced a compact card. Against the full dataset the same markup grew to
 * hundreds of rows and pushed the heatmap off the dashboard. A fixed height keeps
 * the card at its original footprint no matter how many rows are present, and the
 * `scrollbar-none` utility (see index.css) keeps the scrollbar out of the way while
 * leaving wheel, touch and keyboard scrolling intact.
 *
 * The card header stays outside the scroll region so the title, sort hint and count
 * badge remain pinned; only the rows move.
 */
const LIST_HEIGHT = "h-[19rem]";

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
          <CardTitle className="flex items-center gap-2.5 text-base">
            <FolderOpen className="h-5 w-5 shrink-0 text-emerald-500" /> Active Cases
          </CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">sorted by amount</span>
            <Badge variant="secondary" className="shrink-0 px-3 py-1 text-sm">{sortedCases.length}</Badge>
          </div>
        </CardHeader>
        <div aria-hidden="true" className="h-px bg-emerald-500/30" />
        <CardContent className="pt-4">
          <div
            className={cn(
              "scrollbar-none space-y-2 overflow-y-auto overscroll-contain pr-1",
              LIST_HEIGHT,
            )}
            tabIndex={0}
            role="region"
            aria-label={`Active cases, ${sortedCases.length} total, sorted by amount`}
          >
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
          </div>
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
        <CardContent className="pt-4">
          <div
            className={cn(
              "scrollbar-none space-y-2 overflow-y-auto overscroll-contain pr-1",
              LIST_HEIGHT,
            )}
            tabIndex={0}
            role="region"
            aria-label={`Priority alerts, ${sortedAlerts.length} total, newest first`}
          >
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
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <FraudHeatmap />
      </div>
    </div>
  );
}