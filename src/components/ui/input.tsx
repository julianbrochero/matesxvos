import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="grid gap-2 text-sm font-medium text-black/70">
        {label ? <span>{label}</span> : null}
        <input
          className={cn(
            "premium-focus h-12 rounded-2xl border border-line bg-white/80 px-4 text-sm text-ink shadow-sm placeholder:text-black/35",
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
