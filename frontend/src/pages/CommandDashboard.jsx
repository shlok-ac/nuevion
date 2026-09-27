import StatCard from "@/components/command/StatCard";
import CaseQueue from "@/components/command/CaseQueue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, AlertTriangle, Snowflake, Users, Activity } from "lucide-react";
import { cases, suspects, alerts, formatINR } from "@/lib/investigationData";

/*
 * The live feed is scrollable at a fixed height, matching the treatment applied to
 * the case and alert queues in CaseQueue.jsx.
 *
 * Its height is deliberately larger than the queues' 19rem: the feed is a full-width
 * strip at the bottom of the dashboard where reading a longer history is useful, and
 * the original height (which only ever had to fit the five mock alerts) is now far
 * too short to be worth restoring.
 */
const FEED_HEIGHT = "h-[26rem]";

export default function CommandDashboard() {
  const totalAtRisk = cases.reduce((s, c) => s + c.amount, 0);
  const frozen = cases.filter((c) => c.status === "frozen").length;
  const identified = suspects.filter((s) => s.status === "identified").length;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardContent className="p-4 text-sm">
          <p className="flex items-center gap-2 text-base font-semibold text-emerald-600">
            <span aria-hidden="true" className="w-4 shrink-0">●</span>
            Data systems operational
          </p>
          <p className="mt-1 pl-6 text-muted-foreground">Last sync: 22:34:12</p>
          <div className="mt-3 grid gap-2 text-foreground sm:grid-cols-2 xl:grid-cols-4">
            {["NCRP", "Bank feeds", "Transaction engine", "ML model"].map((system) => (
              <div
                key={system}
                className="group flex min-h-8 items-center justify-between rounded-md border bg-background px-3 py-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-accent hover:shadow-[0_8px_20px_-10px_rgb(15_23_42/0.2)]"
              >
                <span>{system}</span>
                <span
                  className="flex h-5 w-5 items-center justify-center text-emerald-600 transition-transform duration-200 group-hover:scale-110"
                  aria-label="operational"
                >
                  ✓
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Total amount at risk" value={formatINR(totalAtRisk)} sub={`${cases.length} active cases`} tone="red" />
        <StatCard icon={AlertTriangle} label="Priority alerts (24h)" value={alerts.length} sub="2 critical" tone="amber" />
        <StatCard icon={Snowflake} label="Accounts frozen" value={frozen} sub="silent lien active" tone="blue" />
        <StatCard icon={Users} label="Suspects tracked" value={suspects.length} sub={`${identified} identified`} tone="green" />
      </div>

      <CaseQueue />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Activity className="h-5 w-5 shrink-0" /> Live activity feed
          </CardTitle>
        </CardHeader>
        <div aria-hidden="true" className="mx-6 h-px bg-blue-500/30" />
        <CardContent className="pt-5 text-sm">
          <div
            className={`scrollbar-none space-y-2 overflow-y-auto overscroll-contain pr-1 ${FEED_HEIGHT}`}
            tabIndex={0}
            role="region"
            aria-label={`Live activity feed, ${alerts.length} entries, newest first`}
          >
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span>
                  <span className="font-medium">{a.caseId}</span> — {a.message}
                </span>
                <span className="shrink-0 pl-3 text-muted-foreground">{a.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}