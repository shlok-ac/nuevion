import { useNavigate, Link } from "react-router-dom";
import { Search, Bell, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { alerts, cases, formatINR } from "@/lib/investigationData";
import { cn } from "@/lib/utils";

const chainFor = (caseId) => cases.find((c) => c.id === caseId)?.muleChainId;

// Rendered by `CommandLayout` on the dashboard only, so the heading is fixed and
// every search keystroke hands off to Case Management.
export default function Topbar() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchQuery(value);

    if (value) {
      navigate(`/case-management?search=${encodeURIComponent(value)}`);
    }
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
      <h1 className="text-base font-semibold">Command Dashboard</h1>
      <div className="relative ml-auto hidden md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search case, account, suspect…"
          aria-label="Search cases, accounts, and suspects"
          className="h-9 w-72 rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
        <Clock className="h-4 w-4" />
        {now.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative rounded-md p-2 hover:bg-accent">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Priority Alerts</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {alerts.map((a) => (
            <DropdownMenuItem key={a.id} asChild>
              <Link to="/money-trail" state={{ caseId: chainFor(a.caseId) }} className="flex items-start gap-2 py-2">
                <span
                  className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    a.severity === "critical" ? "bg-red-500" : "bg-amber-500"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.caseId} · {a.time} · {a.amount ? formatINR(a.amount) : "—"}
                  </p>
                </div>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        IO
      </div>
    </header>
  );
}