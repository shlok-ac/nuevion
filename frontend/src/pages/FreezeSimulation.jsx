import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BankAppSim from "@/components/command/BankAppSim";
import AtmSim from "@/components/command/AtmSim";
import { cases } from "@/lib/investigationData";
import { Snowflake, Eye, EyeOff, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

const scenarioFromStatus = { frozen: "freeze", active: "normal", monitoring: "normal" };
const modes = [
  { value: "normal", label: "No freeze", icon: ShieldX },
  { value: "freeze", label: "Silent freeze", icon: Snowflake },
  { value: "error", label: "Declined (error)", icon: ShieldAlert },
];

export default function FreezeSimulation() {
  const [caseId, setCaseId] = useState(cases[0].id);
  const [mode, setMode] = useState(scenarioFromStatus[cases[0].status] ?? "normal");
  const c = cases.find((x) => x.id === caseId);

  const onCaseChange = (id) => {
    setCaseId(id);
    const cs = cases.find((x) => x.id === id);
    setMode(scenarioFromStatus[cs.status] ?? "normal");
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
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Silent Bank Freeze Simulation</h2>
        <p className="text-sm text-muted-foreground">
          Case-specific, real-time preview of what the suspect experiences. Switch the scenario to see normal, silent-freeze,
          and declined states.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={caseId} onValueChange={onCaseChange}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cases.map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.id} — {x.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
                mode === m.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
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
    </div>
  );
}