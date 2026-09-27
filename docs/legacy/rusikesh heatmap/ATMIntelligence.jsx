import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  Bell,
  BrainCircuit,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Clock3,
  FileLock2,
  FileText,
  MapPin,
  ShieldAlert,
  UserCheck,
  X,
  Eye,
  Info,
  Landmark,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CaseSelector from "@/components/command/CaseSelector";
import OperationalActionDialog, { widenWindow } from "@/components/command/OperationalActionDialog";
import PageHeader from "@/components/command/PageHeader";
import CallerLocationAtmRiskZone from "@/components/CallerLocationAtmRiskZone";
import { getActionStatusLabel } from "@/lib/caseActionStore";
import { useCaseActions } from "@/hooks/useCaseActions";
import { cases, formatINR, muleChains, suspects } from "@/lib/investigationData";
import { cn } from "@/lib/utils";

function flattenChain(node, acc = []) {
  acc.push(node);
  if (node.children) {
    node.children.forEach((child) => flattenChain(child, acc));
  }
  return acc;
}

const riskTone = {
  critical: "bg-red-500/10 text-red-600 border-red-200",
  high: "bg-orange-500/10 text-orange-600 border-orange-200",
  medium: "bg-amber-500/10 text-amber-700 border-amber-200",
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

const regionScores = [
  {
    id: "maharashtra-pune",
    name: "Pune",
    confidence: 96.8,
    matchedAtms: 23,
    risk: "Very high",
    callOrigin: "Western India / Pune caller pattern",
    reasons: [
      "Historical mule freeze pattern aligns with Pune ATM corridor activity and nearby withdrawals.",
      "The suspected caller location and victim coordination pattern both map to the Pune metro region.",
      "Multiple high-volume cash-outs were observed from ICICI and Axis machines in the same corridor window.",
    ],
    markers: [
      { x: 38, y: 58 },
      { x: 50, y: 46 },
      { x: 68, y: 63 },
    ],
  },
  {
    id: "delhi-ncr",
    name: "Delhi NCR",
    confidence: 92.4,
    matchedAtms: 18,
    risk: "High",
    callOrigin: "North India / NCR spoofing pattern",
    reasons: [
      "The scammer call origin and mule movement history cluster around the NCR spread pattern.",
      "This region shows repeated ATM outflows in urban-population-heavy corridors with fast conversion behavior.",
      "The model identified a second-stage link from fake-loan and SIM-swap activity across Delhi and Noida.",
    ],
    markers: [
      { x: 53, y: 42 },
      { x: 58, y: 48 },
      { x: 62, y: 54 },
    ],
  },
  {
    id: "mumbai-west",
    name: "Mumbai West",
    confidence: 87.1,
    matchedAtms: 15,
    risk: "Elevated",
    callOrigin: "Western India / Mumbai contact pattern",
    reasons: [
      "Mumbai-linked mule activity is consistent with historical freeze zones and ATM cash-out bursts.",
      "The scammer's call pattern overlaps with Mumbai-based victim tracing and account access attempts.",
      "A former linked case showed similar conversion timing around west-suburban banking hubs.",
    ],
    markers: [
      { x: 36, y: 42 },
      { x: 42, y: 50 },
      { x: 48, y: 60 },
    ],
  },
  {
    id: "hyderabad-south",
    name: "Hyderabad South",
    confidence: 74.3,
    matchedAtms: 9,
    risk: "Moderate",
    callOrigin: "South India / Hyderabad contact pattern",
    reasons: [
      "This region scored lower but still shows a repeated cash-out pattern tied to a historical mule network.",
      "The call origin and bank activity trend reflect a weaker but still plausible south-zone conversion route.",
      "ATM clusters here match lower-frequency historical withdrawals and a shorter conversion window.",
    ],
    markers: [
      { x: 58, y: 68 },
      { x: 64, y: 72 },
      { x: 72, y: 64 },
    ],
  },
  {
    id: "bengaluru-east",
    name: "Bengaluru East",
    confidence: 68.9,
    matchedAtms: 7,
    risk: "Moderate",
    callOrigin: "South India / Bengaluru contact pattern",
    reasons: [
      "Historical mule-account activity shows a smaller but recurring cash-out cluster in eastern Bengaluru.",
      "The caller's location has a moderate overlap with this region's transaction and device signals.",
      "ATM usage is less concentrated than the higher-ranked regions but remains consistent with the model's secondary route.",
    ],
  },
  {
    id: "kolkata-central",
    name: "Kolkata Central",
    confidence: 61.5,
    matchedAtms: 5,
    risk: "Watch",
    callOrigin: "East India / Kolkata call-origin pattern",
    reasons: [
      "The region has a limited historical match to the mule-account network under investigation.",
      "Call-location signals produce a weaker east-zone correlation than the leading predictions.",
      "A small number of ATM corridors show timing similarities with the suspected cash-out sequence.",
    ],
  },
  {
    id: "jaipur-north",
    name: "Jaipur North",
    confidence: 57.2,
    matchedAtms: 4,
    risk: "Watch",
    callOrigin: "North-west India / Jaipur contact pattern",
    reasons: [
      "The model found a low-frequency historical relationship between the account and Jaipur-area ATMs.",
      "Caller-location evidence provides a small supporting signal for this north-west region.",
      "The predicted ATM activity is sparse and therefore carries lower confidence.",
    ],
  },
];

const atmRankings = {
  "maharashtra-pune": [
    { rank: 1, atm: "ATM-001", location: "FC Road", riskScore: 94, linkedCases: 12, fraudAmount: "₹4.8L", predictedWindow: "20:00–22:00", status: "Critical" },
    { rank: 2, atm: "ATM-014", location: "Andheri East", riskScore: 89, linkedCases: 10, fraudAmount: "₹3.6L", predictedWindow: "21:00–23:00", status: "High" },
    { rank: 3, atm: "ATM-021", location: "Camp Area", riskScore: 86, linkedCases: 8, fraudAmount: "₹2.9L", predictedWindow: "22:00–00:00", status: "High" },
    { rank: 4, atm: "ATM-037", location: "Hinjewadi Phase 1", riskScore: 81, linkedCases: 6, fraudAmount: "₹2.1L", predictedWindow: "19:00–21:00", status: "Elevated" },
    { rank: 5, atm: "ATM-042", location: "Kothrud Depot", riskScore: 78, linkedCases: 5, fraudAmount: "₹1.8L", predictedWindow: "20:00–22:00", status: "Elevated" },
    { rank: 6, atm: "ATM-056", location: "Viman Nagar", riskScore: 76, linkedCases: 5, fraudAmount: "₹1.6L", predictedWindow: "21:00–23:00", status: "Elevated" },
    { rank: 7, atm: "ATM-063", location: "Kharadi Bypass", riskScore: 73, linkedCases: 4, fraudAmount: "₹1.4L", predictedWindow: "22:00–00:00", status: "Moderate" },
    { rank: 8, atm: "ATM-071", location: "Shivajinagar", riskScore: 70, linkedCases: 4, fraudAmount: "₹1.2L", predictedWindow: "19:00–21:00", status: "Moderate" },
    { rank: 9, atm: "ATM-084", location: "Wakad Bridge", riskScore: 68, linkedCases: 3, fraudAmount: "₹1.1L", predictedWindow: "20:00–22:00", status: "Moderate" },
    { rank: 10, atm: "ATM-096", location: "Baner Road", riskScore: 65, linkedCases: 3, fraudAmount: "₹0.9L", predictedWindow: "21:00–23:00", status: "Moderate" },
    { rank: 11, atm: "ATM-103", location: "Pimpri Market", riskScore: 62, linkedCases: 2, fraudAmount: "₹0.8L", predictedWindow: "22:00–00:00", status: "Watch" },
    { rank: 12, atm: "ATM-118", location: "Swargate Terminal", riskScore: 59, linkedCases: 2, fraudAmount: "₹0.6L", predictedWindow: "19:00–21:00", status: "Watch" },
    { rank: 13, atm: "ATM-124", location: "Hadapsar Gadital", riskScore: 56, linkedCases: 1, fraudAmount: "₹0.5L", predictedWindow: "20:00–22:00", status: "Watch" },
  ],
  "delhi-ncr": [
    { rank: 1, atm: "ATM-108", location: "Noida Sector 18", riskScore: 93, linkedCases: 11, fraudAmount: "₹4.2L", predictedWindow: "21:00–23:00", status: "Critical" },
    { rank: 2, atm: "ATM-116", location: "Lajpat Nagar", riskScore: 88, linkedCases: 9, fraudAmount: "₹3.1L", predictedWindow: "20:00–22:00", status: "High" },
    { rank: 3, atm: "ATM-127", location: "Dwarka Sector 10", riskScore: 83, linkedCases: 7, fraudAmount: "₹2.4L", predictedWindow: "22:00–00:00", status: "High" },
  ],
  "mumbai-west": [
    { rank: 1, atm: "ATM-203", location: "Andheri West", riskScore: 91, linkedCases: 10, fraudAmount: "₹3.6L", predictedWindow: "21:00–23:00", status: "Critical" },
    { rank: 2, atm: "ATM-214", location: "Bandra East", riskScore: 85, linkedCases: 8, fraudAmount: "₹2.8L", predictedWindow: "20:00–22:00", status: "High" },
    { rank: 3, atm: "ATM-229", location: "Goregaon Link Road", riskScore: 79, linkedCases: 6, fraudAmount: "₹2.0L", predictedWindow: "22:00–00:00", status: "Elevated" },
  ],
};

const defaultAtmRankings = [
  { rank: 1, atm: "ATM-301", location: "Central Business District", riskScore: 78, linkedCases: 6, fraudAmount: "₹1.8L", predictedWindow: "20:00–22:00", status: "Elevated" },
  { rank: 2, atm: "ATM-314", location: "Market Road", riskScore: 72, linkedCases: 4, fraudAmount: "₹1.2L", predictedWindow: "21:00–23:00", status: "Moderate" },
  { rank: 3, atm: "ATM-326", location: "Railway Station Road", riskScore: 68, linkedCases: 3, fraudAmount: "₹0.9L", predictedWindow: "22:00–00:00", status: "Moderate" },
];

// Each entry carries the workflow metadata used by the confirmation panel, the
// persisted record and the activity log, so the card, the dialog and the
// Case Details views always describe the same action.
const recommendedActions = [
  {
    id: "priority-watch",
    actionType: "priority_watch",
    icon: Eye,
    title: "Add to Priority Watch",
    description: "Monitor the ATM during the predicted withdrawal window.",
    actionLabel: "Add to Watchlist",
    doneLabel: "On Priority Watch",
    confirmation: "ATM added to the priority watchlist.",
    panelTitle: "Add ATM to Priority Watch",
    confirmLabel: "Confirm",
    chips: ({ targetAtm }) => [targetAtm.atm, targetAtm.predictedWindow],
    details: ({ targetAtm }) =>
      `${targetAtm.atm} added to priority watch during the predicted withdrawal window (${targetAtm.predictedWindow}).`,
    activityMessage: ({ targetAtm }) => `${targetAtm.atm} added to Priority Watch`,
  },
  {
    id: "bank-nodal-officer",
    actionType: "bank_nodal_request",
    icon: Bell,
    title: "Notify Bank Nodal Officer",
    description: "Prepare a case-linked coordination request for the bank.",
    actionLabel: "Prepare Bank Request",
    doneLabel: "Request Prepared",
    confirmation: "Bank coordination request prepared for officer review.",
    panelTitle: "Prepare Bank Nodal Request",
    confirmLabel: "Prepare Request",
    chips: ({ activeCase }) => [activeCase.bank, activeCase.id],
    details: ({ targetAtm, activeCase }) =>
      `Fraud investigation coordination request prepared for ${activeCase.bank} nodal officer on case ${activeCase.id} covering ${targetAtm.atm}. Nothing has been sent to the bank.`,
    activityMessage: ({ activeCase }) => `Bank coordination request prepared for ${activeCase.bank} nodal officer`,
  },
  {
    id: "preserve-evidence",
    actionType: "evidence_preservation",
    icon: FileLock2,
    title: "Preserve ATM Evidence",
    description: "Create a request to preserve CCTV, ATM journal, and transaction records.",
    actionLabel: "Create Evidence Request",
    doneLabel: "Request Created",
    confirmation: "Evidence preservation request created for officer review.",
    panelTitle: "Preserve ATM Evidence",
    confirmLabel: "Create Request",
    chips: ({ targetAtm }) => [targetAtm.atm, targetAtm.location],
    details: ({ targetAtm }) =>
      `Evidence preservation request created for ${targetAtm.atm} (${targetAtm.location}) covering CCTV footage, ATM journal / EJ records and transaction records for ${widenWindow(targetAtm.predictedWindow)}.`,
    activityMessage: ({ targetAtm }) => `${targetAtm.atm} evidence preservation request created`,
  },
  {
    id: "field-verification",
    actionType: "field_verification",
    icon: UserCheck,
    title: "Field Verification",
    description: "Assign local verification during the predicted withdrawal window.",
    actionLabel: "Assign Verification",
    doneLabel: "Verification Assigned",
    confirmation: "Field verification task assigned to the local unit.",
    panelTitle: "Assign Field Verification",
    confirmLabel: "Assign Task",
    chips: ({ targetAtm }) => ["Local unit", targetAtm.predictedWindow],
    details: ({ targetAtm, unit, priority }) =>
      `Field verification assigned to ${unit} with ${String(priority).toLowerCase()} priority for ${targetAtm.atm} during the ${targetAtm.predictedWindow} window.`,
    activityMessage: ({ targetAtm, unit }) => `Field verification assigned to ${unit} for ${targetAtm.atm}`,
  },
];

export default function ATMIntelligence() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedCaseId = searchParams.get("case");
  const initialCaseId = cases.some((item) => item.id === requestedCaseId) ? requestedCaseId : cases[0].id;
  const [caseId, setCaseId] = useState(initialCaseId);
  const [selectedRegionId, setSelectedRegionId] = useState(regionScores[0].id);
  const [dialogRegion, setDialogRegion] = useState(null);
  const [selectedAtm, setSelectedAtm] = useState(null);
  const [callerCircleAtms, setCallerCircleAtms] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const activeCase = useMemo(() => cases.find((item) => item.id === caseId) ?? cases[0], [caseId]);

  const chain = muleChains[activeCase.muleChainId];
  const chainNodes = flattenChain(chain);
  const cashOutNodes = chainNodes.filter((node) => node.role && node.role.includes("cash-out"));
  const linkedSuspects = suspects.filter((suspect) => suspect.linkedCases.includes(activeCase.id));

  const cashOutTotal = cashOutNodes.reduce((sum, node) => sum + Number(node.amount || 0), 0);
  const maxLayer = Math.max(...chainNodes.map((node) => Number(node.layer || 0)), 0);
  const selectedRegion = regionScores.find((region) => region.id === selectedRegionId) || regionScores[0];
  const selectedAtms = atmRankings[selectedRegion.id] || defaultAtmRankings;

  const atmDetails = selectedAtm
    ? {
        ...selectedAtm,
        lastActivity: selectedAtm.rank === 1 ? "18:42" : `${18 + (selectedAtm.rank % 2)}:${selectedAtm.rank % 2 ? "18" : "42"}`,
        riskFactors: [
          `${selectedAtm.linkedCases} linked fraud case${selectedAtm.linkedCases === 1 ? "" : "s"} in the surrounding corridor`,
          `${selectedAtm.fraudAmount} associated fraud value identified in historical activity`,
          `Predicted cash-out window overlaps with the region's highest-risk period (${selectedAtm.predictedWindow})`,
          selectedAtm.riskScore >= 80
            ? "Historical mule-account activity shows a strong location and timing match"
            : "Historical mule-account activity shows a moderate location and timing match",
        ],
      }
    : null;

  // ATM the recommended actions target: the one open in the details panel, else the top-ranked ATM.
  const targetAtm = atmDetails ?? selectedAtms[0] ?? {};

  // Operational action state is read from the persistent store, scoped to this
  // case + ATM pair, so it survives a refresh and never leaks across cases.
  const { getRecord, getStatus, initiate } = useCaseActions({ caseId, atmId: targetAtm.atm });

  const openActionDialog = (action) => {
    setActionNotice(null);
    setPendingAction(action);
  };

  const closeActionDialog = () => setPendingAction(null);

  const confirmRecommendedAction = async (formValues = {}) => {
    if (!pendingAction) return;

    const context = { targetAtm, activeCase, ...formValues };
    const result = await initiate({
      actionType: pendingAction.actionType,
      details: pendingAction.details(context),
      activityMessage: pendingAction.activityMessage(context),
      meta: pendingAction.actionType === "field_verification" ? { unit: formValues.unit, priority: formValues.priority } : null,
    });

    setActionNotice(
      result.created
        ? null
        : { actionId: pendingAction.id, message: "This action has already been initiated." }
    );
    setPendingAction(null);
  };

  const summaryCards = [
    {
      title: "Case summary",
      icon: Landmark,
      tone: "text-sky-600",
      accent: "hover:border-sky-300 hover:shadow-[0_16px_32px_-16px_rgb(2_132_199/0.22)]",
      divider: "bg-sky-500/30",
      rows: [
        ["Victim", activeCase.victim],
        ["Fraud type", activeCase.fraudType],
        ["Filed", activeCase.filedDate],
        ["Loss", formatINR(activeCase.amount)],
      ],
    },
    {
      title: "Asset flow",
      icon: Banknote,
      tone: "text-emerald-600",
      accent: "hover:border-emerald-300 hover:shadow-[0_16px_32px_-16px_rgb(5_150_105/0.22)]",
      divider: "bg-emerald-500/30",
      rows: [
        ["Bank", activeCase.bank],
        ["Account", activeCase.account],
        ["Cash-out", cashOutNodes.length ? cashOutNodes[0].name : "Not available"],
        ["ATM disbursal", formatINR(cashOutTotal || 0)],
      ],
    },
    {
      title: "Network picture",
      icon: Users,
      tone: "text-violet-600",
      accent: "hover:border-violet-300 hover:shadow-[0_16px_32px_-16px_rgb(124_58_237/0.22)]",
      divider: "bg-violet-500/30",
      rows: [
        ["Linked suspects", `${linkedSuspects.length}`],
        ["Mule layers", `${maxLayer + 1}`],
        ["Officer", activeCase.officer],
        ["State", activeCase.status],
      ],
    },
  ];

  const aiModels = [
    {
      name: "Graph intelligence",
      score: 94,
      verdict: "High confidence chain match",
      detail: `${linkedSuspects.length} suspects linked to the same flow and ${cashOutNodes.length} cash-out node(s) identified.`,
    },
    {
      name: "Temporal anomaly",
      score: 89,
      verdict: "Rapid conversion pattern",
      detail: `The movement burst reached ${formatINR(cashOutTotal || activeCase.amount)} within the first transfer window.`,
    },
    {
      name: "ATM behaviour model",
      score: 91,
      verdict: "ATM withdrawal pattern strongly aligns with mule activity",
      detail: `Branch activity shows ${cashOutNodes.length ? cashOutNodes[0].bank : activeCase.bank} as the conversion endpoint for this case.`,
    },
  ];

  const handleRegionSelect = (region) => setSelectedRegionId(region.id);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="ATM Intelligence"
        description="Case-specific ATM risk review, cash-out pattern analysis, and AI-led escalation signals for active fraud investigations."
      />

      <div className="flex flex-wrap items-center gap-3">
        <CaseSelector cases={cases} value={caseId} onValueChange={setCaseId} className="w-[360px]" />
        <Badge className={cn("border px-2.5 py-1 text-xs font-medium", riskTone[activeCase.priority] || "bg-slate-500/10 text-slate-600")}>
          {activeCase.priority.toUpperCase()} priority
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map(({ title, icon: Icon, tone, accent, divider, rows }) => (
          <Card
            key={title}
            className={cn(
              "group h-full transition-all duration-300 ease-out hover:-translate-y-1",
              accent
            )}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium text-foreground">{title}</CardTitle>
              <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110", tone)} />
            </CardHeader>
            <div aria-hidden="true" className={cn("mx-6 h-px", divider)} />
            <CardContent className="space-y-2.5 pt-4 text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-right font-medium text-foreground">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_340px]">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-base font-medium text-foreground">
              Cash-out region map
            </div>
            <Badge className="border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">
              {selectedRegion.confidence.toFixed(1)}% confidence
            </Badge>
          </div>

          <CallerLocationAtmRiskZone caseId={caseId} onCaseChange={setCaseId} investigationCases={cases} onNearbyAtmsChange={setCallerCircleAtms} />
        </div>

        <aside className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="mb-2 border-b pb-2">
            <h3 className="text-base font-semibold text-foreground">Regions</h3>
          </div>
          <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {regionScores.map((region) => (
              <div
                key={region.id}
                className={cn(
                  "rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-10px_rgb(15_23_42/0.25)]",
                  selectedRegionId === region.id
                    ? "border-primary/30 bg-primary/[0.03] ring-1 ring-primary/10"
                    : "border-border bg-background hover:border-foreground/15 hover:bg-accent"
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleRegionSelect(region)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="block text-sm font-medium text-foreground">{region.name}</span>
                      <span className="shrink-0 text-sm font-semibold text-foreground">{region.confidence.toFixed(1)}%</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{region.matchedAtms} ATM corridors</span>
                      <span className="rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                        {region.risk}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    title={`View AI reasoning for ${region.name}`}
                    aria-label={`View AI reasoning for ${region.name}`}
                    onClick={() => setDialogRegion(region)}
                    className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-medium text-foreground">Ranked ATM watchlist</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Predicted cash-out locations for {selectedRegion.name}
            </p>
          </div>
          <Badge className="border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">
            {callerCircleAtms.length ? `${callerCircleAtms.length} caller-buffer ATMs + ${selectedAtms.length} ranked` : `${selectedAtms.length} ranked ATMs`}
          </Badge>
        </CardHeader>
        <CardContent>
          {callerCircleAtms.length > 0 && (
            <div className="mb-4 rounded-lg border bg-slate-50/60">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">ATMs in caller buffer</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Same ATM data previously shown in the map-side panel, ranked by risk score.</p>
                </div>
                <Badge className="border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">
                  {callerCircleAtms.length} ATMs
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/30 text-xs text-muted-foreground">
                    <tr className="border-b">
                      {["Rank", "ATM", "Bank / City", "Risk score", "Risk level", "Prediction confidence"].map((heading) => (
                        <th key={heading} className="px-4 py-2.5 text-left font-medium">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {callerCircleAtms.map((atm, index) => (
                      <tr key={`caller-${atm.atm_id}`} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium text-foreground">{index + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-foreground">{atm.atm_id}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{atm.bank_name} · {atm.city}</td>
                        <td className="px-4 py-2.5 font-semibold text-foreground">{Number(atm.risk_score).toFixed(0)}</td>
                        <td className="px-4 py-2.5">
                          <Badge className="border border-red-200 bg-red-500/10 text-red-600">{atm.risk_level}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{Number(atm.prediction_confidence).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <div className="max-h-[350px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr className="border-b">
                  {["Rank", "ATM", "Location", "Risk score", "Linked cases", "Fraud amount", "Predicted window", "Status", "View details"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedAtms.map((atm) => (
                  <tr key={atm.atm} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{atm.rank}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{atm.atm}</td>
                    <td className="px-4 py-3 text-muted-foreground">{atm.location}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{atm.riskScore}</td>
                    <td className="px-4 py-3 text-muted-foreground">{atm.linkedCases}</td>
                    <td className="px-4 py-3 text-muted-foreground">{atm.fraudAmount}</td>
                    <td className="px-4 py-3 text-muted-foreground">{atm.predictedWindow}</td>
                    <td className="px-4 py-3">
                      <Badge className="border border-red-200 bg-red-500/10 text-red-600">{atm.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedAtm(atm)}
                        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {atmDetails && (
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between gap-4 border-b bg-muted/20">
            <div>
              <CardTitle className="text-base font-medium text-foreground">ATM intelligence details</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Detailed model output for {atmDetails.atm} in {selectedRegion.name}
              </p>
            </div>
            <button
              type="button"
              aria-label="Hide ATM details"
              title="Hide ATM details"
              onClick={() => setSelectedAtm(null)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 lg:grid-cols-2">
            <section>
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">ATM details</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["ATM ID", atmDetails.atm],
                  ["Location", atmDetails.location],
                  ["Risk score", `${atmDetails.riskScore} / 100`],
                  ["Risk level", atmDetails.status],
                  ["Linked cases", atmDetails.linkedCases],
                  ["Total fraud amount", atmDetails.fraudAmount],
                  ["Predicted window", atmDetails.predictedWindow],
                  ["Last suspicious activity", atmDetails.lastActivity],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <div className="mb-4 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-foreground">Why this ATM was predicted</h3>
              </div>
              <div className="mb-4 rounded-lg border bg-primary/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Model confidence</span>
                  <span className="text-lg font-semibold text-foreground">{atmDetails.riskScore}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${atmDetails.riskScore}%` }} />
                </div>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {atmDetails.riskFactors.map((factor) => (
                  <li key={factor} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  The model combines historical mule-account activity, linked case density, fraud value, regional patterns,
                  and predicted timing to rank this ATM.
                </span>
              </div>
            </section>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)]">
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b bg-muted/20">
              <div>
                <CardTitle className="text-base font-medium text-foreground">Withdrawal prediction report</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Current prediction for {selectedRegion.name}</p>
              </div>
              <ClipboardCopy className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs text-muted-foreground">Predicted risk</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{selectedRegion.confidence.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected window</p>
                <p className="mt-1 text-sm font-medium text-foreground">20:00–22:00</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected activity</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {selectedRegion.confidence >= 80 ? "High" : selectedRegion.confidence >= 65 ? "Medium" : "Low"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="mt-1 text-sm font-medium text-foreground">{Math.max(selectedRegion.confidence - 3, 0).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prediction factors</p>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {["Recent fraud activity", "Historical withdrawal pattern", "Linked mule accounts", "Location proximity"].map((factor) => (
                    <li key={factor} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b bg-muted/20">
              <div className="min-w-0">
                <CardTitle className="text-base font-medium text-foreground">Recommended Actions</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Suggested operational responses based on the verified ATM risk.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/cases/${activeCase.id}`)}
                className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                title={`Open case file ${activeCase.id}`}
              >
                <FileText className="h-4 w-4" />
                Open Case Details
                <ArrowRight className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </CardHeader>
            <CardContent className="grid flex-1 auto-rows-fr gap-3 p-4 sm:grid-cols-2">
              {recommendedActions.map((action) => {
                const { icon: Icon } = action;
                const record = getRecord(action.actionType);
                const isInitiated = Boolean(record);
                const notice = actionNotice?.actionId === action.id ? actionNotice.message : null;
                const chips = action.chips({ targetAtm, activeCase }).filter(Boolean);

                return (
                  <div
                    key={action.id}
                    className={cn(
                      "group flex flex-col rounded-lg border transition-all focus-within:border-primary/40",
                      isInitiated
                        ? "border-emerald-200 bg-emerald-500/[0.06]"
                        : "border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start gap-2.5 p-3.5">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                          isInitiated
                            ? "border-emerald-200 bg-emerald-500/10 text-emerald-600"
                            : "border-border bg-background text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium leading-tight text-foreground">{action.title}</p>
                          <span
                            className={cn(
                              "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                              isInitiated
                                ? "border-emerald-200 bg-emerald-500/10 text-emerald-700"
                                : "border-primary/20 bg-primary/5 text-primary"
                            )}
                            title={record ? `${record.details} — recorded by ${record.performedBy}` : "Not initiated yet"}
                          >
                            {isInitiated ? <Check className="h-2.5 w-2.5" /> : null}
                            {getActionStatusLabel(getStatus(action.actionType))}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-center gap-2 px-3.5 pb-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-md border border-border/60 bg-background/70 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-start gap-1.5 text-[11px] leading-snug" aria-live="polite">
                        {notice ? (
                          <>
                            <Info className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <p className="text-amber-700">{notice}</p>
                          </>
                        ) : isInitiated ? (
                          <>
                            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <p className="text-emerald-700">{action.confirmation}</p>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="border-t px-3.5 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isInitiated}
                        onClick={() => openActionDialog(action)}
                        className={cn(
                          "w-full justify-between transition-colors",
                          isInitiated
                            ? "border-emerald-200 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700 disabled:opacity-100"
                            : "border-sky-200 bg-sky-500/[0.08] text-sky-800 hover:border-sky-300 hover:bg-sky-500/[0.14] hover:text-sky-800 group-hover:border-sky-300 group-hover:bg-sky-500/[0.14]"
                        )}
                      >
                        {isInitiated ? action.doneLabel : action.actionLabel}
                        {isInitiated ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <ArrowRight className="h-4 w-4 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {aiModels.map(({ name, score, verdict, detail }) => (
          <Card
            key={name}
            className="group h-full transition-all duration-300 ease-out hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_16px_32px_-16px_rgb(5_150_105/0.22)]"
          >
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base font-medium text-foreground">
                <BrainCircuit className="h-5 w-5 shrink-0 text-primary transition-transform duration-300 group-hover:scale-110" />
                {name}
              </CardTitle>
              <span className="text-lg font-semibold text-foreground">{score}%</span>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 transition-colors duration-300 group-hover:bg-slate-300">
                <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
              </div>
              <div className="flex items-center gap-2 text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-medium">{verdict}</span>
              </div>
              <p className="text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(dialogRegion)} onOpenChange={(open) => !open && setDialogRegion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogRegion?.name}</DialogTitle>
            <DialogDescription>
              AI inference summary for this predicted ATM cash-out region.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Confidence score</span>
                <span className="text-lg font-semibold text-foreground">{dialogRegion?.confidence.toFixed(1)}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-primary" style={{ width: `${dialogRegion?.confidence ?? 0}%` }} />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2.5 text-base font-medium text-foreground">
                <TrendingUp className="h-5 w-5 text-primary" />
                Why this region was selected
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {dialogRegion?.reasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border bg-white p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Key model inputs</p>
              <div className="mt-2 space-y-1">
                <p><span className="font-medium text-foreground">Scammer call origin:</span> {dialogRegion?.callOrigin}</p>
                <p><span className="font-medium text-foreground">Matched ATM corridors:</span> {dialogRegion?.matchedAtms}</p>
                <p><span className="font-medium text-foreground">Risk band:</span> {dialogRegion?.risk}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <OperationalActionDialog
        key={pendingAction?.id ?? "closed"}
        action={pendingAction}
        caseItem={activeCase}
        atm={targetAtm}
        open={Boolean(pendingAction)}
        onOpenChange={closeActionDialog}
        onConfirm={confirmRecommendedAction}
      />
    </div>
  );
}
