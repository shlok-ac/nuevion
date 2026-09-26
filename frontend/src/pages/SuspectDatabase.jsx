import SuspectTable from "@/components/command/SuspectTable";
import PageHeader from "@/components/command/PageHeader";

export default function SuspectDatabase() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Suspect Database" description="Browse, add, and import suspects into the registry." />
      <SuspectTable />
    </div>
  );
}