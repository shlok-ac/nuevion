import MoneyTrailGraph from "@/components/command/MoneyTrailGraph";
import { useLocation, useSearchParams } from "react-router-dom";
import { cases } from "@/lib/investigationData";

export default function MoneyTrail() {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const selectedCase = cases.find((item) => item.id === searchParams.get("case"));
  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Interactive Money Trail</h2>
        <p className="text-sm text-muted-foreground">
          Trace the mule chain from victim to cash-out. Expand nodes, inspect transactions, and escalate to a freeze notice.
        </p>
      </div>
      <MoneyTrailGraph initialCaseId={selectedCase?.muleChainId ?? state?.caseId} />
    </div>
  );
}