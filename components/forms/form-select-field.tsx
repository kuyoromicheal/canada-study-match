import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { FormOption } from "@/lib/constants/form-options";

export function FormSelectField({
  label,
  id,
  required,
  value,
  onChange,
  options,
  hint,
  placeholder = "Select...",
  disabled,
}: {
  label: string;
  id: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: FormOption[];
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <div className="relative">
        <Select
          id={id}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10 cursor-pointer appearance-auto"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={`${id}-${o.value}`} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
