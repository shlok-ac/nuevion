import { useMemo, useState } from "react";
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
import { alerts, atmRankings, callCity, cases, formatINR, mlMetrics } from "@/lib/investigationData";
import { cn } from "@/lib/utils";

const chartColors = {
  primary: "#2563eb",
  teal: "#0d9488",
  amber: "#d97706",
  red: "#dc2626",
  slate: "#64748b",
};

const CRORE = 1e7;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Rupees rendered in the crore unit the charts are scaled to. */
const inCrores = (n) => Number(n || 0) / CRORE;
const crores = (n) => `₹${inCrores(n).toFixed(2)} Cr`;

const dayKey = (iso) => String(iso || "").slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * The city a case is reported from. `callCity` is keyed by case number; a case filed
 * after the last sync falls back to the city part of its branch ("Area, City").
 */
const cityOf = (c) =>
  callCity[c.id] || String(c.branch || "").split(",").pop().trim() || "Unknown";

const titleCase = (s) =>
  String(s || "").replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

const STATUS_LABELS = {
  open: "Open",
  active: "Active",
  under_investigation: "Investigating",
  monitoring: "Monitoring",
  frozen: "Frozen",
  resolved: "Resolved",
};

const PRIORITY_META = [
  { name: "Critical", color: chartColors.red },
  { name: "High", color: chartColors.amber },
  { name: "Medium", color: chartColors.primary },
  { name: "Low", color: chartColors.slate },
];

const pct = (v) => `${(Number(v || 0) * 100).toFixed(1)}%`;

/** Every scored ATM the model has written a confidence for, across all regions. */
const allAtms = Object.values(atmRankings).flat();

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

