import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function SelectField({
  label,
  id,
  required,
  value,
  onChange,
  options,
  hint,
  placeholder = "Select...",
  showOptionChips = true,
}: {
  label: string;
  id: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  placeholder?: string;
  showOptionChips?: boolean;
}) {
  const chipOptions = options.filter((o) => o.value !== "");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required && " *"}</Label>
      <div className="relative">
        <Select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10 cursor-pointer appearance-auto"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={`${id}-${o.value}`} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
      </div>
      {showOptionChips && chipOptions.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="text-xs font-medium text-slate-600 mb-1.5">
            Tap an option below or use the dropdown above ({chipOptions.length} choices):
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {chipOptions.map((o) => (
              <button
                key={`${id}-chip-${o.value}`}
                type="button"
                onClick={() => onChange(o.value)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-md border transition-colors",
                  value === o.value
                    ? "bg-red-100 border-red-400 text-red-900 font-medium"
                    : "bg-white border-slate-200 text-slate-700 hover:border-red-300 hover:bg-red-50"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
