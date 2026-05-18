import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, children, ...props }, ref) => {
    return (
      <label className="grid gap-2 text-sm font-medium text-black/70">
        {label ? <span>{label}</span> : null}
        <select
          className={cn(
            "premium-focus h-12 rounded-2xl border border-line bg-white/80 px-4 text-sm text-ink shadow-sm",
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