function CaseAnalytics() {
  const [range, setRange] = useState("7");
  const [metric, setMetric] = useState("cases");
  const [pickedRegion, setPickedRegion] = useState(null);
  const days = Number(range) === 30 ? 30 : 7;
  const regionMetric = metric === "cases" ? "cases" : "amount";
  const regionUnit = metric === "cases" ? " cases" : " Cr";

  /*
   * Daily filing counts. The window is anchored on the newest filed date rather than
   * today, so the chart always has data however stale the last sync is.
   */
  const { activity, windowCases, windowAmount } = useMemo(() => {
    const dates = cases.map((c) => dayKey(c.filedDate)).filter(Boolean).sort();
    if (!dates.length) return { activity: [], windowCases: 0, windowAmount: 0 };
    const end = dates[dates.length - 1];
    const keys = Array.from({ length: days }, (_, i) => addDays(end, i - days + 1));
    const buckets = new Map(keys.map((k) => [k, { count: 0, amount: 0 }]));
    let count = 0;
    let amount = 0;
    for (const c of cases) {
      const bucket = buckets.get(dayKey(c.filedDate));
      if (!bucket) continue;
      bucket.count += 1;
      bucket.amount += Number(c.amount) || 0;
      count += 1;
      amount += Number(c.amount) || 0;
    }
    const rows = keys.map((k) => {
      const b = buckets.get(k);
      const d = new Date(`${k}T00:00:00Z`);
      return {
        day: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
        cases: b.count,
        amount: Number(inCrores(b.amount).toFixed(2)),
      };
    });
    return { activity: rows, windowCases: count, windowAmount: amount };
  }, [days]);

  /** Cases and reported amount per city, largest first. */
  const regionRows = useMemo(() => {
    const byCity = new Map();
    for (const c of cases) {
      const name = cityOf(c);
      const row = byCity.get(name) || { name, cases: 0, amount: 0 };
      row.cases += 1;
      row.amount += Number(c.amount) || 0;
      byCity.set(name, row);
    }
    return [...byCity.values()]
      .map((r) => ({ ...r, amount: Number(inCrores(r.amount).toFixed(2)) }))
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 7);
  }, []);

  const focusRegion = regionRows.find((r) => r.name === pickedRegion) || regionRows[0] || null;

  const riskMix = useMemo(
    () =>
      PRIORITY_META.map((meta) => ({
        ...meta,
        value: cases.filter((c) => String(c.priority).toLowerCase() === meta.name.toLowerCase())
          .length,
      })),
    []
  );

  const statusMix = useMemo(() => {
    const counts = new Map();
    for (const c of cases) {
      const key = String(c.status || "unknown");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, value]) => ({ name: STATUS_LABELS[key] || titleCase(key), value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const totals = useMemo(() => {
    const total = cases.length;
    const resolved = cases.filter((c) => String(c.status) === "resolved").length;
    const critical = cases.filter(
      (c) => String(c.priority).toLowerCase() === "critical"
    ).length;
    const amount = cases.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    return { total, resolved, critical, amount, open: total - resolved };
  }, []);

  const insights = useMemo(() => {
    const top = regionRows[0];
    const lines = [];
    const openCritical = cases.filter(
      (c) => String(c.priority).toLowerCase() === "critical" && String(c.status) !== "resolved"
    ).length;
    if (totals.open) {
      lines.push(
        `Critical cases are ${((openCritical / totals.open) * 100).toFixed(1)}% of the ${totals.open} cases still open.`
      );
    }
    if (top) {
      lines.push(`${top.name} has the most reports at ${top.cases} cases worth ₹${top.amount} Cr.`);
    }
    lines.push(
      `${windowCases} ${windowCases === 1 ? "case was" : "cases were"} filed in the last ${days} days, averaging ${windowCases ? formatINR(Math.round(windowAmount / windowCases)) : "₹0"}.`
    );
    return lines;
  }, [regionRows, totals, windowCases, windowAmount, days]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open Cases"
          value={String(totals.open)}
          detail={`${totals.total} cases on record`}
          icon={FileSearch}
        />
        <KpiCard
          label="Critical Cases"
          value={String(totals.critical)}
          detail={`${(
            cases.filter(
              (c) =>
                String(c.priority).toLowerCase() === "critical" &&
                String(c.status) !== "resolved"
            ).length
          )} still awaiting action`}
          icon={ShieldAlert}
          tone="red"
        />
        <KpiCard
          label="Reported Amount"
          value={crores(totals.amount)}
          detail={`${crores(windowAmount)} in the last ${days} days`}
          icon={CircleDollarSign}
          tone="amber"
        />
        <KpiCard
          label="Resolved Cases"
          value={String(totals.resolved)}
          detail={`${totals.total ? ((totals.resolved / totals.total) * 100).toFixed(1) : "0"}% resolution rate`}
          icon={CheckCircle2}
          tone="teal"
        />
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
            <BarChart data={regionRows} layout="vertical" margin={{ top: 0, right: 10, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [metric === "cases" ? value : `₹${value} Cr`, metric === "cases" ? "Cases" : "Amount"]} />
              <Bar dataKey={regionMetric} radius={[0, 4, 4, 0]} onClick={(entry) => setPickedRegion(entry.name)} cursor="pointer">
                {regionRows.map((region) => (
                  <Cell key={region.name} fill={region.name === focusRegion?.name ? chartColors.primary : "#bfdbfe"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-xs text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{focusRegion?.name ?? "—"}</span> · {focusRegion ? `${focusRegion[regionMetric]}${regionUnit}` : "no data"}
          </p>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
        <ChartCard title="Case Risk Distribution" description="Current portfolio risk mix">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={riskMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={3}>
                {riskMix.map((item) => <Cell key={item.name} fill={item.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value, name]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Case Status" description="Cases by workflow stage">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={statusMix} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
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
          {windowCases} {windowCases === 1 ? "case was" : "cases were"} filed in the last {days} days
          totalling {crores(windowAmount)}.{" "}
          {focusRegion ? `${focusRegion.name} is the current focus region with ${focusRegion.cases} cases, ` : ""}
          and {pct(riskMix.filter((r) => r.name !== "Low" && r.value).reduce((s, r) => s + r.value, 0) / (totals.total || 1))}{" "}
          of the portfolio sits above low priority.
        </CardContent>
      </Card>
    </div>
  );
}

function ModelAnalytics() {
  const [showDetails, setShowDetails] = useState(false);
  const m = mlMetrics;

  /*
   * Confidence histogram over every ATM the model has scored. These are the live
   * per-ATM confidences the watchlist already renders, not a stored distribution.
   */
  const confidenceBands = useMemo(() => {
    const bands = [
      { range: "0–20%", lo: 0, hi: 20, value: 0 },
      { range: "20–40%", lo: 20, hi: 40, value: 0 },
      { range: "40–60%", lo: 40, hi: 60, value: 0 },
      { range: "60–80%", lo: 60, hi: 80, value: 0 },
      { range: "80–100%", lo: 80, hi: 100.0001, value: 0 },
    ];
    for (const atm of allAtms) {
      const c = Number(atm.confidence);
      const band = bands.find((b) => Number.isFinite(c) && c >= b.lo && c < b.hi);
      if (band) band.value += 1;
    }
    return bands;
  }, []);

  const highConfidence = useMemo(
    () => allAtms.filter((a) => Number(a.confidence) >= 80).length,
    []
  );

  if (!m?.available) {
    return (
      <Card>
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-sm font-medium">ML Model Analytics</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 text-sm text-muted-foreground">
          No completed model evaluation is available
          {m?.reason ? `: ${m.reason}` : ""}. Run{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run sync</code> in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">backend</code> to record one.
          {allAtms.length > 0 && (
            <p className="mt-3">
              The live model has still scored {allAtms.length} ATMs; only the held-out
              evaluation is missing.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const matrix = m.matrix;
  const classes = matrix.classes;
  const fpTotal = matrix.counts.reduce((s, c) => s + c.fp, 0);
  const fnTotal = matrix.counts.reduce((s, c) => s + c.fn, 0);
  const perClass = m.perClass.map((row) => ({
    name: row.class,
    precision: Number((row.precision * 100).toFixed(1)),
    recall: Number((row.recall * 100).toFixed(1)),
    f1: Number((row.f1 * 100).toFixed(1)),
    support: row.support,
  }));
  const importance = Object.entries(m.featureImportance || {}).sort((a, b) => b[1] - a[1]);
  const evaluatedOn = m.evaluatedAt ? String(m.evaluatedAt).slice(0, 10) : "—";

  /*
   * Row = actual class, column = predicted class. On the diagonal a sample was
   * classified correctly (true positive for that class); off it, the sample truly
   * belonged to the row class but was predicted as the column class, which is a
   * false negative of the predicted class.
   */
  const cellFor = (actualIndex, predictedIndex) => {
    const hit = actualIndex === predictedIndex;
    return {
      value: hit ? matrix.counts[actualIndex].tp : matrix.counts[predictedIndex].fn,
      label: hit ? "correct" : "misclassified",
      tone: hit ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800",
    };
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Model Accuracy"
          value={pct(m.accuracy)}
          detail={`${matrix.total}-case held-out test split`}
          icon={Gauge}
        />
        <KpiCard
          label="Precision"
          value={pct(m.macroPrecision)}
          detail={`${fpTotal} false positives across all classes`}
          icon={Target}
          tone="teal"
        />
        <KpiCard
          label="Recall"
          value={pct(m.macroRecall)}
          detail={`${fnTotal} fraud cases missed`}
          icon={Activity}
          tone="amber"
        />
        <KpiCard
          label="F1 Score"
          value={pct(m.macroF1)}
          detail="Macro average across classes"
          icon={BrainCircuit}
          tone="blue"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <ChartCard
          title="Per-Class Performance"
          description={`Measured on the ${matrix.total}-case held-out test split`}
        >
          <ResponsiveContainer width="100%" height={235}>
            <BarChart data={perClass} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis unit="%" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="precision" name="Precision" fill={chartColors.primary} radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="recall" name="Recall" fill={chartColors.teal} radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="f1" name="F1" fill={chartColors.amber} radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-xs text-muted-foreground">
            Support: {perClass.map((c) => `${c.name} ${c.support}`).join(" · ")}
          </p>
        </ChartCard>

        <ChartCard
          title="Confusion Matrix"
          description={`Evaluation set: ${matrix.total} held-out predictions`}
        >
          <div className="space-y-1.5">
            <div
              className="grid gap-1.5 text-center text-[10px] font-medium text-muted-foreground"
              style={{ gridTemplateColumns: `72px repeat(${classes.length}, minmax(0, 1fr))` }}
            >
              <span />
              {classes.map((c) => (
                <span key={c}>Pred {c}</span>
              ))}
            </div>
            {classes.map((actual, i) => (
              <div
                key={actual}
                className="grid gap-1.5 text-center text-[11px]"
                style={{ gridTemplateColumns: `72px repeat(${classes.length}, minmax(0, 1fr))` }}
              >
                <span className="flex items-center justify-end pr-1 font-medium text-muted-foreground">
                  Actual {actual}
                </span>
                {classes.map((_predicted, j) => {
                  const cell = cellFor(i, j);
                  return (
                    <div key={j} className={cn("rounded-lg px-1 py-2", cell.tone)}>
                      <p className="text-sm font-semibold">{cell.value}</p>
                      <p className="text-[10px] opacity-75">{cell.label}</p>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {!matrix.consistent && (
            <p className="mt-2 text-[11px] text-amber-700">
              Reconstructed from per-class scores; its diagonal does not reproduce the
              recorded accuracy of {pct(m.accuracy)}.
            </p>
          )}
        </ChartCard>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.2fr]">
        <ChartCard
          title="Model Confidence Distribution"
          description={`Live per-ATM confidence across ${allAtms.length} scored ATMs`}
        >
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={confidenceBands} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
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
                <p className="mt-1 text-xs text-muted-foreground">Latest evaluation against verified case outcomes</p>
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
              <div><p className="text-xs text-muted-foreground">Current accuracy</p><p className="mt-1 text-sm font-semibold">{pct(m.accuracy)}</p></div>
              <div><p className="text-xs text-muted-foreground">High-confidence ATMs</p><p className="mt-1 text-sm font-semibold">{allAtms.length ? pct(highConfidence / allAtms.length) : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">False-positive rate</p><p className="mt-1 text-sm font-semibold">{matrix.total ? pct(fpTotal / matrix.total) : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Last model evaluation</p><p className="mt-1 text-sm font-semibold">{evaluatedOn}</p></div>
            </CardContent>
          </Card>
          {showDetails && (
            <Card id="model-performance-details" className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <CardHeader className="flex-row items-center justify-between border-b bg-muted/20 px-5 py-4">
                <div>
                  <CardTitle className="text-sm font-medium">Evaluation details</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">How the current model is performing on verified outcomes</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 p-5 text-xs text-muted-foreground">
                <div className="flex items-start justify-between gap-4">
                  <span>Evaluation sample</span>
                  <span className="font-medium text-foreground">{matrix.total} held-out predictions</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Model version</span>
                  <span className="font-medium text-foreground">{m.modelVersion || "—"}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Classified correctly</span>
                  <span className="font-medium text-foreground">
                    {matrix.counts.reduce((s, c) => s + c.tp, 0)} of {matrix.total}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Most important feature</span>
                  <span className="font-medium text-foreground">
                    {importance.length ? `${importance[0][0]} (${(importance[0][1] * 100).toFixed(1)}%)` : "—"}
                  </span>
                </div>
                <div>
                  <p className="mb-1.5">Feature importance</p>
                  <div className="space-y-1">
                    {importance.map(([name, value]) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="w-40 shrink-0 truncate">{name.replace(/_/g, " ")}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(2, value * 100)}%` }}
                          />
                        </span>
                        <span className="w-12 shrink-0 text-right font-medium text-foreground">
                          {(value * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {m.notes && (
                  <p className="rounded-md border border-amber-200 bg-amber-50/60 p-2 text-[11px] text-amber-900">
                    {m.notes}
                  </p>
                )}
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
          The {m.algorithm || "model"} ({m.modelVersion || "unversioned"}) classified{" "}
          {matrix.counts.reduce((s, c) => s + c.tp, 0)} of {matrix.total} held-out cases
          correctly ({pct(m.accuracy)}), with the weakest recall on{" "}
          {perClass.length
            ? perClass.reduce((worst, c) => (c.recall < worst.recall ? c : worst)).name
            : "—"}{" "}
          risk. {alerts.length} alerts are currently raised across the live ATM network.
          {m.notes
            ? " These figures describe fit to the current dataset, not real-world fraud performance."
            : ""}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Analytics() {
  const [section, setSection] = useState("case");

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Analytics"
        description="Monitor case activity and model performance."
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
      <div key={section} className="animate-in fade-in-0 duration-300">
        {section === "case" ? <CaseAnalytics /> : <ModelAnalytics />}
      </div>
    </div>
  );
}
