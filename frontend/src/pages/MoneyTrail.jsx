import MoneyTrailGraph from "@/components/command/MoneyTrailGraph";
import PageHeader from "@/components/command/PageHeader";
import { useLocation, useSearchParams } from "react-router-dom";

export default function MoneyTrail() {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const initialCaseId = searchParams.get("case") ?? state?.caseId;
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Interactive Money Trail"
        description="Review complaint-reported accounts and transactions. Generated mappings are shown separately as unverified reference data."
      />
      <MoneyTrailGraph initialCaseId={initialCaseId} />
    </div>
  );
}