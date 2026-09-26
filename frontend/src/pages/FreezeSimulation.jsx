import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CaseSelector from "@/components/command/CaseSelector";
import BankAppSim from "@/components/command/BankAppSim";
import AtmSim from "@/components/command/AtmSim";
import PageHeader from "@/components/command/PageHeader";
import { cases } from "@/lib/investigationData";
import { Snowflake, Check, Eye, EyeOff, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

const scenarioFromStatus = { frozen: "freeze", active: "normal", monitoring: "normal" };
const modes = [
  { value: "normal", label: "No freeze", icon: ShieldX },
  { value: "freeze", label: "Silent freeze", icon: Snowflake },
  { value: "error", label: "Declined (error)", icon: ShieldAlert },
];

// Tinted alert treatment matching the severity badges used elsewhere in the app:
// a pale red field with a red outline and a deep red label. The label and the
// Snowflake icon both inherit `text-red-700`, which is 5.91:1 on this fill —
// white would be ~1.1:1 and effectively invisible, so the icon recolours with the
// text rather than staying white.
// `px-3` trims the default button padding so it sits comfortably in the row.
// `h-9` + the 1px border give this button the exact same box model as the
// bordered controls beside it, so all three measure 36px identically.
const FREEZE_ACTION_CLASS = "h-9 border border-red-200 px-3 bg-red-50 text-red-700 shadow-sm hover:bg-red-100";
// Muted completed state, matching the emerald treatment used elsewhere (CaseDetails).
const FREEZE_DONE_CLASS = "h-9 border border-transparent px-3 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-100";

export default function FreezeSimulation() {
  const [searchParams] = useSearchParams();
  const requestedCaseId = searchParams.get("case");
  const initialCase = cases.find((item) => item.id === requestedCaseId) ?? cases[0];
  const [caseId, setCaseId] = useState(initialCase.id);
  const [mode, setMode] = useState(scenarioFromStatus[initialCase.status] ?? "normal");
  const c = cases.find((x) => x.id === caseId);

  /**
   * Prototype-only freeze state, keyed by case id so the flag can never leak from
   * one case to another. Nothing here calls a bank, an API, or any external
   * service — confirming only flips local React state on this page.
   */
  const [frozenCases, setFrozenCases] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const freezeTriggered = frozenCases[caseId] ?? false;
  // The action button and the scenario selector must never disagree. Whenever the
  // simulation is in the silent-freeze state — whether the officer picked it by
  // hand or triggered it here — the account reads as already frozen.
  const isFrozen = freezeTriggered || mode === "freeze";

  const onCaseChange = (id) => {
    setCaseId(id);
    const cs = cases.find((x) => x.id === id);
    // Returning to a case we already froze must still show the frozen simulation.
    setMode(frozenCases[id] ? "freeze" : scenarioFromStatus[cs.status] ?? "normal");
  };

  const confirmFreeze = () => {
    setFrozenCases((prev) => ({ ...prev, [caseId]: true }));
    setMode("freeze");
    setConfirmOpen(false);
  };

  const reality =
    mode === "freeze"
      ? {
          title: "Silent lien ACTIVE",
          tone: "text-emerald-600",
          badge: "bg-emerald-500/10 text-emerald-600",
          card: "border-emerald-200",
          rows: [
            ["Account", `${c.account} (${c.bank})`],
            ["Debits", "Blocked silently"],
            ["Credits", "Permitted (trap incoming funds)"],
            ["Customer alert", "None"],
            ["Balance shown to holder", "Normal"],
          ],
        }
      : mode === "error"
      ? {
          title: "Transaction declined",
          tone: "text-red-600",
          badge: "bg-red-500/10 text-red-600",
          card: "border-red-200",
          rows: [
            ["Account", `${c.account} (${c.bank})`],
            ["Debits", "Declined by bank"],
            ["Customer alert", "Decline error shown"],
            ["Balance shown to holder", "Normal"],
          ],
        }
      : {
          title: "No freeze — normal banking",
          tone: "text-blue-600",
          badge: "bg-blue-500/10 text-blue-600",
          card: "border-blue-200",
          rows: [
            ["Account", `${c.account} (${c.bank})`],
            ["Debits", "Permitted"],
            ["Credits", "Permitted"],
            ["Customer alert", "None"],
            ["Balance shown to holder", "Normal"],
          ],
        };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Silent Bank Freeze Simulation"
        description="Case-specific, real-time preview of what the suspect experiences."
      />

      <div className="flex flex-wrap items-center gap-4">
        <CaseSelector cases={cases} value={caseId} onValueChange={onCaseChange} className="w-72 h-9 py-0" />
        <Button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={isFrozen}
          className={isFrozen ? FREEZE_DONE_CLASS : FREEZE_ACTION_CLASS}
        >
          {isFrozen ? <Check /> : <Snowflake />}
          {isFrozen ? "Mule Account Frozen" : "Freeze Mule Account"}
        </Button>
        <div className="flex h-9 items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-1">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "flex h-6 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                mode === m.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/70"
              )}
            >
              <m.icon className="h-3.5 w-3.5" /> {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={reality.card}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className={cn("h-4 w-4", reality.tone)} /> Officer reality
            </CardTitle>
            <Badge className={reality.badge}>{reality.title}</Badge>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {reality.rows.map(([k, v]) => (
              <p key={k}>
                <span className="text-muted-foreground">{k}:</span> {v}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <EyeOff className="h-4 w-4" /> Suspect perception
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {mode === "freeze" ? (
              <>
                <p>• App opens normally; balance appears intact.</p>
                <p>• Every UPI / transfer attempt shows &quot;Processing…&quot; and never completes.</p>
                <p>• ATM loops on &quot;Processing your transaction&quot; and never dispenses cash.</p>
                <p>• No notification, SMS, or error code reveals a freeze.</p>
              </>
            ) : mode === "error" ? (
              <>
                <p>• App shows a &quot;Transaction declined&quot; error.</p>
                <p>• ATM screen reads &quot;Transaction declined — contact your branch.&quot;</p>
                <p>• The suspect is alerted that something failed (not silent).</p>
              </>
            ) : (
              <>
                <p>• App works normally; transfers complete instantly.</p>
                <p>• ATM dispenses cash as usual.</p>
                <p>• No restrictions — account is fully operational.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4" /> Suspect's banking app
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BankAppSim mode={mode} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Snowflake className="h-4 w-4" /> ATM withdrawal attempt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AtmSim mode={mode} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-red-600">
                <Snowflake className="h-4 w-4" />
              </span>
              <DialogTitle>Freeze Mule Account?</DialogTitle>
            </div>
            <DialogDescription>
              {c.bank} · {c.branch} · {c.id}
            </DialogDescription>
          </DialogHeader>

          <dl className="grid gap-3 rounded-md border px-3 py-2.5">
            {[
              ["Case", c.id],
              ["Account", c.account],
              ["Account Type", "Mule Account"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="flex items-start gap-1.5 rounded-md border border-dashed border-border bg-muted/20 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>
              This action is part of a prototype simulation and will not freeze, block, debit, or
              otherwise affect any real bank account. Confirming will only update the simulated state
              on this page.
            </span>
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className={FREEZE_ACTION_CLASS} onClick={confirmFreeze}>
              <Snowflake />
              Confirm Freeze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}