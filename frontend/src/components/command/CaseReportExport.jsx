import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Download, FileText } from "lucide-react";
import { cases, suspects, formatINR } from "@/lib/investigationData";
import CaseSelector from "@/components/command/CaseSelector";

export default function CaseReportExport({ initialCaseId }) {
  const [caseId, setCaseId] = useState(initialCaseId ?? cases[0].id);
  const c = cases.find((x) => x.id === caseId);
  const linked = suspects.filter((s) => s.linkedCases.includes(caseId));

  const exportCSV = () => {
    const rows = [
      ["Suspect ID", "Name", "Bank", "Accounts", "Status", "Risk", "Location", "Linked Cases"],
      ...linked.map((s) => [s.id, s.name, s.bank, s.accounts, s.status, s.risk, s.location, s.linkedCases.join("|")]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${x}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CaseReport_${caseId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <CaseSelector
          cases={cases}
          value={caseId}
          onValueChange={setCaseId}
          className="w-72"
        />
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print report
        </Button>
        <Button onClick={exportCSV} variant="outline">
          <Download className="h-4 w-4" /> Export suspects (CSV)
        </Button>
      </div>

      <Card id="case-report-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" /> Case Report — {c.id}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <Info label="Title" value={c.title} />
            <Info label="Fraud type" value={c.fraudType} />
            <Info label="Victim" value={c.victim} />
            <Info label="Amount" value={formatINR(c.amount)} />
            <Info label="Bank" value={c.bank} />
            <Info label="Account" value={c.account} />
            <Info label="FIR" value={c.firNo} />
            <Info label="Officer" value={c.officer} />
            <Info label="Station" value={c.station} />
            <Info label="Filed" value={c.filedDate} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Linked suspects ({linked.length})</p>
            <div className="rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Bank</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {linked.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 font-mono">{s.id}</td>
                      <td className="p-2">{s.name}</td>
                      <td className="p-2">{s.bank}</td>
                      <td className="p-2">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between rounded-md border px-3 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}