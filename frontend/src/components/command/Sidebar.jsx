import { NavLink } from "react-router-dom";
import { LayoutDashboard, Share2, Scale, Snowflake, Users, Download } from "lucide-react";
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
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Image src={EMBLEM_URL} fittingType="fit" className="h-11 w-11 shrink-0" />
        <div className="leading-tight">
          <p className="text-[13px] font-semibold">National Cyber Fraud</p>
          <p className="text-[13px] font-semibold">Intelligence Platform</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}