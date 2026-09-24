import MoneyTrailGraph from "@/components/command/MoneyTrailGraph";
import { useLocation } from "react-router-dom";

export default function MoneyTrail() {
  const { state } = useLocation();
  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Interactive Money Trail</h2>
        <p className="text-sm text-muted-foreground">
          Trace the mule chain from victim to cash-out. Expand nodes, inspect transactions, and escalate to a freeze notice.
        </p>
      </div>
      <MoneyTrailGraph initialCaseId={state?.caseId} />
    </div>
  );
}