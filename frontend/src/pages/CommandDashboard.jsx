import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/command/StatCard";
import CaseQueue from "@/components/command/CaseQueue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, AlertTriangle, Snowflake, Users, Activity } from "lucide-react";
import { formatINR } from "@/lib/investigationData";
import { getDashboardData, getSystemHealth } from "@/lib/api";

export default function CommandDashboard() {
  const [dashboardData, setDashboardData] = useState({
    cases: [],
    alerts: [],
    complaints: [],
    atms: [],
  });
  const [dashboardError, setDashboardError] = useState("");
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const data = await getDashboardData();
        if (isMounted) {
          setDashboardData({
            complaints: data.complaints || [],
            cases: data.cases || [],
            atms: data.atms || [],
            alerts: data.alerts || [],
          });
          setDashboardError("");
        }
      } catch (error) {
        if (isMounted) {
          setDashboardError(error.message || "Dashboard data is unavailable.");
        }
      }
    };

    const loadHealth = async () => {
      try {
        const data = await getSystemHealth();
        if (isMounted) setHealth(data);
      } catch {
        if (isMounted) {
          setHealth({
            status: "unavailable",
            services: { backend: "unavailable" },
          });
        }
      }
    };

    loadDashboard();
    loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  const cases = dashboardData.cases;
  const alerts = dashboardData.alerts;

  const totalAtRisk = useMemo(() => cases.reduce((sum, item) => sum + Number(item.amount || item.fraud_amount || 0), 0), [cases]);
  const frozen = useMemo(() => cases.filter((item) => String(item.status || "").toLowerCase() === "frozen").length, [cases]);
  const criticalAlerts = alerts.filter((alert) => String(alert.severity || "").toLowerCase() === "critical").length;
  const services = health?.services || {};
  const serviceState = (name) => services[name] || "not_checked";

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardContent className="p-4 text-sm">
          <p className={`flex items-center gap-2 text-base font-semibold ${health?.status === "ready" ? "text-emerald-600" : "text-amber-600"}`}>
            <span aria-hidden="true" className="w-4 shrink-0">●</span>
            {health?.status === "ready" ? "Data systems operational" : "Some data systems are unavailable"}
          </p>
          <p className="mt-1 pl-6 text-muted-foreground">Last sync: {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</p>
          <div className="mt-3 grid gap-2 text-foreground sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Backend", serviceState("backend")],
              ["PostgreSQL", serviceState("postgres")],
              ["Neo4j", serviceState("neo4j")],
              ["NLP / offline ML", "not_checked"],
            ].map(([system, status]) => (
              <div
                key={system}
                className="group flex min-h-8 items-center justify-between rounded-md border bg-background px-3 py-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-accent hover:shadow-[0_8px_20px_-10px_rgb(15_23_42/0.2)]"
              >
                <span>{system}</span>
                <span className={status === "ok" ? "text-emerald-600" : "text-amber-600"}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {dashboardError && (
        <p role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
          Dashboard data unavailable: {dashboardError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Total amount at risk" value={formatINR(totalAtRisk)} sub={`${cases.length} active cases`} tone="red" />
        <StatCard icon={AlertTriangle} label="Stored alerts" value={alerts.length} sub={`${criticalAlerts} critical · no complaint-triggered alerts`} tone="amber" />
        <StatCard icon={Snowflake} label="Cases marked frozen" value={frozen} sub="Case status only; no bank confirmation" tone="blue" />
        <StatCard icon={Users} label="Suspects tracked" value="—" sub="No suspects API is connected" tone="green" />
      </div>

      <CaseQueue cases={cases} alerts={alerts} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Activity className="h-5 w-5 shrink-0" /> Live activity feed
          </CardTitle>
        </CardHeader>
        <div aria-hidden="true" className="mx-6 h-px bg-blue-500/30" />
        <CardContent className="space-y-2 pt-5 text-sm">
          {alerts.map((a) => (
            <div key={a.id || a.caseId || a.message} className="flex items-center justify-between border-b pb-2 last:border-0">
              <span>
                <span className="font-medium">{a.caseId || a.case_id || "Case"}</span> — {a.message || a.alert_type || "System update"}
              </span>
              <span className="text-muted-foreground">{a.time || a.created_at || "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}