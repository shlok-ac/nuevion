import { useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, Upload, Send, SendHorizontal, Check, ShieldCheck, Landmark, Hash, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { muleAccounts as initialMuleAccounts, formatINR } from "@/lib/investigationData";
import { BANK_SYNC_STATUS, getBankSyncStatusLabel } from "@/lib/muleAccountStore";
import { useMuleAccountSync } from "@/hooks/useMuleAccountSync";
import { cn } from "@/lib/utils";

const RISK_LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const ACCOUNT_STATUSES = ["FROZEN", "UNDER_REVIEW", "ACTIVE", "MONITORED", "CLEARED"];

const riskTone = {
  CRITICAL: "bg-red-500/10 text-red-600",
  HIGH: "bg-orange-500/10 text-orange-600",
  MEDIUM: "bg-amber-500/10 text-amber-600",
  LOW: "bg-emerald-500/10 text-emerald-600",
};
const statusTone = {
  FROZEN: "bg-blue-500/10 text-blue-600",
  UNDER_REVIEW: "bg-amber-500/10 text-amber-600",
  ACTIVE: "bg-red-500/10 text-red-600",
  MONITORED: "bg-amber-500/10 text-amber-600",
  CLEARED: "bg-muted text-muted-foreground",
};

/** Guards the badge lookups so an unrecognised imported value can never render `undefined` classes. */
const toEnum = (value, allowed, fallback) => {
  const normalised = String(value || "").trim().toUpperCase().replace(/\s+/g, "_");
  return allowed.includes(normalised) ? normalised : fallback;
};

/** Splits one CSV line, honouring quoted cells so a `"₹42,00,000"` amount survives the comma. */
const parseCsvLine = (line) => {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
};

/** Accepts `4200000`, `42,00,000` and `₹42,00,000` alike. */
const parseAmount = (value) => Number(String(value ?? "").replace(/[^\d.]/g, "")) || 0;

const blank = {
  accountId: "",
  bank: "",
  linkedCases: "",
  totalInflow: "",
  totalOutflow: "",
  risk: "MEDIUM",
  status: "UNDER_REVIEW",
};

/** Reused by the confirmation and detail panels — a labelled row inside a plain box. */
function DetailRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-1.5 last:border-b-0">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

/**
 * Mule Account Database table.
 *
 * Deliberately built on the same primitives as `SuspectTable` — identical
 * toolbar row, `rounded-lg border` table shell, badge classes, hover states and
 * row density — so the two registries read as one page. Only the columns, the
 * data and the trailing Bank Sync action differ.
 */
export default function MuleAccountTable() {
  const [rows, setRows] = useState(initialMuleAccounts);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(null);
  const [sendTarget, setSendTarget] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef(null);

  const { getStatus, markSent } = useMuleAccountSync();

  const filtered = rows.filter(
    (m) =>
      (status === "all" || m.status === status) &&
      (m.accountId.toLowerCase().includes(q.toLowerCase()) ||
        m.bank.toLowerCase().includes(q.toLowerCase()) ||
        m.linkedCases.some((c) => c.toLowerCase().includes(q.toLowerCase())))
  );

  // The bulk action covers every account in the registry, not just the filtered
  // view, so the count in the dialog always matches what the table shows.
  const unsentAccountIds = rows
    .map((m) => m.accountId)
    .filter((accountId) => getStatus(accountId) !== BANK_SYNC_STATUS.sent);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addMuleAccount = (e) => {
    e.preventDefault();
    // Newest first: the new record lands at the top rather than below the
    // existing registry, matching the mock-data ordering.
    setRows((r) => [
      {
        accountId: form.accountId.trim(),
        bank: form.bank.trim() || "—",
        linkedCases: form.linkedCases
          ? form.linkedCases.split(",").map((x) => x.trim()).filter(Boolean)
          : [],
        totalInflow: Number(form.totalInflow) || 0,
        totalOutflow: Number(form.totalOutflow) || 0,
        risk: form.risk,
        status: form.status,
      },
      ...r,
    ]);
    setForm(blank);
    setAddOpen(false);
  };

  /**
   * CSV import, mirroring the Suspect Database's Import. Expected header:
   * Account ID, Bank, Linked Cases, Total Inflow, Total Outflow, Risk, Status.
   * Linked cases are pipe-separated so they survive the comma delimiter.
   */
  const onImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      const parsed = lines.slice(1).map((line, i) => {
        const cols = parseCsvLine(line);
        return {
          accountId: cols[0] || `XXXXXX000${i + 1}`,
          bank: cols[1] || "—",
          linkedCases: cols[2] ? cols[2].split("|").map((x) => x.trim()).filter(Boolean) : [],
          totalInflow: parseAmount(cols[3]),
          totalOutflow: parseAmount(cols[4]),
          risk: toEnum(cols[5], RISK_LEVELS, "MEDIUM"),
          status: toEnum(cols[6], ACCOUNT_STATUSES, "UNDER_REVIEW"),
        };
      });
      if (!parsed.length) return;
      // Newest first: imported rows go above the existing registry, and stay in
      // file order among themselves.
      setRows((r) => [...parsed, ...r]);
      setNotice(`${parsed.length} mule accounts imported in the prototype.`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /** Prototype-only: flips local state, never touches the network. */
  const confirmSend = async () => {
    const accountId = sendTarget?.accountId;
    setSendTarget(null);
    if (!accountId) return;
    const { records } = await markSent([accountId], { via: "single" });
    if (records.length) setNotice("Mule account data marked as sent in the prototype.");
  };

  /** Prototype-only: flips local state for every unsent account, never the network. */
  const confirmSendAll = async () => {
    setBulkOpen(false);
    const { records } = await markSent(unsentAccountIds, { via: "bulk" });
    if (records.length) setNotice(`${records.length} mule accounts marked as sent in the prototype.`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search account ID, bank…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="FROZEN">Frozen</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under review</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="MONITORED">Monitored</SelectItem>
            <SelectItem value="CLEARED">Cleared</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Import
        </Button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onImport} />
        <Button
          variant="outline"
          onClick={() => setBulkOpen(true)}
          disabled={unsentAccountIds.length === 0}
          title={
            unsentAccountIds.length === 0
              ? "All mule accounts are already marked as sent"
              : `Simulate submission for ${unsentAccountIds.length} unsent account(s)`
          }
        >
          <SendHorizontal className="h-4 w-4" /> Send All Unsent
        </Button>
        <Button
          onClick={() => {
            setForm(blank);
            setAddOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add Mule Account
        </Button>
      </div>

      {notice && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          {notice}
        </p>
      )}

      <div className="rounded-lg border">
        <Table className="min-w-[880px]">
          <TableHeader>
            <TableRow>
              <TableHead>Account ID</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Linked cases</TableHead>
              <TableHead>Total inflow</TableHead>
              <TableHead>Total outflow</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[122px] pr-[30px] text-center">Bank Sync</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => {
              const isSent = getStatus(m.accountId) === BANK_SYNC_STATUS.sent;
              return (
                <TableRow key={m.accountId} className="cursor-pointer" onClick={() => setOpen(m)}>
                  <TableCell className="font-mono text-xs">{m.accountId}</TableCell>
                  <TableCell>{m.bank}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.linkedCases.join(", ")}</TableCell>
                  <TableCell className="text-xs tabular-nums">{formatINR(m.totalInflow)}</TableCell>
                  <TableCell className="text-xs tabular-nums">{formatINR(m.totalOutflow)}</TableCell>
                  <TableCell>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", riskTone[m.risk])}>{m.risk}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", statusTone[m.status])}>
                      {m.status.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="w-[122px] pr-[30px] text-center" onClick={(e) => e.stopPropagation()}>
                    {isSent ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="h-7 w-[84px] gap-1.5 px-2 text-xs text-emerald-600"
                      >
                        <Check className="h-3.5 w-3.5" /> Sent
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-[84px] gap-1.5 px-2 text-xs"
                        onClick={() => setSendTarget(m)}
                      >
                        <Send className="h-3.5 w-3.5" /> Send
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Individual send confirmation — no browser alert, no network call. */}
      <Dialog open={!!sendTarget} onOpenChange={(v) => !v && setSendTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
                <Send className="h-4 w-4" />
              </span>
              <DialogTitle>Send Mule Account Data?</DialogTitle>
            </div>
            <DialogDescription>
              {sendTarget ? `${sendTarget.accountId} · ${sendTarget.bank}` : ""}
            </DialogDescription>
          </DialogHeader>

          {sendTarget && (
            <div className="rounded-md border px-3 py-1.5">
              <DetailRow label="Account" value={sendTarget.accountId} />
              <DetailRow label="Bank" value={sendTarget.bank} />
              <DetailRow label="Linked case" value={sendTarget.linkedCases.join(", ") || "—"} />
              <DetailRow label="Risk" value={sendTarget.risk} />
            </div>
          )}

          <p className="flex items-start gap-1.5 rounded-md border border-dashed border-border bg-muted/20 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>
              This is a prototype action. No data will be transmitted to any real bank, financial institution, or
              external server. Confirming will only simulate the banking-server submission and update the
              account&apos;s local prototype status.
            </span>
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSendTarget(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmSend} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Simulate Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk send confirmation — operates on every unsent account in the registry. */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
                <SendHorizontal className="h-4 w-4" />
              </span>
              <DialogTitle>Send All Unsent Mule Accounts?</DialogTitle>
            </div>
            <DialogDescription>Accounts pending submission: {unsentAccountIds.length}</DialogDescription>
          </DialogHeader>

          <p className="flex items-start gap-1.5 rounded-md border border-dashed border-border bg-muted/20 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>
              This is a prototype action. No data will be transmitted to any real bank, financial institution, or
              external server. Confirming will simulate submission for all currently unsent mule accounts.
            </span>
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmSendAll} className="gap-1.5">
              <SendHorizontal className="h-3.5 w-3.5" />
              Simulate Send All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compact account detail — reuses the row click the suspect table already had. */}
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open?.accountId}
              <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">{open?.bank}</span>
            </DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-2 text-sm">
              <D icon={Landmark} label="Bank" value={open.bank} />
              <D icon={Hash} label="Linked cases" value={open.linkedCases.join(", ") || "—"} />
              <D icon={Hash} label="Risk" value={open.risk} />
              <D icon={ArrowDownToLine} label="Total inflow" value={formatINR(open.totalInflow)} />
              <D icon={ArrowUpFromLine} label="Total outflow" value={formatINR(open.totalOutflow)} />
              <D
                icon={Send}
                label="Bank sync"
                value={`${getBankSyncStatusLabel(getStatus(open.accountId))}${
                  getStatus(open.accountId) === BANK_SYNC_STATUS.sent ? " (prototype only)" : ""
                }`}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add mule account</DialogTitle>
          </DialogHeader>
          <form onSubmit={addMuleAccount} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Account ID" value={form.accountId} onChange={setField("accountId")} required />
              <Field label="Bank" value={form.bank} onChange={setField("bank")} />
              <Field label="Total inflow" type="number" value={form.totalInflow} onChange={setField("totalInflow")} />
              <Field label="Total outflow" type="number" value={form.totalOutflow} onChange={setField("totalOutflow")} />
              <div className="sm:col-span-2">
                <Field label="Linked cases (comma-sep)" value={form.linkedCases} onChange={setField("linkedCases")} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FROZEN">Frozen</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under review</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="MONITORED">Monitored</SelectItem>
                    <SelectItem value="CLEARED">Cleared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Risk</Label>
                <Select value={form.risk} onValueChange={(v) => setForm((f) => ({ ...f, risk: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add mule account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={onChange} required={required} />
    </div>
  );
}

function D({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="w-28 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
