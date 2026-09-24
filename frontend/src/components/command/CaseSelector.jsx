import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export default function CaseSelector({ cases, value, onValueChange, className, valueKey = "id" }) {
  const [open, setOpen] = useState(false);
  const selectedCase = cases.find((c) => c[valueKey] === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring",
            className
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedCase ? `${selectedCase.id} — ${selectedCase.title}` : "Select case"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search cases..." />
          <CommandList>
            <CommandEmpty>No cases found.</CommandEmpty>
            {cases.map((c) => (
              <CommandItem
                key={c[valueKey]}
                value={`${c.id} ${c.title}`}
                onSelect={() => {
                  onValueChange(c[valueKey]);
                  setOpen(false);
                }}
              >
                <Check className={cn("h-4 w-4", value === c[valueKey] ? "opacity-100" : "opacity-0")} />
                {c.id} — {c.title}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
