import SuspectTable from "@/components/command/SuspectTable";

export default function SuspectDatabase() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Suspect Database</h2>
        <p className="text-sm text-muted-foreground">Browse, add, and import suspects into the registry.</p>
      </div>
      <SuspectTable />
    </div>
  );
}