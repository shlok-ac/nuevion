import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Banknote, Check, Download, MapPin, Scale, Share2, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTION_STATUS, OPERATIONAL_ACTIONS, getActionStatusLabel } from "@/lib/caseActionStore";
import { useCaseActions } from "@/hooks/useCaseActions";
import { cases, formatINR, muleChains, suspects } from "@/lib/investigationData";
import { cn } from "@/lib/utils";
import { getCase } from "@/lib/api";
import FraudHeatmap from "@/components/command/FraudHeatmap";

const priorityTone = {
  critical: "border-red-200 bg-red-500/10 text-red-600",
  high: "border-amber-200 bg-amber-500/10 text-amber-600",
  medium: "border-blue-200 bg-blue-500/10 text-blue-600",
  low: "border-slate-200 bg-slate-500/10 text-slate-600",
};

const statusTone = {
  active: "bg-emerald-500/10 text-emerald-600",
  monitoring: "bg-amber-500/10 text-amber-600",
  frozen: "bg-blue-500/10 text-blue-600",
  resolved: "bg-emerald-500/10 text-emerald-600",
  closed: "bg-muted text-muted-foreground",
};

// Operational actions share the ATM Intelligence status treatment: primary while
// pending, emerald once an action record exists.
const operationalStatusTone = {
  [ACTION_STATUS.pending]: "border-primary/20 bg-primary/5 text-primary",
  [ACTION_STATUS.active]: "border-emerald-200 bg-emerald-500/10 text-emerald-600",
  [ACTION_STATUS.prepared]: "border-emerald-200 bg-emerald-500/10 text-emerald-600",
  [ACTION_STATUS.requested]: "border-emerald-200 bg-emerald-500/10 text-emerald-600",
  [ACTION_STATUS.assigned]: "border-emerald-200 bg-emerald-500/10 text-emerald-600",
};

// Shared layout tokens. Every card on the page reuses these so headings, bodies
// and labels all sit on the same 20px alignment boundary with the same rhythm.
// Matching `pt-4` / `pb-4` gives each heading an even 16px block of air so the
// content below never crowds it.
const cardHeaderClass = "px-5 pb-4 pt-4";
const cardBodyClass = "px-5 pb-3.5";
const sectionTitleClass = "text-[13px] font-semibold uppercase tracking-[0.1em] text-foreground";
const fieldLabelClass = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80";
const badgeSizingClass = "min-w-[4.75rem] justify-center";

const actions = [
  { label: "ATM Intelligence", description: "Linked ATMs, risk scores, activity.", path: "/atm-intelligence", icon: Banknote },
  { label: "Money Trail", description: "Transaction and mule-chain graph.", path: "/money-trail", icon: Share2 },
  { label: "Legal Window", description: "Prepare the relevant bank notice.", path: "/legal", icon: Scale },
  { label: "Freeze Simulation", description: "Simulated account and ATM freeze.", path: "/freeze-sim", icon: Snowflake },
  { label: "Export", description: "Generate case report and evidence.", path: "/export", icon: Download },
];

