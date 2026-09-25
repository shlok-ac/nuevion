import { Card, CardContent } from "@/components/ui/card";

export default function CaseManagement() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Case Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage and review investigation cases.
        </p>
      </div>
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Case management tools will be available here.
        </CardContent>
      </Card>
    </div>
  );
}
