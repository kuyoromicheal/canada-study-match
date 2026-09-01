"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string };

export function SearchableCombobox({
  id,
  label,
  required,
  value,
  onChange,
  options,
  placeholder = "Type to search...",
  hint,
  disabled,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            o.value.toLowerCase().includes(q)
        )
      : options;
    return list.slice(0, 80);
  }, [options, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={containerRef} className="relative space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <div className="relative">
        <Input
          id={id}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder={value ? selectedLabel : placeholder}
          value={open ? query : selectedLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery(selectedLabel);
          }}
          className="pr-10"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
      {open && !disabled && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {filtered.map((o) => (
            <li key={o.value} role="option" aria-selected={value === o.value}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-red-50",
                  value === o.value && "bg-red-50 font-medium text-red-900"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">No matches found</li>
          )}
        </ul>
      )}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
