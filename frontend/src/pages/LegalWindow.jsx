import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CaseSelector from "@/components/command/CaseSelector";
import { Printer, Download, FileText } from "lucide-react";
import FreezeNoticeDoc from "@/components/command/FreezeNoticeDoc";
import PageHeader from "@/components/command/PageHeader";
import { getCase, getDashboardData } from "@/lib/api";
import { useLocation, useSearchParams } from "react-router-dom";

export default function LegalWindow() {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const requestedCaseId = searchParams.get("case") || state?.caseId || "";
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState("");
  const [activeCase, setActiveCase] = useState(null);
  const [loadError, setLoadError] = useState("");
  const noticeRef = useRef(null);

  const [form, setForm] = useState({
    officerName: "",
    refNo: "",
    date: new Date().toLocaleDateString("en-IN"),
    station: "",
    bank: "",
    branch: "",
    account: state?.account || "",
    accountHolder: "",
    amount: "",
    firNo: "",
    officer: "",
    victim: "",
  });

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
          [item.id, String(item.complaint_id), item.case_number].includes(String(requestedCaseId))
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
  }, [requestedCaseId]);

  useEffect(() => {
    if (!caseId) return undefined;
    let active = true;
    setActiveCase(null);
    getCase(caseId)
      .then((data) => {
        if (!active) return;
        const liveCase = {
          ...data,
          id: String(data.id),
          title: data.title || data.case_number || data.complaint_number,
          bank: data.bank_name || "",
          branch: data.branch || data.location || "",
          account: data.account || "",
          victim: data.victim || "",
        };
        setActiveCase(liveCase);
        setForm((current) => ({
          ...current,
          bank: liveCase.bank,
          branch: liveCase.branch,
          account: liveCase.account,
          amount: liveCase.amount ?? "",
          victim: liveCase.victim,
          station: "",
          firNo: "",
          officer: "",
          officerName: "",
          accountHolder: "",
          refNo: "",
        }));
        setLoadError("");
      })
      .catch((error) => {
        if (active) setLoadError(error.message || "Live case details are unavailable.");
      });
    return () => {
      active = false;
    };
  }, [caseId]);

  const onCaseChange = (id) => {
    setCaseId(id);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    const el = noticeRef.current;
    if (!el || !activeCase) return;
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
        description="Prototype notice preview using supported live case fields; unsupported legal details remain blank."
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
            {loadError && <p role="alert" className="text-xs text-amber-800">{loadError}</p>}
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-950">
              Prototype only — no notice is issued or sent. FIR, officer, station, and account-holder details are not available from the case API.
            </p>
            <Field label="Nodal officer" value={form.officerName} onChange={set("officerName")} />
            <Field label="Bank" value={form.bank} onChange={set("bank")} />
            <Field label="Branch" value={form.branch} onChange={set("branch")} />
            <Field label="Account number" value={form.account} onChange={set("account")} />
            <Field label="Account holder" value={form.accountHolder} onChange={set("accountHolder")} />
            <Field label="Reported amount (₹)" type="number" value={form.amount} onChange={set("amount")} />
            <Field label="FIR No." value={form.firNo} onChange={set("firNo")} />
            <Field label="Investigating officer" value={form.officer} onChange={set("officer")} />
            <Field label="Station" value={form.station} onChange={set("station")} />
            <Field label="Reference No." value={form.refNo} onChange={set("refNo")} />
            <Field label="Date" value={form.date} onChange={set("date")} />
            <div className="flex gap-2 pt-2">
              <Button onClick={handlePrint} className="flex-1" disabled={!activeCase}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button onClick={handleDownload} variant="outline" className="flex-1" disabled={!activeCase}>
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