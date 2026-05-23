import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        {label ? <span>{label}</span> : null}
        <input
          className={cn(
            "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
            className,
          )}
          ref={ref}
          {...props}
        />
      </label>
    );
  },
);
Input.displayName = "Input";

export { Input };
