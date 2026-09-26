import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Download, FileText } from "lucide-react";
import { cases, evidenceByCase, formatINR } from "@/lib/investigationData";
import CaseSelector from "@/components/command/CaseSelector";

export default function EvidenceReportExport({ initialCaseId }) {
  const [caseId, setCaseId] = useState(initialCaseId ?? cases[0].id);
  const c = cases.find((x) => x.id === caseId);
  const items = evidenceByCase[caseId] || [];

  const exportCSV = () => {
    const rows = [
      ["Evidence ID", "Type", "Description", "Source", "Collected", "Hash"],
      ...items.map((e) => [e.id, e.type, e.desc, e.source, e.collected, e.hash]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${x}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EvidenceReport_${caseId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <CaseSelector cases={cases} value={caseId} onValueChange={setCaseId} className="w-72" />
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print report
        </Button>
        <Button onClick={exportCSV} variant="outline">
          <Download className="h-4 w-4" /> Export evidence (CSV)
        </Button>
      </div>

      <Card id="evidence-report-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" /> Evidence Report — {c.id}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <Info label="Case" value={c.title} />
            <Info label="FIR" value={c.firNo} />
            <Info label="Officer" value={c.officer} />
            <Info label="Station" value={c.station} />
            <Info label="Amount" value={formatINR(c.amount)} />
            <Info label="Compiled" value={new Date().toLocaleDateString("en-IN")} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Evidence chain ({items.length})</p>
            <div className="rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-left">Source</th>
                    <th className="p-2 text-left">Collected</th>
                    <th className="p-2 text-left">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="p-2 font-mono">{e.id}</td>
                      <td className="p-2">{e.type}</td>
                      <td className="p-2">{e.desc}</td>
                      <td className="p-2">{e.source}</td>
                      <td className="p-2">{e.collected}</td>
                      <td className="p-2 font-mono text-[10px]">{e.hash}</td>
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