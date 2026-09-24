import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Share2,
  Scale,
  Snowflake,
  Users,
  Download,
} from "lucide-react";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

const EMBLEM_URL = "/emblem.png";

const nav = [
  { to: "/", label: "Command Dashboard", icon: LayoutDashboard, end: true },
  { to: "/money-trail", label: "Money Trail", icon: Share2 },
  { to: "/legal", label: "Legal Window", icon: Scale },
  { to: "/freeze-sim", label: "Freeze Simulation", icon: Snowflake },
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
        <Image src={EMBLEM_URL} fittingType="fit" className="h-11 w-11 shrink-0" />
        {!isCollapsed && (
          <div className="leading-tight">
            <p className="text-[13px] font-semibold">National Cyber Fraud</p>
            <p className="text-[13px] font-semibold">Intelligence Platform</p>
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