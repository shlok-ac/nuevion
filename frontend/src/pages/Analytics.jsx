import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  FileSearch,
  Gauge,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/command/PageHeader";
import { getDashboardData } from "@/lib/api";
import { cn } from "@/lib/utils";

const chartColors = {
  primary: "#2563eb",
  teal: "#0d9488",
  amber: "#d97706",
  red: "#dc2626",
  slate: "#64748b",
};

const caseData = {
  activity: {
    "7": [
      { day: "18 Sep", cases: 18, amount: 1.2 },
      { day: "19 Sep", cases: 23, amount: 1.6 },
      { day: "20 Sep", cases: 20, amount: 1.4 },
      { day: "21 Sep", cases: 31, amount: 2.3 },
      { day: "22 Sep", cases: 28, amount: 1.9 },
      { day: "23 Sep", cases: 36, amount: 2.8 },
      { day: "24 Sep", cases: 42, amount: 3.1 },
    ],
    "30": [
      { day: "26 Aug", cases: 24, amount: 1.8 },
      { day: "31 Aug", cases: 33, amount: 2.1 },
      { day: "5 Sep", cases: 29, amount: 2.4 },
      { day: "10 Sep", cases: 45, amount: 3.2 },
      { day: "15 Sep", cases: 38, amount: 2.7 },
      { day: "20 Sep", cases: 52, amount: 4.1 },
      { day: "24 Sep", cases: 61, amount: 4.6 },
    ],
  },
  regions: [
    { name: "Mumbai", cases: 148, amount: 8.4 },
    { name: "Pune", cases: 116, amount: 10.2 },
    { name: "Nagpur", cases: 84, amount: 5.8 },
    { name: "Nashik", cases: 67, amount: 4.1 },
    { name: "Aurangabad", cases: 49, amount: 2.9 },
  ],
  risk: [
    { name: "Critical", value: 42, color: chartColors.red },
    { name: "High", value: 98, color: chartColors.amber },
    { name: "Medium", value: 176, color: chartColors.primary },
    { name: "Low", value: 148, color: chartColors.slate },
  ],
  status: [
    { name: "Active", value: 124 },
    { name: "Investigating", value: 86 },
    { name: "Escalated", value: 38 },
    { name: "Resolved", value: 216 },
  ],
};

const modelData = {
  performance: [],
  confidence: [],
};

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid hsl(var(--border))",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
  fontSize: "12px",
};

