import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Download, FileText } from "lucide-react";
import { formatINR } from "@/lib/investigationData";
import { getCase, getDashboardData } from "@/lib/api";
import CaseSelector from "@/components/command/CaseSelector";

export default function EvidenceReportExport({ initialCaseId }) {
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState(initialCaseId || "");
  const [caseRecord, setCaseRecord] = useState(null);
  const [loadError, setLoadError] = useState("");
  const items = [];

  useEffect(() => {
    let active = true;
    getDashboardData()
      .then((data) => {
        if (!active) return;
        const liveCases = (data.cases || []).map((item) => ({
          ...item,
          id: String(item.id),
          title: item.description || item.complaint_number || item.case_number,
        }));
        setCases(liveCases);
        const selected = liveCases.find((item) =>
          [item.id, String(item.complaint_id), item.case_number].includes(String(initialCaseId || ""))
        );
        setCaseId(selected?.id || liveCases[0]?.id || "");
        setLoadError("");
      })
      .catch((error) => {
        if (active) setLoadError(error.message || "Live cases are unavailable.");
      });
    return () => {
      active = false;
    };
  }, [initialCaseId]);

  useEffect(() => {
    if (!caseId) return undefined;
    let active = true;
    setCaseRecord(null);
    getCase(caseId)
      .then((data) => {
        if (active) {
          setCaseRecord({
            ...data,
            id: String(data.id),
            title: data.title || data.case_number || data.complaint_number,
          });
          setLoadError("");
        }
      })
      .catch((error) => {
        if (active) setLoadError(error.message || "Live case details are unavailable.");
      });
    return () => {
      active = false;
    };
  }, [caseId]);

  const c = caseRecord || { id: caseId || "—", title: "Live case details unavailable" };

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
        <Button onClick={() => window.print()} disabled={!caseRecord}>
          <Printer className="h-4 w-4" /> Print report
        </Button>
        <Button onClick={exportCSV} variant="outline" disabled={!caseRecord}>
          <Download className="h-4 w-4" /> Export evidence (CSV)
        </Button>
      </div>
      {loadError && <p role="alert" className="text-sm text-amber-800">{loadError}</p>}
      <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-950">
        Case fields below use live PostgreSQL data. Evidence records are not stored by the backend; this report contains no evidence items.
      </p>

      <Card id="evidence-report-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" /> Evidence Report — {c.id}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <Info label="Case" value={c.title} />
            <Info label="FIR" value="Not stored" />
            <Info label="Officer" value={c.assigned_to || "Not assigned in case API"} />
            <Info label="Station" value="Not stored" />
            <Info label="Amount" value={c.amount == null ? "—" : formatINR(c.amount)} />
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