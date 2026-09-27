import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import PageHeader from "@/components/command/PageHeader";
import { cases, formatINR } from "@/lib/investigationData";
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, ClipboardList, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const statuses = ["All", "Active", "Monitoring", "Escalated", "Under Investigation", "Resolved", "Closed"];
const riskLevels = ["All", "Critical", "High", "Medium", "Low"];

/** Cases shown per page. */
const PAGE_SIZE = 100;

/**
 * Page numbers to render, with `null` marking an elision.
 *
 * Every page number is listed while the set is small enough to fit; past that only
 * the first, last and a window around the current page are shown, so the control
 * stays a fixed width as the case count grows.
 */
function buildPageList(currentPage, totalPages, window = 1) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const visible = new Set([1, totalPages, currentPage]);
  for (let offset = 1; offset <= window; offset += 1) {
    visible.add(currentPage - offset);
    visible.add(currentPage + offset);
  }

  const sorted = [...visible]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const pages = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) pages.push(null);
    pages.push(page);
    previous = page;
  }
  return pages;
}

function DateTimeInput({ type, value, onChange, ariaLabel, className }) {
  const inputRef = useRef(null);
  const Icon = type === "date" ? CalendarDays : Clock3;

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // Fall back to the native control if showPicker is unavailable or blocked.
      }
    }

    input.focus();
    input.click();
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className="h-9 w-full appearance-none rounded-md border bg-background px-2 pr-10 text-left text-xs md:text-sm [&::-webkit-calendar-picker-indicator]:hidden"
      />
      <button
        type="button"
        aria-label={`Open ${type} picker`}
        onClick={openPicker}
        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}

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

