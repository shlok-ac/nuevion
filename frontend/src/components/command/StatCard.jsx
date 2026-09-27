import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  default: {
    chip: "bg-primary/10 text-primary",
    chipHover: "group-hover:bg-primary/20",
    border: "hover:border-primary/40",
    shadow: "hover:shadow-[0_16px_32px_-16px_hsl(var(--primary)/0.45)]",
    glow: "bg-primary/20",
  },
  red: {
    chip: "bg-red-500/10 text-red-600",
    chipHover: "group-hover:bg-red-500/20",
    border: "hover:border-red-500/40",
    shadow: "hover:shadow-[0_16px_32px_-16px_rgb(239_68_68/0.35)]",
    glow: "bg-red-500/20",
  },
  amber: {
    chip: "bg-amber-500/10 text-amber-600",
    chipHover: "group-hover:bg-amber-500/20",
    border: "hover:border-amber-500/40",
    shadow: "hover:shadow-[0_16px_32px_-16px_rgb(245_158_11/0.35)]",
    glow: "bg-amber-500/20",
  },
  green: {
    chip: "bg-emerald-500/10 text-emerald-600",
    chipHover: "group-hover:bg-emerald-500/20",
    border: "hover:border-emerald-500/40",
    shadow: "hover:shadow-[0_16px_32px_-16px_rgb(16_185_129/0.35)]",
    glow: "bg-emerald-500/20",
  },
  blue: {
    chip: "bg-blue-500/10 text-blue-600",
    chipHover: "group-hover:bg-blue-500/20",
    border: "hover:border-blue-500/40",
    shadow: "hover:shadow-[0_16px_32px_-16px_rgb(59_130_246/0.35)]",
    glow: "bg-blue-500/20",
  },
};

export default function StatCard({ icon: Icon, label, value, sub, tone = "default" }) {
  const t = tones[tone] ?? tones.default;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1",
        t.border,
        t.shadow
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-100",
          t.glow
        )}
      />
      <CardContent className="relative flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-105",
            t.chip,
            t.chipHover
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}