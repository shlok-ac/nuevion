import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FileText,
  Banknote,
  Share2,
  Scale,
  Snowflake,
  ChartNoAxesCombined,
  Users,
  Download,
  Languages,
} from "lucide-react";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

const LOGO_URL = "/logo.png";

const nav = [
  { to: "/", label: "Command Dashboard", icon: LayoutDashboard, end: true },
  { to: "/bhashini", label: "Bhashini", icon: Languages },
  { to: "/case-management", label: "Case Management", icon: FileText },
  { to: "/atm-intelligence", label: "ATM Intelligence", icon: Banknote },
  { to: "/money-trail", label: "Money Trail", icon: Share2 },
  { to: "/legal", label: "Legal Window", icon: Scale },
  { to: "/freeze-sim", label: "Freeze Simulation", icon: Snowflake },
  { to: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { to: "/suspects", label: "Suspect Database", icon: Users },
  { to: "/export", label: "Export", icon: Download },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 flex-col border-r bg-card md:flex",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex items-center border-b py-3",
          isCollapsed ? "justify-center px-2" : "gap-2 px-4"
        )}
      >
        <Image src={LOGO_URL} fittingType="fit" className="h-11 w-11 shrink-0" />
        {!isCollapsed && (
          <div className="leading-tight">
            <p className="text-[17px] font-semibold">ArthaVyūh</p>

            
          </div>
        )}
      </div>
      <nav className={cn("flex-1 space-y-1 overflow-y-auto", isCollapsed ? "p-2" : "p-3")}>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={isCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                isCollapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {!isCollapsed && item.label}
          </NavLink>
        ))}
      </nav>
      {!isCollapsed && (
        <div className="border-t px-6 pb-5 pt-3">
          {/* One grid for both lines: the `auto` column is sized by the status dot,
              and "System Operational" and "Prototype" both start in the `1fr`
              column, so the label's left edge lands exactly under the status text
              regardless of how wide the font renders the dot. */}
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-2">
            <span aria-hidden="true" className="text-xs font-medium text-emerald-600">●</span>
            <p className="text-xs font-medium text-emerald-600">System Operational</p>
            <span />
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Prototype</p>
          </div>
        </div>
      )}
      <div className="group/edge absolute inset-y-0 right-0 z-10 w-3">
        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Minimize sidebar"}
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
          className="absolute right-0 top-1/2 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground opacity-0 transition-opacity group-hover/edge:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}