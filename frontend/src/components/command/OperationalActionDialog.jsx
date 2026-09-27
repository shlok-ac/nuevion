import { useState } from "react";
import { FileLock2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const panelLabelClass = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80";
const EVIDENCE_ITEMS = ["CCTV footage", "ATM journal / EJ records", "Transaction records"];
const VERIFICATION_UNITS = ["Local Unit", "Cyber Crime Patrol", "Nodal Investigation Team"];
const VERIFICATION_PRIORITIES = ["High", "Critical", "Normal"];
const WINDOW_PATTERN = /^(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})$/;
const DEFAULT_WINDOW = "Not specified";

/**
 * Evidence has to be preserved either side of the predicted window, so
 * "20:00–22:00" becomes "19:00–23:00". Wraps cleanly past midnight.
 */
export function widenWindow(windowLabel, minutes = 60) {
  const match = typeof windowLabel === "string" ? windowLabel.trim().match(WINDOW_PATTERN) : null;
  if (!match) return DEFAULT_WINDOW;

  const pad = (total) =>
    `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

  const start = (Number(match[1]) * 60 + Number(match[2]) - minutes + 1440) % 1440;
  const end = (Number(match[3]) * 60 + Number(match[4]) + minutes) % 1440;
  return `${pad(start)}–${pad(end)}`;
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-1.5 last:border-b-0">
      <span className={cn("shrink-0", panelLabelClass)}>{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function DetailList({ label, items }) {
  return (
    <div className="border-b border-border/60 py-1.5">
      <p className={panelLabelClass}>{label}</p>
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-1.5 text-sm text-foreground">
            <span className="h-1 w-1 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Compact confirmation panel shown before an operational action is recorded.
 * Renders the body that matches the action, then hands the chosen values back
 * to the page so it can persist the action record.
 */
export default function OperationalActionDialog({ action, caseItem, atm, open, onOpenChange, onConfirm, busy = false }) {
  const [unit, setUnit] = useState(VERIFICATION_UNITS[0]);
  const [priority, setPriority] = useState(VERIFICATION_PRIORITIES[0]);

  if (!action) return null;

  const { icon: Icon, actionType } = action;
  const handleOpenChange = (next) => {
    if (!next) onOpenChange(false);
  };

  const handleConfirm = () => onConfirm({ unit, priority });

  const renderBody = () => {
    switch (actionType) {
      case "bank_nodal_request":
        return (
          <div className="rounded-md border">
            <div className="px-3 py-1.5">
              <DetailRow label="Bank" value={caseItem?.bank} />
              <DetailRow label="Case" value={caseItem?.id} />
              <DetailRow label="ATM" value={atm?.atm} />
              <DetailRow label="Risk Score" value={atm?.riskScore} />
              <DetailRow label="Predicted Window" value={atm?.predictedWindow ?? DEFAULT_WINDOW} />
              <DetailRow label="Purpose" value="Fraud investigation coordination" />
            </div>
          </div>
        );

      case "evidence_preservation":
        return (
          <div className="rounded-md border">
            <div className="px-3 py-1.5">
              <DetailRow label="ATM" value={atm?.atm} />
              <DetailRow label="Location" value={atm?.location} />
              <DetailList label="Evidence" items={EVIDENCE_ITEMS} />
              <DetailRow label="Time Window" value={widenWindow(atm?.predictedWindow)} />
            </div>
          </div>
        );

      case "field_verification":
        return (
          <div className="space-y-3">
            <div className="rounded-md border px-3 py-1.5">
              <DetailRow label="ATM" value={`${atm?.atm} — ${atm?.location}`} />
              <DetailRow label="Predicted Window" value={atm?.predictedWindow ?? DEFAULT_WINDOW} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className={panelLabelClass}>Assigned Unit</p>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {VERIFICATION_UNITS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className={panelLabelClass}>Priority</p>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {VERIFICATION_PRIORITIES.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="rounded-md border px-3 py-1.5">
            <DetailRow label="ATM" value={`${atm?.atm} — ${atm?.location}`} />
            <DetailRow label="Predicted Window" value={atm?.predictedWindow ?? DEFAULT_WINDOW} />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <DialogTitle>{action.panelTitle}</DialogTitle>
          </div>
          <DialogDescription>
            {atm?.atm ? `${atm.atm} · ${atm.location} · ${caseItem?.id}` : caseItem?.id}
          </DialogDescription>
        </DialogHeader>

        {renderBody()}

        <p className="flex items-start gap-1.5 rounded-md border border-dashed border-border bg-muted/20 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
          <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
          Prototype only — this records the operational action for the case file. Nothing is sent to the bank, field unit or monitoring system.
        </p>

        <DialogFooter>
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={busy} className="gap-1.5">
            <FileLock2 className="h-3.5 w-3.5" />
            {action.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
