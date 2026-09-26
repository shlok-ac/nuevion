import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CaseSelector from "@/components/command/CaseSelector";
import { Printer, Download, FileText } from "lucide-react";
import FreezeNoticeDoc from "@/components/command/FreezeNoticeDoc";
import PageHeader from "@/components/command/PageHeader";
import { cases } from "@/lib/investigationData";
import { useLocation, useSearchParams } from "react-router-dom";

export default function LegalWindow() {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const initialCase = cases.find((c) => c.id === searchParams.get("case"))
    ?? cases.find((c) => c.muleChainId === state?.caseId)
    ?? cases[0];
  const [caseId, setCaseId] = useState(initialCase.id);
  const noticeRef = useRef(null);

  const activeCase = cases.find((c) => c.id === caseId);
  const [form, setForm] = useState({
    officerName: "Nodal Officer (Anti-Fraud)",
    refNo: `CCU/${activeCase.id}/106/${new Date().getFullYear()}`,
    date: new Date().toLocaleDateString("en-IN"),
    station: activeCase.station,
    bank: state?.bank ?? activeCase.bank,
    branch: activeCase.branch,
    account: state?.account ?? activeCase.account,
    accountHolder: "—",
    amount: activeCase.amount,
    firNo: activeCase.firNo,
    officer: activeCase.officer,
    victim: activeCase.victim,
  });

  const onCaseChange = (id) => {
    setCaseId(id);
    const c = cases.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      refNo: `CCU/${c.id}/106/${new Date().getFullYear()}`,
      station: c.station,
      bank: c.bank,
      branch: c.branch,
      account: c.account,
      amount: c.amount,
      firNo: c.firNo,
      officer: c.officer,
      victim: c.victim,
    }));
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    const el = noticeRef.current;
    if (!el) return;
    const { default: html2canvas } = await import("html2canvas");
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save(`BNSS106_FreezeNotice_${caseId}.pdf`);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Legal Window — §106 BNSS Freeze Notice"
        description="One-click generation of the freeze notice addressed to bank nodal officers."
      />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" /> Notice details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Case</Label>
              <CaseSelector cases={cases} value={caseId} onValueChange={onCaseChange} />
            </div>
            <Field label="Nodal officer" value={form.officerName} onChange={set("officerName")} />
            <Field label="Bank" value={form.bank} onChange={set("bank")} />
            <Field label="Branch" value={form.branch} onChange={set("branch")} />
            <Field label="Account number" value={form.account} onChange={set("account")} />
            <Field label="Account holder" value={form.accountHolder} onChange={set("accountHolder")} />
            <Field label="Amount to freeze (₹)" type="number" value={form.amount} onChange={set("amount")} />
            <Field label="FIR No." value={form.firNo} onChange={set("firNo")} />
            <Field label="Investigating officer" value={form.officer} onChange={set("officer")} />
            <Field label="Station" value={form.station} onChange={set("station")} />
            <Field label="Reference No." value={form.refNo} onChange={set("refNo")} />
            <Field label="Date" value={form.date} onChange={set("date")} />
            <div className="flex gap-2 pt-2">
              <Button onClick={handlePrint} className="flex-1">
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button onClick={handleDownload} variant="outline" className="flex-1">
                <Download className="h-4 w-4" /> PDF
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Print or export to PDF.</p>
          </CardContent>
        </Card>

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mx-auto max-w-[800px] rounded-md bg-white shadow-sm">
            <FreezeNoticeDoc ref={noticeRef} data={form} />
          </div>
        </div>
      </div>

      {/* Print rules are global, so this is kept last: it leaves PageHeader as the
          first child, which stops `space-y-6` from pushing this page's heading
          below the ones on every other page. */}
      <style>{`@media print { body * { visibility: hidden !important; } #freeze-notice-print, #freeze-notice-print * { visibility: visible !important; } #freeze-notice-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; } }`}</style>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={onChange} />
    </div>
  );
}