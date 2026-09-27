import MoneyTrailGraph from "@/components/command/MoneyTrailGraph";
import PageHeader from "@/components/command/PageHeader";
import { useLocation, useSearchParams } from "react-router-dom";
import { cases } from "@/lib/investigationData";

export default function MoneyTrail() {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const selectedCase = cases.find((item) => item.id === searchParams.get("case"));
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Interactive Money Trail"
        description="Trace the mule chain from victim to cash-out. Expand nodes, inspect transactions, and escalate to a freeze notice."
      />
      <MoneyTrailGraph initialCaseId={selectedCase?.muleChainId ?? state?.caseId} />
    </div>
  );
}