import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, children, ...props }, ref) => {
    return (
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        {label ? <span>{label}</span> : null}
        <select
          className={cn(
            "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100",
            className,
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
      </label>
    );
  },
);
Select.displayName = "Select";

export { Select };
