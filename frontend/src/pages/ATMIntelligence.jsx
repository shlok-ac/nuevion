import { useEffect, useMemo, useState } from "react";
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
import CallerLocationAtmRiskZone from "@/components/command/CallerLocationAtmRiskZone";
import { getActionStatusLabel } from "@/lib/caseActionStore";
import { useCaseActions } from "@/hooks/useCaseActions";
import { formatINR } from "@/lib/investigationData";
import { getATMs, getDashboardData, getPredictions } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Adapt an ATM API record to the existing details-panel shape without making
 * catalog risk fields look like live inference or filling absent values.
 */
const numberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const atmFromApiRow = (row) => {
  const liveInference = row.prediction_details?.live_atm_risk_inference || row.atm_risk_inference || null;
  const features = liveInference?.features || {
    highway_distance: row.highway_distance,
    lighting_score: row.lighting_score,
    cctv_coverage: row.cctv_coverage,
    historical_fraud_count: row.historical_fraud_count,
    withdrawal_limit: row.withdrawal_limit,
  };
  const availableFeatures = Object.fromEntries(
    Object.entries(features).filter(([, value]) => value !== null && value !== undefined && value !== "")
  );
  return {
    atm: row.atm_id || "Not available",
    bank: row.bank_name || "Not available",
    city: row.city || "Not available",
    location: [row.bank_name, row.city].filter(Boolean).join(", ") || "Not available",
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    highwayDistance: numberOrNull(row.highway_distance),
    lightingScore: numberOrNull(row.lighting_score),
    cctvCoverage: numberOrNull(row.cctv_coverage),
    historicalFraudCount: numberOrNull(row.historical_fraud_count),
    withdrawalLimit: numberOrNull(row.withdrawal_limit),
    riskScore: numberOrNull(row.risk_score),
    status: String(liveInference?.risk_level || row.predicted_risk_level || row.risk_level || "Not available").toUpperCase(),
    riskLevelSource: liveInference
      ? "Live ATM risk inference"
      : row.atm_risk_provenance || row.data_notice || "ATM catalog/reference value",
    predictionConfidence: numberOrNull(liveInference?.prediction_confidence),
    confidenceType: liveInference?.confidence_type || "Not available",
    modelVersion: liveInference?.model_version || "Not available",
    modelFeatures: Object.keys(availableFeatures).length ? availableFeatures : null,
    predictionUpdatedAt: row.prediction_updated_at || null,
    provenance: liveInference
      ? "live_atm_risk_inference"
      : row.atm_risk_provenance || "atm_catalog_or_imported_reference",
    verified: false,
    linkedCases: null,
    fraudAmount: null,
    predictedWindow: null,
  };
};

/**
 * "Why this ATM was predicted" is worded from whichever fields the ATM has: a
 * watchlist row carries a linked-case count, fraud amount and predicted window,
 * while a map row carries the model's own prediction and confidence. A complete
 * watchlist row produces exactly the four sentences it always did.
 */
