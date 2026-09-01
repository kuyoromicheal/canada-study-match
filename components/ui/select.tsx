import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          "flex h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        aria-hidden
      />
    </div>
  );
}