function ChartCard({ title, description, action, children, className }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 border-b bg-muted/20 px-5 py-4">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function KpiCard({ label, value, detail, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: {
      chip: "bg-blue-50 text-blue-600",
      chipHover: "group-hover:bg-blue-100 group-hover:text-blue-700",
      border: "hover:border-blue-500/40",
      shadow: "hover:shadow-[0_16px_32px_-16px_rgb(59_130_246/0.35)]",
      glow: "bg-blue-500/20",
    },
    red: {
      chip: "bg-red-50 text-red-600",
      chipHover: "group-hover:bg-red-100 group-hover:text-red-700",
      border: "hover:border-red-500/40",
      shadow: "hover:shadow-[0_16px_32px_-16px_rgb(239_68_68/0.35)]",
      glow: "bg-red-500/20",
    },
    amber: {
      chip: "bg-amber-50 text-amber-600",
      chipHover: "group-hover:bg-amber-100 group-hover:text-amber-700",
      border: "hover:border-amber-500/40",
      shadow: "hover:shadow-[0_16px_32px_-16px_rgb(245_158_11/0.35)]",
      glow: "bg-amber-500/20",
    },
    teal: {
      chip: "bg-teal-50 text-teal-600",
      chipHover: "group-hover:bg-teal-100 group-hover:text-teal-700",
      border: "hover:border-teal-500/40",
      shadow: "hover:shadow-[0_16px_32px_-16px_rgb(20_184_166/0.35)]",
      glow: "bg-teal-500/20",
    },
  };

  const t = tones[tone] ?? tones.blue;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1",
        t.border,
        t.shadow
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-100",
          t.glow
        )}
      />
      <CardContent className="relative flex items-start justify-between p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
        </div>
        <div
          className={cn(
            "rounded-lg p-2 transition-all duration-300 group-hover:scale-105",
            t.chip,
            t.chipHover
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function CaseAnalytics({ cases, dataLoaded }) {
  const [range, setRange] = useState("7");
  const [metric, setMetric] = useState("cases");
  const [selectedRegion, setSelectedRegion] = useState("Pune");
  const activity = caseData.activity[range];
  const regionMetric = metric === "cases" ? "cases" : "amount";
  const regionUnit = metric === "cases" ? " cases" : " Cr";

  const activeCases = cases.filter((item) => !["resolved", "closed"].includes(String(item.status || "").toLowerCase()));
  const criticalCases = cases.filter((item) =>
    [item.priority, item.risk_level].some((value) => String(value || "").toLowerCase() === "critical")
  );
  const reportedAmount = cases.reduce((sum, item) => sum + Number(item.amount || item.fraud_amount || 0), 0);
  const resolvedCases = cases.filter((item) => String(item.status || "").toLowerCase() === "resolved");
  const insights = useMemo(() => {
    return [
      `${cases.length} live case records are included in the dashboard data.`,
      `The activity, region, risk and status charts below are prototype reference series.`,
      `${selectedRegion} is the currently selected region in that reference chart.`,
    ];
  }, [cases.length, selectedRegion]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active Cases" value={dataLoaded ? activeCases.length : "Not available"} detail="Live cases not marked resolved or closed" icon={FileSearch} />
        <KpiCard label="Critical Cases" value={dataLoaded ? criticalCases.length : "Not available"} detail="Live case priority/risk classification" icon={ShieldAlert} tone="red" />
        <KpiCard label="Fraud Amount" value={dataLoaded ? `₹${reportedAmount.toLocaleString("en-IN")}` : "Not available"} detail="Sum of reported live case amounts" icon={CircleDollarSign} tone="amber" />
        <KpiCard label="Resolved Cases" value={dataLoaded ? resolvedCases.length : "Not available"} detail="Live cases marked resolved" icon={CheckCircle2} tone="teal" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <ChartCard
          title="Case Activity Trend"
          description="Reported activity across the selected period"
          action={
            <div className="flex gap-2">
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="h-8 w-[92px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="h-8 w-[104px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cases">Cases</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={235}>
            <LineChart data={activity} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [metric === "cases" ? value : `₹${value} Cr`, metric === "cases" ? "Cases" : "Amount"]} />
              <Line type="monotone" dataKey={metric} stroke={chartColors.primary} strokeWidth={2.5} dot={{ r: 3, fill: chartColors.primary }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fraud by Region" description="Select a region to focus insights">
          <ResponsiveContainer width="100%" height={235}>
            <BarChart data={caseData.regions} layout="vertical" margin={{ top: 0, right: 10, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [metric === "cases" ? value : `₹${value} Cr`, metric === "cases" ? "Cases" : "Amount"]} />
              <Bar dataKey={regionMetric} radius={[0, 4, 4, 0]} onClick={(entry) => setSelectedRegion(entry.name)} cursor="pointer">
                {caseData.regions.map((region) => (
                  <Cell key={region.name} fill={region.name === selectedRegion ? chartColors.primary : "#bfdbfe"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-xs text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selectedRegion}</span> · {caseData.regions.find((region) => region.name === selectedRegion)[regionMetric]}{regionUnit}
          </p>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
        <ChartCard title="Case Risk Distribution" description="Current portfolio risk mix">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={caseData.risk} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={3}>
                {caseData.risk.map((item) => <Cell key={item.name} fill={item.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value, name]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Case Status" description="Cases by workflow stage">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={caseData.status} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Cases" barSize={28} fill={chartColors.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card className="bg-emerald-50/40">
          <CardHeader className="px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-950"><TrendingUp className="h-4 w-4" /> Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {insights.map((insight, index) => (
              <div key={insight} className="flex gap-3 text-xs leading-relaxed text-emerald-950/85">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-[10px] font-medium text-emerald-950">{index + 1}</span>
                <span>{insight}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="border-blue-100 bg-blue-50/40">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-sm font-medium">Conclusion</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
          Case activity is trending upward, with critical cases requiring continued escalation
          attention. {selectedRegion} is the current focus region, while the majority of the
          portfolio remains in medium or low risk categories.
        </CardContent>
      </Card>
    </div>
  );
}

function ModelAnalytics() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Model Accuracy" value="Not available" detail="No verified outcome evaluation data" icon={Gauge} />
        <KpiCard label="Precision" value="Not available" detail="No verified outcome evaluation data" icon={Target} tone="teal" />
        <KpiCard label="Recall" value="Not available" detail="No verified outcome evaluation data" icon={Activity} tone="amber" />
        <KpiCard label="F1 Score" value="Not available" detail="No verified outcome evaluation data" icon={BrainCircuit} tone="blue" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <ChartCard title="Prediction Performance" description="No verified predicted-versus-actual outcome records are available">
          <ResponsiveContainer width="100%" height={235}>
            <LineChart data={modelData.performance} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              <Line type="monotone" dataKey="predicted" name="Predicted" stroke={chartColors.primary} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke={chartColors.teal} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Confusion Matrix" description="No verified outcome evaluation data">
          <div className="grid grid-cols-[28px_70px_1fr_1fr] gap-2 text-center text-xs">
            <div className="row-span-3 row-start-2 flex items-center justify-center font-medium text-muted-foreground [writing-mode:vertical-rl] rotate-180">
              Predicted
            </div>
            <div className="col-start-3 col-span-2 row-start-1 pb-1 font-medium text-muted-foreground">Actual</div>
            <div className="col-start-3 row-start-2 font-medium text-muted-foreground">Fraud</div>
            <div className="col-start-4 row-start-2 font-medium text-muted-foreground">Normal</div>
            <div className="col-start-2 row-start-3 flex items-center justify-end pr-2 font-medium text-muted-foreground">Fraud</div>
            <div className="col-start-3 row-start-3 rounded-lg bg-teal-50 p-3 text-teal-800"><p className="text-lg font-semibold">—</p><p>TP · unavailable</p></div>
            <div className="col-start-4 row-start-3 rounded-lg bg-red-50 p-3 text-red-700"><p className="text-lg font-semibold">—</p><p>FP · unavailable</p></div>
            <div className="col-start-2 row-start-4 flex items-center justify-end pr-2 font-medium text-muted-foreground">Normal</div>
            <div className="col-start-3 row-start-4 rounded-lg bg-amber-50 p-3 text-amber-800"><p className="text-lg font-semibold">—</p><p>FN · unavailable</p></div>
            <div className="col-start-4 row-start-4 rounded-lg bg-blue-50 p-3 text-blue-800"><p className="text-lg font-semibold">—</p><p>TN · unavailable</p></div>
          </div>
        </ChartCard>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.2fr]">
        <ChartCard title="Model Confidence Distribution" description="No live confidence-distribution endpoint is available">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={modelData.confidence} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, "Predictions"]} />
              <Bar dataKey="value" name="Predictions" barSize={30} fill={chartColors.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="space-y-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between border-b bg-muted/20 px-5 py-4">
              <div>
                <CardTitle className="text-sm font-medium">Model performance summary</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">No verified evaluation against case outcomes is available</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails((visible) => !visible)}
                aria-expanded={showDetails}
                aria-controls="model-performance-details"
              >
                {showDetails ? "Hide Details" : "View Details"}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Current accuracy</p><p className="mt-1 text-sm font-semibold">Not available</p></div>
              <div><p className="text-xs text-muted-foreground">High-confidence predictions</p><p className="mt-1 text-sm font-semibold">Not available</p></div>
              <div><p className="text-xs text-muted-foreground">False-positive rate</p><p className="mt-1 text-sm font-semibold">Not available</p></div>
              <div><p className="text-xs text-muted-foreground">Last model evaluation</p><p className="mt-1 text-sm font-semibold">Not available</p></div>
            </CardContent>
          </Card>
          {showDetails && (
            <Card id="model-performance-details" className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <CardHeader className="flex-row items-center justify-between border-b bg-muted/20 px-5 py-4">
                <div>
                  <CardTitle className="text-sm font-medium">Evaluation details</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Verified outcome records are not available</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 p-5 text-xs text-muted-foreground">
                <div className="flex items-start justify-between gap-4">
                  <span>Evaluation sample</span>
                  <span className="font-medium text-foreground">Not available</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Fraud cases correctly identified</span>
                  <span className="font-medium text-foreground">Not available</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>High-confidence threshold</span>
                  <span className="font-medium text-foreground">Not available</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Recommended review</span>
                  <span className="font-medium text-foreground">Not available</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Card className="border-blue-100 bg-blue-50/40">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-sm font-medium">Conclusion</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
          Model-performance conclusions cannot be calculated without verified outcome labels. ATM risk inference is not a complaint-fraud outcome evaluation.
        </CardContent>
      </Card>
    </div>
  );
}

export default function Analytics() {
  const [section, setSection] = useState("case");
  const [cases, setCases] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getDashboardData()
      .then((data) => {
        if (active) {
          setCases(Array.isArray(data.cases) ? data.cases : []);
          setDataLoaded(true);
          setLoadError("");
        }
      })
      .catch((error) => {
        if (active) setLoadError(error.message || "Live analytics data is unavailable.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Analytics"
        description="Live case KPIs with clearly identified prototype charts; verified model-evaluation metrics are unavailable."
        actions={
          <Tabs value={section} onValueChange={setSection}>
            <TabsList className="h-10 rounded-lg border bg-muted/80 p-1 shadow-sm">
              <TabsTrigger value="case" className="gap-2 px-3 text-xs">
                <FileSearch className="h-3.5 w-3.5" /> Case Analytics
              </TabsTrigger>
              <TabsTrigger value="model" className="gap-2 px-3 text-xs">
                <BrainCircuit className="h-3.5 w-3.5" /> ML Model Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      <Card className="border-amber-500/30 bg-amber-500/10">
        <CardContent className="p-4 text-sm text-amber-950">
          Case KPI cards use live PostgreSQL case records. The remaining case charts are bundled prototype/reference series. No measured model-performance metrics are available.
        </CardContent>
      </Card>
      {loadError && <p role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">Live case KPIs unavailable: {loadError}</p>}
      <div key={section} className="animate-in fade-in-0 duration-300">
        {section === "case" ? <CaseAnalytics cases={cases} dataLoaded={dataLoaded} /> : <ModelAnalytics />}
      </div>
    </div>
  );
}