const buildRiskFactors = (atm) => {
  const factors = [];

  if (atm.provenance === "live_atm_risk_inference") {
    factors.push(`Live ATM risk classification: ${atm.status}`);
  }

  if (atm.modelFeatures) {
    Object.entries(atm.modelFeatures).forEach(([feature, value]) => {
      factors.push(`${feature.replaceAll("_", " ")}: ${value}`);
    });
  }

  if (!factors.length) factors.push("No live ATM risk inference is available for this record.");

  return factors;
};

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
  const [caseId, setCaseId] = useState(requestedCaseId || "");
  const [liveCases, setLiveCases] = useState([]);
  const [caseLoading, setCaseLoading] = useState(true);
  const [caseError, setCaseError] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState(regionScores[0].id);
  const [dialogRegion, setDialogRegion] = useState(null);
  const [selectedAtm, setSelectedAtm] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [atmRecords, setAtmRecords] = useState([]);
  const [atmLoading, setAtmLoading] = useState(true);
  const [atmError, setAtmError] = useState("");
  const [predictionError, setPredictionError] = useState("");
  // ATMs the map found inside the selected case's caller-location buffer. The map
  // owns the geography, so it reports them upward rather than the page recomputing it.

  useEffect(() => {
    let active = true;
    const loadCases = async () => {
      setCaseLoading(true);
      setCaseError("");
      try {
        const dashboard = await getDashboardData();
        if (!Array.isArray(dashboard.cases)) {
          throw new Error("Dashboard response did not include case records.");
        }
        const rows = dashboard.cases
          .filter((row) => row.id != null)
          .map((row) => ({
            ...row,
            id: String(row.id),
            title: row.description || row.case_number || row.complaint_number || "Untitled case",
            fraudType: row.fraudType || row.transaction_type || null,
            amount: row.amount ?? row.fraud_amount ?? null,
            bank: row.bank_name || null,
            account: row.account || row.account_number || null,
            filedDate: row.filedDate || row.created_at || null,
            officer: row.assigned_to || null,
          }));
        if (active) {
          setLiveCases(rows);
          setCaseId((current) => (
            rows.some((row) => row.id === current || row.case_number === current)
              ? rows.find((row) => row.id === current || row.case_number === current).id
              : rows[0]?.id || ""
          ));
        }
      } catch (error) {
        if (active) {
          setLiveCases([]);
          setCaseId("");
          setCaseError(error.message || "Live case data is unavailable.");
        }
      } finally {
        if (active) setCaseLoading(false);
      }
    };

    loadCases();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadAtms = async () => {
      setAtmLoading(true);
      setAtmError("");
      setPredictionError("");
      try {
        const catalog = await getATMs();
        if (!Array.isArray(catalog)) {
          throw new Error("ATM catalog API returned an unexpected response");
        }

        let predictionRows = [];
        try {
          predictionRows = await getPredictions();
          if (!Array.isArray(predictionRows)) {
            throw new Error("ATM prediction API returned an unexpected response");
          }
        } catch (error) {
          if (active) setPredictionError(error.message || "Live ATM risk inference is unavailable.");
        }

        const predictionsByAtm = new Map(
          predictionRows
            .filter((row) => row.atm_id != null)
            .map((row) => [String(row.atm_id).trim(), row])
        );
        const merged = catalog.map((atm) => {
          const prediction = atm.atm_id == null
            ? null
            : predictionsByAtm.get(String(atm.atm_id).trim());
          return {
            ...atm,
            atm_risk_inference:
              atm.prediction_details?.live_atm_risk_inference ||
              prediction?.atm_risk_inference ||
              null,
            risk_score: atm.risk_score ?? prediction?.risk_score,
            risk_level: atm.risk_level ?? prediction?.risk_level,
            predicted_risk_level: atm.predicted_risk_level ?? prediction?.predicted_risk_level,
            prediction_confidence: atm.prediction_confidence ?? prediction?.prediction_confidence,
            prediction_details: atm.prediction_details ?? prediction?.prediction_details,
            prediction_updated_at: atm.prediction_updated_at ?? prediction?.prediction_updated_at,
            atm_risk_provenance: prediction?.atm_risk_provenance || null,
            data_notice: prediction?.data_notice || null,
          };
        });
        if (active) setAtmRecords(merged);
      } catch (error) {
        if (active) {
          setAtmRecords([]);
          setAtmError(error.message || "Live ATM catalog is unavailable.");
        }
      } finally {
        if (active) setAtmLoading(false);
      }
    };

    loadAtms();
    return () => {
      active = false;
    };
  }, []);

  const liveAtms = useMemo(() => atmRecords.map(atmFromApiRow), [atmRecords]);

  const activeCase = useMemo(
    () => liveCases.find((item) => item.id === caseId || item.case_number === caseId) || null,
    [caseId, liveCases]
  );
  const selectedRegion = regionScores.find((region) => region.id === selectedRegionId) || regionScores[0];
  const selectedAtms = liveAtms;

  const atmDetails = selectedAtm
    ? {
        ...selectedAtm,
        riskFactors: buildRiskFactors(selectedAtm),
      }
    : null;

  // ATM the recommended actions target: the one open in the details panel, else the top-ranked ATM.
  const targetAtm = atmDetails ?? selectedAtms[0] ?? {};

  // Operational action state is read from the persistent store, scoped to this
  // case + ATM pair, so it survives a refresh and never leaks across cases.
  const { getRecord, getStatus, initiate } = useCaseActions({ caseId: activeCase?.id || "", atmId: targetAtm.atm });

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
        ["Case number", activeCase?.case_number || "Not available"],
        ["Complainant", activeCase?.victim || "Not available"],
        ["Fraud type", activeCase?.fraudType || "Not available"],
        ["Reported amount", activeCase?.amount == null ? "Not available" : formatINR(activeCase.amount)],
      ],
    },
    {
      title: "Asset flow",
      icon: Banknote,
      tone: "text-emerald-600",
      accent: "hover:border-emerald-300 hover:shadow-[0_16px_32px_-16px_rgb(5_150_105/0.22)]",
      divider: "bg-emerald-500/30",
      rows: [
        ["Bank", activeCase?.bank_name || "Not available"],
        ["Account", activeCase?.account || activeCase?.account_number || "Not available"],
        ["Complaint location", activeCase?.location || activeCase?.branch || "Not available"],
        ["Complaint number", activeCase?.complaint_number || "Not available"],
      ],
    },
    {
      title: "Network picture",
      icon: Users,
      tone: "text-violet-600",
      accent: "hover:border-violet-300 hover:shadow-[0_16px_32px_-16px_rgb(124_58_237/0.22)]",
      divider: "bg-violet-500/30",
      rows: [
        ["Case status", activeCase?.status || "Not available"],
        ["Priority", activeCase?.priority || activeCase?.risk_level || "Not available"],
        ["Assigned to", activeCase?.assigned_to || "Not assigned"],
        ["Last updated", activeCase?.lastActivity || activeCase?.updated_at || activeCase?.created_at || "Not available"],
      ],
    },
  ];

  const aiModels = [
    {
      name: "Graph intelligence",
      score: 94,
      verdict: "Prototype reference",
      detail: "This sample is not calculated from the selected live case.",
    },
    {
      name: "Temporal anomaly",
      score: 89,
      verdict: "Prototype reference",
      detail: "This sample is not calculated from the selected live case.",
    },
    {
      name: "ATM behaviour model",
      score: 91,
      verdict: "Prototype reference",
      detail: "This sample is not calculated from the selected live case.",
    },
  ];

  const handleRegionSelect = (region) => setSelectedRegionId(region.id);

  // Opening an ATM from the map runs its prediction row through the same adapter
  // the watchlist uses, so the details card reads identically wherever it opens.
  const handleMapAtmSelect = (row) => setSelectedAtm(atmFromApiRow(row));

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="ATM Intelligence"
        description="ATM catalog risk review with separately labeled prototype case examples; this page does not identify confirmed cash-out locations."
      />

      <Card className="border-amber-500/30 bg-amber-500/10">
        <CardContent className="p-4 text-sm text-amber-950">
          The ATM table and ATM markers use the live backend catalog. Risk inference is shown only where returned by the ATM-risk model; other reference panels on this page remain prototype data. ATM risk is not complaint-to-ATM linkage or cash-out likelihood.
          <p className="mt-2 font-medium">Imported/generated reference data — not verified cash-out events.</p>
        </CardContent>
      </Card>
      {atmError && (
        <p role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
          Live ATM catalog unavailable: {atmError}
        </p>
      )}
      {!atmError && predictionError && (
        <p role="status" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
          ATM catalog is live, but live prediction details could not be loaded: {predictionError}
        </p>
      )}
      {caseError && (
        <p role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
          Live case data unavailable: {caseError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {liveCases.length ? (
          <CaseSelector
            cases={liveCases}
            value={caseId}
            onValueChange={setCaseId}
            className="w-[360px]"
          />
        ) : (
          <p className="w-[360px] text-sm text-muted-foreground">
            {caseLoading ? "Loading live cases…" : "No live cases are available."}
          </p>
        )}
        <Badge className={cn("border px-2.5 py-1 text-xs font-medium", riskTone[String(activeCase?.priority || activeCase?.risk_level || "").toLowerCase()] || "bg-slate-500/10 text-slate-600")}>
          {activeCase ? `${activeCase.priority || activeCase.risk_level || "Unrated"} priority` : "Case unavailable"}
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
              Live ATM catalog with prototype caller/tower overlay
            </div>
            <Badge className="border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">
              Live ATM records
            </Badge>
          </div>

          <CallerLocationAtmRiskZone
            atmRows={atmRecords}
            atmLoading={atmLoading}
            atmError={atmError}
            onAtmSelect={handleMapAtmSelect}
          />
        </div>

        <aside className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="mb-2 border-b pb-2">
            <h3 className="text-base font-semibold text-foreground">Prototype region examples</h3>
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
                      <span className="shrink-0 text-sm font-semibold text-foreground">{region.confidence.toFixed(1)}% ref.</span>
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
            <CardTitle className="text-base font-medium text-foreground">ATM catalog</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Live records from GET /api/atms. ATM risk and prediction provenance are shown separately.
            </p>
          </div>
          <Badge className="border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">
            {atmLoading ? "Loading ATMs" : `${selectedAtms.length} ATM records`}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <div className="max-h-[350px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr className="border-b">
                  {["No.", "ATM ID", "Bank", "City", "Coordinates", "Stored risk score", "Risk level", "Model / provenance", "View details"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedAtms.map((atm, index) => (
                  <tr key={atm.atm} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{atm.atm}</td>
                    <td className="px-4 py-3 text-muted-foreground">{atm.bank}</td>
                    <td className="px-4 py-3 text-muted-foreground">{atm.city}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {atm.latitude == null || atm.longitude == null ? "Not available" : `${atm.latitude}, ${atm.longitude}`}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{atm.riskScore == null ? "Not available" : atm.riskScore}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{atm.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {atm.provenance === "live_atm_risk_inference" ? `Live · ${atm.modelVersion}` : atm.riskLevelSource}
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
                {!atmLoading && !atmError && selectedAtms.length === 0 && (
                  <tr><td colSpan="9" className="px-4 py-6 text-center text-muted-foreground">No ATM catalog records are available.</td></tr>
                )}
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
                ATM risk details for {atmDetails.atm}; no complaint-to-ATM or cash-out prediction is made.
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
                  ["Stored risk score", atmDetails.riskScore == null ? "Not available" : atmDetails.riskScore],
                  ["Risk level", atmDetails.status],
                  ["Latitude", atmDetails.latitude ?? "Not available"],
                  ["Longitude", atmDetails.longitude ?? "Not available"],
                  ["Prediction updated", atmDetails.predictionUpdatedAt ? new Date(atmDetails.predictionUpdatedAt).toLocaleString() : "Not available"],
                  ["Risk data provenance", atmDetails.riskLevelSource],
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
                <h3 className="text-sm font-semibold text-foreground">ATM risk factors</h3>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                This is ATM risk classification, not a prediction that this ATM handled a complaint-related cash-out.
              </p>
              <div className="mb-4 rounded-lg border bg-primary/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Classifier class probability (not calibrated)</span>
                  <span className="text-lg font-semibold text-foreground">
                    {atmDetails.predictionConfidence == null ? "Not available" : `${atmDetails.predictionConfidence}%`}
                  </span>
                </div>
                {atmDetails.predictionConfidence != null && (
                  <p className="mt-1 text-[11px] text-muted-foreground">{atmDetails.confidenceType}</p>
                )}
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  {atmDetails.predictionConfidence != null && atmDetails.predictionConfidence >= 0 && atmDetails.predictionConfidence <= 100 && (
                    <div className="h-full rounded-full bg-primary" style={{ width: `${atmDetails.predictionConfidence}%` }} />
                  )}
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
                  The live ATM-risk classifier uses ATM catalog features. Other case, regional, and timing panels on this page are separately labeled prototype reference content.
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
                onClick={() => activeCase && navigate(`/cases/${activeCase.id}`)}
                disabled={!activeCase}
                className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                title={activeCase ? `Open case file ${activeCase.case_number || activeCase.id}` : "Live case data unavailable"}
              >
                <FileText className="h-4 w-4" />
                Open Case Details
                <ArrowRight className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </CardHeader>
            <CardContent className="grid flex-1 auto-rows-fr gap-3 p-4 sm:grid-cols-2">
              {!activeCase ? (
                <p className="col-span-full self-center text-sm text-muted-foreground">
                  {caseLoading ? "Loading live case data…" : "Recommended actions are unavailable until a live case is selected."}
                </p>
              ) : recommendedActions.map((action) => {
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
