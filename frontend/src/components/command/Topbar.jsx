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
import { formatINR } from "@/lib/investigationData";
import { getAlerts } from "@/lib/api";
import { cn } from "@/lib/utils";

// Rendered by `CommandLayout` on the dashboard only, so the heading is fixed and
// every search keystroke hands off to Case Management.
export default function Topbar() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [alertError, setAlertError] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let active = true;
    getAlerts()
      .then((data) => {
        if (active) {
          setAlerts(Array.isArray(data) ? data : []);
          setAlertError("");
        }
      })
      .catch((error) => {
        if (active) setAlertError(error.message || "Stored alerts are unavailable.");
      });
    return () => {
      active = false;
    };
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
            {alerts.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Priority Alerts</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {alertError ? (
            <DropdownMenuItem disabled>{alertError}</DropdownMenuItem>
          ) : alerts.length ? alerts.map((a) => (
            <DropdownMenuItem key={a.id} asChild>
              <Link to={a.case_id ? `/money-trail?case=${encodeURIComponent(a.case_id)}` : "/case-management"} className="flex items-start gap-2 py-2">
                <span
                  className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    String(a.severity || "").toLowerCase() === "critical" ? "bg-red-500" : "bg-amber-500"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.case_id ? `Case ${a.case_id}` : a.alert_type || "Stored alert"} · {a.created_at || "—"} · {a.amount ? formatINR(a.amount) : "—"}
                  </p>
                </div>
              </Link>
            </DropdownMenuItem>
          )) : <DropdownMenuItem disabled>No stored alerts are available.</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        IO
      </div>
    </header>
  );
}