const formatDate = (value) =>
  new Date(`${value}T00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatActivity = (value) => {
  const date = new Date(value.replace(" ", "T"));
  return {
    date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
};

const formatEntryTime = (value) =>
  new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

const formatEntryStamp = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

function flattenChain(node, result = []) {
  if (!node) return result;
  result.push(node);
  node.children?.forEach((child) => flattenChain(child, result));
  return result;
}

export default function CaseDetails() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const fallbackCase = cases.find((item) => item.id === caseId);
  const [caseItem, setCaseItem] = useState(fallbackCase || null);
  const [caseError, setCaseError] = useState("");

  useEffect(() => {
    let active = true;
    getCase(caseId)
      .then((data) => {
        if (active) {
          setCaseItem({ ...(fallbackCase || {}), ...data });
          setCaseError("");
        }
      })
      .catch((error) => {
        if (active) {
          setCaseError(error.message || "Live case information is unavailable.");
        }
      });
    return () => {
      active = false;
    };
  }, [caseId]);

  // Same persistent store the ATM Intelligence page writes to, so the operational
  // action statuses and the activity log always reflect confirmed actions.
  const { activities, getRecord } = useCaseActions({ caseId });

  if (!caseItem) {
    return (
      <div className="space-y-4 p-4 pt-6 sm:p-5 sm:pt-6 lg:p-6">
        <Button variant="ghost" className="-ml-3 h-8 py-0 pl-8 pr-3 text-sm text-muted-foreground hover:text-foreground" onClick={() => navigate("/case-management")}><ArrowLeft className="h-4 w-4" /> Back to Cases</Button>
        <Card><CardContent className="p-5 text-sm text-muted-foreground">Case not found.</CardContent></Card>
      </div>
    );
  }

  const activity = formatActivity(caseItem.lastActivity);
  const chain = flattenChain(caseItem.muleChainId ? muleChains[caseItem.muleChainId] : null);
  const linkedSuspects = suspects.filter((suspect) => suspect.linkedCases?.includes(caseItem.id));
  const linkedAccounts = chain.slice(0, 6);
  const timeline = [
    ["14:20", "Fraud complaint received"],
    ["14:28", "Mule account identified"],
    ["14:35", "Suspicious transfer detected"],
    ["14:42", "ATM linked to case"],
    ["15:03", "Investigation escalated"],
  ];

  if (caseItem.live_record) {
    const candidates = Array.isArray(caseItem.same_city_atm_candidates)
      ? caseItem.same_city_atm_candidates
      : [];
    const prototypeMappings = Array.isArray(caseItem.generated_prototype_mappings)
      ? caseItem.generated_prototype_mappings
      : [];
    const nlp = caseItem.nlp_analysis;

    return (
      <div className="space-y-4 p-4 pt-6 sm:p-5 sm:pt-6 lg:p-6">
        <Button variant="ghost" className="-ml-3 h-8 py-0 pl-8 pr-3 text-sm text-muted-foreground hover:text-foreground" onClick={() => navigate("/case-management")}>
          <ArrowLeft className="h-4 w-4" /> Back to Cases
        </Button>
        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Live PostgreSQL case</p>
              <h1 className="mt-1 text-xl font-semibold">{caseItem.complaint_number || caseItem.case_number}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{caseItem.case_number} · {caseItem.status || "Received"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoField label="Complainant" value={caseItem.victim || "—"} />
              <InfoField label="Location" value={caseItem.location || "—"} />
              <InfoField label="Bank" value={caseItem.bank_name || "—"} />
              <InfoField label="Reported amount" value={caseItem.amount ? formatINR(caseItem.amount) : "—"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={cardHeaderClass}><CardTitle className={sectionTitleClass}>Complaint and NLP analysis</CardTitle></CardHeader>
          <CardContent className={cn(cardBodyClass, "space-y-3 text-sm")}>
            <p className="whitespace-pre-wrap">{caseItem.description || "No complaint description was stored."}</p>
            {nlp ? (
              <>
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900">
                  Extracted from submitted text; not independently verified evidence.
                </p>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoField label="Scam category" value={nlp.scam_category || "Not extracted"} />
                  <InfoField label="Amount extracted from text" value={nlp.stolen_amount_inr == null ? "Not extracted" : formatINR(nlp.stolen_amount_inr)} />
                  <InfoField label="Transfer mode" value={nlp.transfer_mode || "Not extracted"} />
                  <InfoField label="Account identifier extracted" value={nlp.initial_mule_account || "Not extracted"} />
                  <InfoField label="Text location coordinates" value={nlp.victim_lat == null ? "Not extracted" : `${nlp.victim_lat}, ${nlp.victim_lon}`} />
                  <InfoField label="Extraction provenance" value={nlp.provenance || "complaint_text_nlp_extraction"} />
                  {nlp.transcript && <InfoField label="Original audio transcript" value={nlp.transcript} />}
                  {nlp.translated_text && <InfoField label="English translation" value={nlp.translated_text} />}
                  {nlp.translated_text && (
                    <InfoField
                      label="Speech language"
                      value={nlp.detected_language || `Selected: ${nlp.source_language || "Not available"}`}
                    />
                  )}
                  {nlp.field_provenance && (
                    <InfoField
                      label="Extracted field provenance"
                      value={Object.entries(nlp.field_provenance)
                        .map(([field, source]) => `${field.replaceAll("_", " ")}: ${source.extractor || source.source}`)
                        .join("; ") || "No fields extracted"}
                    />
                  )}
                </dl>
              </>
            ) : <p className="text-muted-foreground">No NLP result is stored for this complaint.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={cardHeaderClass}>
            <CardTitle className={sectionTitleClass}>Same-city ATM candidates</CardTitle>
            <p className="text-xs text-muted-foreground">
              Candidates are catalog ATMs whose city exactly matches the complaint location. They are not predicted or confirmed cash-out locations.
            </p>
          </CardHeader>
          <CardContent className={cn(cardBodyClass, "space-y-4")}>
            {candidates.length ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {candidates.map((atm) => (
                    <div key={atm.atm_id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div><strong>{atm.atm_id}</strong><p className="text-xs text-muted-foreground">{atm.bank_name} · {atm.city}</p></div>
                        <Badge variant="secondary">{atm.atm_risk_level || "Risk unavailable"}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        ATM-risk classifier probability: {atm.atm_risk_confidence == null ? "Unavailable" : `${atm.atm_risk_confidence}%`}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {atm.confidence_type
                          ? `${atm.confidence_type.replaceAll("_", " ")}.`
                          : "No live ATM-risk inference is stored."}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        {[
                          ["Highway distance", atm.highway_distance],
                          ["Lighting score", atm.lighting_score],
                          ["CCTV coverage", atm.cctv_coverage],
                          ["Historical fraud count", atm.historical_fraud_count],
                          ["Withdrawal limit", atm.withdrawal_limit],
                          ["Coordinates", atm.latitude == null ? "—" : `${atm.latitude}, ${atm.longitude}`],
                        ].map(([label, value]) => (
                          <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value ?? "—"}</dd></div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
                <FraudHeatmap candidateAtms={candidates} />
              </>
            ) : <p className="text-sm text-muted-foreground">No ATM catalog city exactly matches this complaint location; no candidates were selected.</p>}
            <p className="text-xs text-muted-foreground">
              ATM-risk classification describes the ATM catalog record only. It does not establish a relationship to the complaint.
            </p>
          </CardContent>
        </Card>

        {prototypeMappings.length > 0 && (
          <Card>
            <CardHeader className={cardHeaderClass}><CardTitle className={sectionTitleClass}>Historical prototype mappings</CardTitle></CardHeader>
            <CardContent className={cn(cardBodyClass, "space-y-3")}>
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900">
                Imported/generated reference data — not verified cash-out events.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2">ATM</th><th className="p-2">Location</th><th className="p-2">Reference account</th><th className="p-2">Source</th></tr></thead>
                  <tbody>{prototypeMappings.map((mapping) => (
                    <tr key={mapping.atm_id} className="border-b last:border-0">
                      <td className="p-2">{mapping.atm_id}</td><td className="p-2">{mapping.location || "—"}</td>
                      <td className="p-2">{mapping.cashout_account || "—"}</td><td className="p-2">{mapping.label}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 pt-6 sm:p-5 sm:pt-6 lg:space-y-4 lg:p-6">
      <Button variant="ghost" className="-ml-3 h-8 py-0 pl-8 pr-3 text-sm text-muted-foreground hover:text-foreground" onClick={() => navigate("/case-management")}>
        <ArrowLeft className="h-4 w-4" /> Back to Cases
      </Button>

      {/* ------------------------------------------------- Header (single row) */}
      <Card>
        <CardContent className="px-4 py-3.5 sm:px-5 lg:px-6">
          <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">{caseItem.id}</p>
              <h2 className="mt-1 text-xl font-semibold leading-tight tracking-tight">{caseItem.title}</h2>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-6">
              <HeaderMeta label="Risk">
                <Badge className={cn(badgeSizingClass, "uppercase", priorityTone[caseItem.priority])}>{caseItem.priority}</Badge>
              </HeaderMeta>
              <HeaderMeta label="Status">
                <Badge className={cn(badgeSizingClass, "uppercase", statusTone[caseItem.status])}>{caseItem.status}</Badge>
              </HeaderMeta>
              <HeaderMeta label="Fraud Amount">
                <span className="text-base font-semibold tabular-nums tracking-tight">{formatINR(caseItem.amount)}</span>
              </HeaderMeta>
              <HeaderMeta label="Last Activity">
                <span className="whitespace-nowrap text-sm font-semibold leading-5">{activity.date}, {activity.time}</span>
              </HeaderMeta>
            </dl>
          </div>
        </CardContent>
      </Card>
      {caseError && (
        <p role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
          Showing local prototype details because live case data could not be loaded: {caseError}
        </p>
      )}

      {/* ------------------------------------------------ Overview + Quick Actions */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card className="min-w-0">
          <CardHeader className={cardHeaderClass}><CardTitle className={sectionTitleClass}>Case Overview</CardTitle></CardHeader>
          <CardContent className={cn(cardBodyClass, "grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2")}>
            <InfoField label="Crime Type" value={caseItem.fraudType} />
            <InfoField label="Location" value={<><MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{caseItem.branch}</>} />
            <InfoField label="Date Reported" value={formatDate(caseItem.filedDate)} />
            <InfoField label="Last Activity" value={`${activity.date}, ${activity.time}`} />
            <InfoField label="Victim" value={caseItem.victim} />
            <InfoField label="Linked Accounts" value={linkedAccounts.length} />
            <InfoField label="Linked ATMs" value={caseItem.suspectIds.length} />
            <InfoField label="Linked Suspects" value={linkedSuspects.length || caseItem.suspectIds.length} />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className={cardHeaderClass}>
            <CardTitle className={sectionTitleClass}>Quick Actions</CardTitle>
            <p className="text-xs text-muted-foreground">Open case-specific investigation tools</p>
          </CardHeader>
          <CardContent className="space-y-0.5 px-3 pb-3">
            {actions.map(({ label, description, path, icon: Icon }) => (
              <Link
                key={label}
                to={`${path}?case=${encodeURIComponent(caseItem.id)}`}
                className="group flex min-h-12 items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{label}</span>
                  <span className="mt-px block text-xs leading-4 text-muted-foreground">{description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------ Case Summary */}
      <Card>
        <CardHeader className={cardHeaderClass}><CardTitle className={sectionTitleClass}>Case Summary</CardTitle></CardHeader>
        <CardContent className={cn(cardBodyClass, "max-w-5xl text-sm leading-6 text-muted-foreground")}>
          {caseItem.title} is a {caseItem.fraudType.toLowerCase()} investigation involving {caseItem.victim}. The case is being handled by {caseItem.officer} at {caseItem.station}, with{" "}
          <span className="font-semibold tabular-nums text-foreground">{formatINR(caseItem.amount)}</span> currently associated with the reported fraud.
        </CardContent>
      </Card>

      {/* ------------------------------------------- Investigation Timeline + Status */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,1fr)]">
        <Card className="flex min-w-0 flex-col">
          <CardHeader className={cardHeaderClass}><CardTitle className={sectionTitleClass}>Investigation Timeline</CardTitle></CardHeader>
          <CardContent className={cn(cardBodyClass, "flex-1")}>
            <div className="grid h-full auto-rows-fr grid-cols-[3rem_0.75rem_minmax(0,1fr)]">
              {timeline.map(([time, label], index) => (
                <Fragment key={`${time}-${label}`}>
                  <TimelineRow time={time} label={label} isLast={index === timeline.length - 1} />
                </Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="min-w-0">
            <CardHeader className={cardHeaderClass}><CardTitle className={sectionTitleClass}>Case Status Information</CardTitle></CardHeader>
            <CardContent className={cardBodyClass}>
              <StatusRow label="Current Status">
                <Badge className={cn(badgeSizingClass, "uppercase", statusTone[caseItem.status])}>{caseItem.status}</Badge>
              </StatusRow>
              <StatusRow label="Risk">
                <Badge className={cn(badgeSizingClass, "uppercase", priorityTone[caseItem.priority])}>{caseItem.priority}</Badge>
              </StatusRow>
              <StatusRow label="Priority">Immediate Attention</StatusRow>
              <StatusRow label="Last Action">Freeze request initiated</StatusRow>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader className={cardHeaderClass}><CardTitle className={sectionTitleClass}>Operational Actions</CardTitle></CardHeader>
            <CardContent className={cardBodyClass}>
              <ul className="flex flex-col overflow-hidden rounded-md border border-border/70">
                {OPERATIONAL_ACTIONS.map(({ actionType, label }) => {
                  const record = getRecord(actionType);
                  const status = record?.status ?? ACTION_STATUS.pending;
                  return (
                    <li key={actionType} className="flex min-h-9 items-center justify-between gap-3 border-b border-border/60 px-3 text-xs last:border-b-0">
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {label}
                        {record ? <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">{record.atmId}</span> : null}
                      </span>
                      <Badge
                        className={cn(badgeSizingClass, "gap-0.5 uppercase", operationalStatusTone[status] ?? operationalStatusTone[ACTION_STATUS.pending])}
                        title={record ? record.details : "No action initiated yet"}
                      >
                        {record ? <Check className="h-3 w-3" /> : null}
                        {getActionStatusLabel(status)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------- Activity Log */}
      <Card>
        <CardHeader className={cn(cardHeaderClass, "flex-row items-center justify-between space-y-0")}>
          <CardTitle className={sectionTitleClass}>Activity Log</CardTitle>
          <Badge className="border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {activities.length} {activities.length === 1 ? "entry" : "entries"}
          </Badge>
        </CardHeader>
        <CardContent className={cardBodyClass}>
          {activities.length ? (
            <div className="grid grid-cols-[auto_0.75rem_minmax(0,1fr)_auto]">
              {activities.map((entry, index) => (
                <Fragment key={entry.id}>
                  <ActivityRow entry={entry} isLast={index === activities.length - 1} />
                </Fragment>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
              No operational actions recorded for this case yet. Actions confirmed on the ATM Intelligence page appear here.
            </p>
          )}
        </CardContent>
      </Card>

      {/* --------------------------------------------------------- Linked Entities */}
      <Card>
        <CardHeader className={cardHeaderClass}><CardTitle className={sectionTitleClass}>Linked Entities</CardTitle></CardHeader>
        <CardContent className={cn(cardBodyClass, "grid gap-4 md:grid-cols-3")}>
          <EntityGroup title="Linked Accounts" items={linkedAccounts.slice(0, 3).map((item) => [item.account, item.status])} />
          <EntityGroup title="Linked ATMs" items={caseItem.suspectIds.slice(0, 3).map((id, index) => [`ATM-${String(index + 1).padStart(3, "0")}`, `Risk ${94 - index * 5}`])} />
          <EntityGroup title="Linked Suspects" items={linkedSuspects.slice(0, 3).map((suspect) => [suspect.id, suspect.risk])} />
        </CardContent>
      </Card>
    </div>
  );
}

function HeaderMeta({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className={fieldLabelClass}>{label}</dt>
      <dd className="mt-1.5 flex min-h-6 items-center text-foreground">{children}</dd>
    </div>
  );
}

function TimelineRow({ time, label, isLast }) {
  return (
    <>
      <span className="flex h-full min-h-9 items-center pr-3 font-mono text-xs font-semibold tabular-nums text-muted-foreground">{time}</span>
      <span className="relative flex h-full min-h-9 items-center justify-center">
        {/* Hairline spans the whole row, so it runs centre-to-centre with no gaps
            however far the timeline is stretched to match the cards beside it. */}
        {!isLast && <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 bg-border" />}
        <span aria-hidden="true" className="relative h-2 w-2 rounded-full border-2 border-background bg-muted-foreground/70" />
      </span>
      <span className="flex h-full min-h-9 items-center pl-3 text-sm">{label}</span>
    </>
  );
}

function ActivityRow({ entry, isLast }) {
  return (
    <>
      <span
        className="flex h-9 items-center pr-3 font-mono text-xs font-semibold tabular-nums text-muted-foreground"
        title={formatEntryStamp(entry.createdAt)}
      >
        {formatEntryTime(entry.createdAt)}
      </span>
      <span className="relative flex h-9 items-center justify-center">
        {!isLast && <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-9 w-px -translate-x-1/2 bg-border" />}
        <span aria-hidden="true" className="relative h-2 w-2 rounded-full border-2 border-background bg-emerald-600/70" />
      </span>
      <span className="flex h-9 min-w-0 items-center gap-2 pl-3 text-sm">
        <span className="min-w-0 truncate text-foreground">{entry.message}</span>
        {entry.atmId ? <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{entry.atmId}</span> : null}
      </span>
      <span className="flex h-9 shrink-0 items-center pl-3 text-xs text-muted-foreground">{entry.performedBy}</span>
    </>
  );
}

function StatusRow({ label, children }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-4 border-b border-border/60 py-1 last:border-b-0">
      <span className={fieldLabelClass}>{label}</span>
      <span className="flex min-w-0 items-center justify-end text-sm font-medium text-foreground">{children}</span>
    </div>
  );
}

function EntityGroup({ title, items }) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <h3 className={cn(fieldLabelClass, "mb-2 shrink-0")}>{title}</h3>
      {items.length ? (
        <ul className="flex flex-1 flex-col overflow-hidden rounded-md border border-border/70">
          {items.map(([name, detail]) => (
            <li key={name} className="flex min-h-9 flex-1 items-center justify-between gap-3 border-b border-border/60 px-3 text-xs last:border-b-0">
              <span className="min-w-0 truncate font-medium text-foreground">{name}</span>
              <span className="shrink-0 capitalize text-muted-foreground">{detail}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">No linked entities.</p>
      )}
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="min-w-0">
      <p className={fieldLabelClass}>{label}</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}
