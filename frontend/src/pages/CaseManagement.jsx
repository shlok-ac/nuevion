import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cases, formatINR } from "@/lib/investigationData";
import { Check, ChevronDown, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const statuses = ["All", "Active", "Monitoring", "Escalated", "Under Investigation", "Resolved", "Closed"];
const riskLevels = ["All", "Critical", "High", "Medium", "Low"];

const priorityTone = {
  critical: "border-red-200 bg-red-500/10 text-red-600",
  high: "border-amber-200 bg-amber-500/10 text-amber-600",
  medium: "border-blue-200 bg-blue-500/10 text-blue-600",
  low: "border-slate-200 bg-slate-500/10 text-slate-600",
};

const statusTone = {
  active: "bg-emerald-500/10 text-emerald-600",
  monitoring: "bg-amber-500/10 text-amber-600",
  escalated: "bg-red-500/10 text-red-600",
  "under investigation": "bg-blue-500/10 text-blue-600",
  resolved: "bg-emerald-500/10 text-emerald-600",
  closed: "bg-muted text-muted-foreground",
  frozen: "bg-blue-500/10 text-blue-600",
};

const initialFilters = {
  search: "",
  location: "all",
  fromDate: "",
  toDate: "",
  fromTime: "00:00",
  toTime: "23:59",
  status: "all",
  risk: "all",
  crimeType: "all",
};

function RegionSelect({ regions, value, onValueChange }) {
  const [open, setOpen] = useState(false);
  const selectedRegion = value === "all" ? "All regions" : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Filter by region"
        >
          <span className="min-w-0 flex-1 truncate text-left">{selectedRegion}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search regions..." />
          <CommandList>
            <CommandEmpty>No regions found.</CommandEmpty>
            <CommandItem
              value="all regions"
              onSelect={() => {
                onValueChange("all");
                setOpen(false);
              }}
            >
              <Check className={cn("h-4 w-4", value === "all" ? "opacity-100" : "opacity-0")} />
              All regions
            </CommandItem>
            {regions.map((region) => (
              <CommandItem
                key={region}
                value={region}
                onSelect={() => {
                  onValueChange(region);
                  setOpen(false);
                }}
              >
                <Check className={cn("h-4 w-4", value === region ? "opacity-100" : "opacity-0")} />
                {region}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function CaseManagement() {
  const [filters, setFilters] = useState(initialFilters);

  const locations = useMemo(
    () => [...new Set(cases.map((caseItem) => caseItem.branch))],
    []
  );
  const crimeTypes = useMemo(
    () => [...new Set(cases.map((caseItem) => caseItem.fraudType))],
    []
  );

  const filteredCases = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const from = filters.fromDate ? `${filters.fromDate}T${filters.fromTime}` : "";
    const to = filters.toDate ? `${filters.toDate}T${filters.toTime}` : "";

    return cases.filter((caseItem) => {
      const searchableText = [
        caseItem.id,
        caseItem.title,
        caseItem.victim,
        caseItem.account,
        ...caseItem.suspectIds,
      ].join(" ").toLowerCase();
      const caseDateTime = caseItem.lastActivity.replace(" ", "T");
      const status = caseItem.status.toLowerCase();
      const priority = caseItem.priority.toLowerCase();

      return (
        (!search || searchableText.includes(search)) &&
        (filters.location === "all" || caseItem.branch === filters.location) &&
        (!from || caseDateTime >= from) &&
        (!to || caseDateTime <= to) &&
        (filters.status === "all" || status === filters.status) &&
        (filters.risk === "all" || priority === filters.risk) &&
        (filters.crimeType === "all" || caseItem.fraudType === filters.crimeType)
      );
    });
  }, [filters]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Case Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage and review investigation cases.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Find cases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search case ID, suspect, account..."
              aria-label="Search case ID, suspect, account"
              className="pl-9"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div className="xl:max-w-[405px]">
              <RegionSelect
                regions={locations}
                value={filters.location}
                onValueChange={(value) => updateFilter("location", value)}
              />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-9 w-16 shrink-0 items-center justify-center rounded-md border bg-muted px-3 text-xs font-semibold text-muted-foreground">From</span>
              <Input className="min-w-0 flex-1 text-xs" type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} aria-label="From date" />
              <Input className="min-w-0 flex-1 text-xs" type="time" value={filters.fromTime} onChange={(event) => updateFilter("fromTime", event.target.value)} aria-label="From time" />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-9 w-16 shrink-0 items-center justify-center rounded-md border bg-muted px-3 text-xs font-semibold text-muted-foreground">To</span>
              <Input className="min-w-0 flex-1 text-xs" type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} aria-label="To date" />
              <Input className="min-w-0 flex-1 text-xs" type="time" value={filters.toTime} onChange={(event) => updateFilter("toTime", event.target.value)} aria-label="To time" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={filters.crimeType} onValueChange={(value) => updateFilter("crimeType", value)}>
              <SelectTrigger aria-label="Filter by crime type"><SelectValue placeholder="Crime Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All crime types</SelectItem>
                {crimeTypes.map((crimeType) => <SelectItem key={crimeType} value={crimeType}>{crimeType}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.risk} onValueChange={(value) => updateFilter("risk", value)}>
              <SelectTrigger aria-label="Filter by risk level"><SelectValue placeholder="Risk Level" /></SelectTrigger>
              <SelectContent>
                {riskLevels.map((risk) => <SelectItem key={risk} value={risk.toLowerCase()}>{risk === "All" ? "All risk levels" : `${risk} Risk`}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
              <SelectTrigger aria-label="Filter by status"><SelectValue placeholder="Status - All" /></SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status.toLowerCase()}>
                    {status === "All" ? "Status - All" : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="destructive" onClick={() => setFilters(initialFilters)} className="w-full">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Cases</CardTitle>
          <Badge variant="secondary">{filteredCases.length} of {cases.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredCases.length ? filteredCases.map((caseItem) => (
            <div key={caseItem.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{caseItem.title}</span>
                  <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase", priorityTone[caseItem.priority])}>{caseItem.priority}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{caseItem.id} · {caseItem.victim} · {caseItem.branch}</p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-sm font-semibold">{formatINR(caseItem.amount)}</p>
                <span className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", statusTone[caseItem.status])}>{caseItem.status}</span>
              </div>
            </div>
          )) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No cases match the selected filters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