const formatLastActivity = (value) => {
  const date = new Date(value.replace(" ", "T"));
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return {
    date: `${day} ${months[date.getMonth()]} ${date.getFullYear()}`,
    time: `${hours}:${minutes}`,
  };
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
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get("search") ?? "";
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    search: searchFromUrl,
  }));

  // Current page, 1-based. Reset to 1 whenever the filter set changes so a narrower
  // result set never lands the user on a page that no longer exists.
  const [page, setPage] = useState(1);

  useEffect(() => {
    setFilters((current) =>
      current.search === searchFromUrl ? current : { ...current, search: searchFromUrl }
    );
  }, [searchFromUrl]);

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
    }).sort(
      (first, second) =>
        new Date(second.lastActivity.replace(" ", "T")) -
        new Date(first.lastActivity.replace(" ", "T"))
    );
  }, [filters]);

  // The result set can also change from outside the filter controls (a re-sync of the
  // generated dataset), so clamp rather than trusting the stored page number.
  const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage]);

  const pagedCases = useMemo(
    () => filteredCases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredCases, currentPage]
  );

  const firstShown = filteredCases.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastShown = Math.min(currentPage * PAGE_SIZE, filteredCases.length);
  const pageList = useMemo(
    () => buildPageList(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);

    if (key === "search") {
      const nextParams = new URLSearchParams(searchParams);
      if (value) nextParams.set("search", value);
      else nextParams.delete("search");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("search");
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Case Management" description="Manage and review investigation cases." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find cases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus={Boolean(searchFromUrl)}
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search case ID, suspect, account..."
              aria-label="Search case ID, suspect, account"
              className="pl-9"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div className="min-w-0 xl:mr-2">
              <RegionSelect
                regions={locations}
                value={filters.location}
                onValueChange={(value) => updateFilter("location", value)}
              />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-9 min-w-12 shrink-0 items-center justify-center rounded-md border bg-muted px-3 text-xs font-semibold text-muted-foreground">From</span>
              <DateTimeInput className="min-w-0 flex-[1.375]" type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} ariaLabel="From date" />
              <DateTimeInput className="min-w-0 flex-1" type="time" value={filters.fromTime} onChange={(event) => updateFilter("fromTime", event.target.value)} ariaLabel="From time" />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-9 min-w-12 shrink-0 items-center justify-center rounded-md border bg-muted px-3 text-xs font-semibold text-muted-foreground">To</span>
              <DateTimeInput className="min-w-0 flex-[1.375]" type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} ariaLabel="To date" />
              <DateTimeInput className="min-w-0 flex-1" type="time" value={filters.toTime} onChange={(event) => updateFilter("toTime", event.target.value)} ariaLabel="To time" />
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
            <Button type="button" variant="destructive" onClick={resetFilters} className="w-full">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b bg-muted/20 px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            Cases
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Showing {filteredCases.length} of {cases.length}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCases.length ? (
            <Table className="min-w-[1080px]">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[20%]" />
                <col className="w-[18%]" />
                <col className="w-[13%]" />
                <col className="w-[9%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[7%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="border-b bg-muted/10 hover:bg-muted/10">
                  <TableHead className="h-11 px-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Case ID</TableHead>
                  <TableHead className="h-11 px-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Crime Type</TableHead>
                  <TableHead className="h-11 px-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Location</TableHead>
                  <TableHead className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</TableHead>
                  <TableHead className="h-11 px-5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Risk</TableHead>
                  <TableHead className="h-11 px-5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="h-11 px-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Last Activity</TableHead>
                  <TableHead className="h-11 px-5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedCases.map((caseItem) => (
                  <TableRow key={caseItem.id} className="group border-b border-border/60 hover:bg-muted/30">
                    <TableCell className="whitespace-nowrap px-5 py-5 font-mono text-sm font-semibold tracking-tight text-foreground">
                      {caseItem.id}
                    </TableCell>
                    <TableCell className="min-w-48 px-5 py-5 text-sm text-foreground">{caseItem.fraudType}</TableCell>
                    <TableCell className="min-w-44 px-5 py-5 text-sm text-muted-foreground">{caseItem.branch}</TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-5 text-right text-sm font-semibold tabular-nums text-foreground">
                      {formatINR(caseItem.amount)}
                    </TableCell>
                    <TableCell className="px-5 py-5 text-center">
                      <Badge className={cn("min-w-[4.75rem] justify-center rounded-md px-2 py-1 text-[10px] uppercase tracking-wide", priorityTone[caseItem.priority])}>
                        {caseItem.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-5 text-center">
                      <Badge className={cn("min-w-[5.5rem] justify-center rounded-md border border-transparent px-2 py-1 text-[10px] uppercase tracking-wide", statusTone[caseItem.status])}>
                        {caseItem.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-5 text-xs">
                      <div className="text-muted-foreground">{formatLastActivity(caseItem.lastActivity).date}</div>
                      <div className="mt-0.5 font-medium tabular-nums text-foreground">{formatLastActivity(caseItem.lastActivity).time}</div>
                    </TableCell>
                    <TableCell className="px-5 py-5 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        title={`View details for ${caseItem.id}`}
                        aria-label={`View details for ${caseItem.id}`}
                        className="h-8 px-2.5 text-xs opacity-80 transition-opacity group-hover:opacity-100"
                      >
                        <Link to={`/cases/${caseItem.id}`}>
                          View Details
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No cases match the selected filters.
            </p>
          )}
          <div className="flex flex-col gap-3 border-t bg-muted/10 px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {firstShown}–{lastShown} of {filteredCases.length} cases
            </span>
            <nav className="flex items-center gap-1" aria-label="Case table pagination">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                ‹
              </Button>
              {pageList.map((pageNumber, index) =>
                pageNumber === null ? (
                  <span
                    key={`gap-${index}`}
                    aria-hidden="true"
                    className="px-1 text-xs text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={pageNumber}
                    type="button"
                    variant={pageNumber === currentPage ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 min-w-7 px-2 text-xs tabular-nums"
                    onClick={() => setPage(pageNumber)}
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                    aria-label={`Page ${pageNumber}`}
                  >
                    {pageNumber}
                  </Button>
                )
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                ›
              </Button>
            </nav>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
