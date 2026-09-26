import { useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Upload, MapPin, Phone, Hash, Building2 } from "lucide-react";
import { suspects as initialSuspects } from "@/lib/investigationData";
import { cn } from "@/lib/utils";

const riskTone = {
  high: "bg-red-500/10 text-red-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-emerald-500/10 text-emerald-600",
};
const statusTone = {
  identified: "bg-blue-500/10 text-blue-600",
  arrested: "bg-red-500/10 text-red-600",
  absconding: "bg-amber-500/10 text-amber-600",
  cleared: "bg-muted text-muted-foreground",
};
const blank = {
  name: "",
  aliases: "",
  phone: "",
  aadhaar: "",
  bank: "",
  accounts: "1",
  location: "",
  status: "identified",
  risk: "medium",
  linkedCases: "",
};

export default function SuspectTable() {
  const [rows, setRows] = useState(initialSuspects);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const fileRef = useRef(null);

  const filtered = rows.filter(
    (s) =>
      (status === "all" || s.status === status) &&
      (s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.id.toLowerCase().includes(q.toLowerCase()) ||
        s.bank.toLowerCase().includes(q.toLowerCase()))
  );

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addSuspect = (e) => {
    e.preventDefault();
    const id = "S-" + String(rows.length + 1).padStart(2, "0");
    setRows([
      ...rows,
      {
        ...form,
        id,
        accounts: Number(form.accounts) || 1,
        linkedCases: form.linkedCases ? form.linkedCases.split(",").map((x) => x.trim()).filter(Boolean) : [],
      },
    ]);
    setForm(blank);
    setAddOpen(false);
  };

  const onImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      const parsed = lines.slice(1).map((line, i) => {
        const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
        return {
          id: cols[0] || `S-IMP-${i + 1}`,
          name: cols[1] || "—",
          aliases: cols[2] || "—",
          phone: cols[3] || "—",
          aadhaar: cols[4] || "—",
          bank: cols[5] || "—",
          accounts: Number(cols[6]) || 1,
          location: cols[7] || "—",
          status: cols[8] || "identified",
          risk: cols[9] || "medium",
          linkedCases: cols[10] ? cols[10].split("|").map((x) => x.trim()).filter(Boolean) : [],
        };
      });
      setRows((r) => [...r, ...parsed]);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, bank…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="identified">Identified</SelectItem>
            <SelectItem value="arrested">Arrested</SelectItem>
            <SelectItem value="absconding">Absconding</SelectItem>
            <SelectItem value="cleared">Cleared</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Import
        </Button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onImport} />
        <Button
          onClick={() => {
            setForm(blank);
            setAddOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add suspect
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Suspect ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Linked cases</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => setOpen(s)}>
                <TableCell className="font-mono text-xs">{s.id}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.bank}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.linkedCases.join(", ")}</TableCell>
                <TableCell>
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", statusTone[s.status])}>{s.status}</span>
                </TableCell>
                <TableCell>
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", riskTone[s.risk])}>{s.risk}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open?.name}
              <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{open?.id}</span>
            </DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-2 text-sm">
              <D icon={Phone} label="Phone" value={open.phone} />
              <D icon={Hash} label="Aadhaar" value={open.aadhaar} />
              <D icon={Building2} label="Bank" value={open.bank} />
              <D icon={Building2} label="Accounts" value={String(open.accounts)} />
              <D icon={MapPin} label="Location" value={open.location} />
              <D icon={Hash} label="Aliases" value={open.aliases} />
              <D icon={Hash} label="Linked cases" value={open.linkedCases.join(", ")} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add suspect</DialogTitle>
          </DialogHeader>
          <form onSubmit={addSuspect} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={form.name} onChange={setField("name")} required />
              <Field label="Aliases" value={form.aliases} onChange={setField("aliases")} />
              <Field label="Phone" value={form.phone} onChange={setField("phone")} />
              <Field label="Aadhaar" value={form.aadhaar} onChange={setField("aadhaar")} />
              <Field label="Bank" value={form.bank} onChange={setField("bank")} />
              <Field label="Accounts" type="number" value={form.accounts} onChange={setField("accounts")} />
              <Field label="Location" value={form.location} onChange={setField("location")} />
              <Field label="Linked cases (comma-sep)" value={form.linkedCases} onChange={setField("linkedCases")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identified">Identified</SelectItem>
                    <SelectItem value="arrested">Arrested</SelectItem>
                    <SelectItem value="absconding">Absconding</SelectItem>
                    <SelectItem value="cleared">Cleared</SelectItem>
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
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add suspect</Button>
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