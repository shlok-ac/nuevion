import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CaseReportExport from "@/components/command/CaseReportExport";
import EvidenceReportExport from "@/components/command/EvidenceReportExport";
import PageHeader from "@/components/command/PageHeader";
import { FileText, FolderArchive } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cases } from "@/lib/investigationData";

export default function Export() {
  const [searchParams] = useSearchParams();
  const requestedCaseId = searchParams.get("case");
  const initialCaseId = cases.some((item) => item.id === requestedCaseId) ? requestedCaseId : undefined;
  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Export" description="Generate and export case reports and evidence reports." />
      <Tabs defaultValue="case">
        <TabsList>
          <TabsTrigger value="case" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Case Report
          </TabsTrigger>
          <TabsTrigger value="evidence" className="flex items-center gap-2">
            <FolderArchive className="h-4 w-4" /> Evidence Report
          </TabsTrigger>
        </TabsList>
        <TabsContent value="case">
          <CaseReportExport initialCaseId={initialCaseId} />
        </TabsContent>
        <TabsContent value="evidence">
          <EvidenceReportExport initialCaseId={initialCaseId} />
        </TabsContent>
      </Tabs>

      {/* Print rules are global, so this is kept last: it leaves PageHeader as the
          first child, which stops `space-y-6` from pushing this page's heading
          below the ones on every other page. */}
      <style>{`@media print { body * { visibility: hidden !important; } #case-report-print, #case-report-print *, #evidence-report-print, #evidence-report-print * { visibility: visible !important; } #case-report-print, #evidence-report-print { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
    </div>
  );
}