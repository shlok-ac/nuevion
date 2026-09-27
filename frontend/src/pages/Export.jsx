import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CaseReportExport from "@/components/command/CaseReportExport";
import EvidenceReportExport from "@/components/command/EvidenceReportExport";
import { FileText, FolderArchive } from "lucide-react";

export default function Export() {
  return (
    <div className="space-y-4 p-6">
      <style>{`@media print { body * { visibility: hidden !important; } #case-report-print, #case-report-print *, #evidence-report-print, #evidence-report-print * { visibility: visible !important; } #case-report-print, #evidence-report-print { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
      <div>
        <h2 className="text-lg font-semibold">Export</h2>
        <p className="text-sm text-muted-foreground">Generate and export case reports and evidence reports.</p>
      </div>
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
          <CaseReportExport />
        </TabsContent>
        <TabsContent value="evidence">
          <EvidenceReportExport />
        </TabsContent>
      </Tabs>
    </div>
  );
}