import { useState } from "react";
import { Landmark, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SuspectTable from "@/components/command/SuspectTable";
import MuleAccountTable from "@/components/command/MuleAccountTable";
import PageHeader from "@/components/command/PageHeader";

/**
 * One page, two registries. The switcher mirrors the Analytics page's segmented
 * control exactly (same `TabsList` shell, same trigger sizing, same icons) and
 * swaps the content below rather than routing away, so the suspect registry
 * stays on `/suspects` and its state is untouched when returning to it.
 */
export default function SuspectDatabase() {
  const [registry, setRegistry] = useState("suspects");
  const isMule = registry === "mule";

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={isMule ? "Mule Account Database" : "Suspect Database"}
        description={
          isMule
            ? "Browse, review, and coordinate fraud-linked mule accounts."
            : "Browse, add, and import suspects into the registry."
        }
        actions={
          <Tabs value={registry} onValueChange={setRegistry}>
            <TabsList className="h-10 rounded-lg border bg-muted/80 p-1 shadow-sm">
              <TabsTrigger value="suspects" className="gap-2 px-3 text-xs">
                <Users className="h-3.5 w-3.5" /> Suspect Database
              </TabsTrigger>
              <TabsTrigger value="mule" className="gap-2 px-3 text-xs">
                <Landmark className="h-3.5 w-3.5" /> Mule Account Database
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      <div key={registry} className="animate-in fade-in-0 duration-300">
        {isMule ? <MuleAccountTable /> : <SuspectTable />}
      </div>
    </div>
  );
}
