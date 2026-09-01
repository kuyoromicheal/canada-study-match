import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function SelectField({
  label,
  id,
  required,
  value,
  onChange,
  options,
  hint,
  placeholder = "Select...",
}: {
  label: string;
  id: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required && " *"}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={`${id}-${o.value}`} value={o.value}>{o.label}</option>
        ))}
      </Select>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
