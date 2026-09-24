import StatCard from "@/components/command/StatCard";
import CaseQueue from "@/components/command/CaseQueue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, AlertTriangle, Snowflake, Users, Activity } from "lucide-react";
import { cases, suspects, alerts, formatINR } from "@/lib/investigationData";

export default function CommandDashboard() {
  const totalAtRisk = cases.reduce((s, c) => s + c.amount, 0);
  const frozen = cases.filter((c) => c.status === "frozen").length;
  const identified = suspects.filter((s) => s.status === "identified").length;

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Total amount at risk" value={formatINR(totalAtRisk)} sub={`${cases.length} active cases`} tone="red" />
        <StatCard icon={AlertTriangle} label="Priority alerts (24h)" value={alerts.length} sub="2 critical" tone="amber" />
        <StatCard icon={Snowflake} label="Accounts frozen" value={frozen} sub="silent lien active" tone="blue" />
        <StatCard icon={Users} label="Suspects tracked" value={suspects.length} sub={`${identified} identified`} tone="green" />
      </div>

      <CaseQueue />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" /> Live activity feed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b pb-2 last:border-0">
              <span>
                <span className="font-medium">{a.caseId}</span> — {a.message}
              </span>
              <span className="text-muted-foreground">{a.time}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}