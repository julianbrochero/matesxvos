import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "ripple inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-white shadow-soft hover:-translate-y-0.5 hover:bg-graphite hover:shadow-premium",
        secondary:
          "border border-line bg-white/80 text-ink shadow-sm hover:-translate-y-0.5 hover:border-black/15 hover:bg-white hover:shadow-soft",
        ghost:
          "text-ink hover:bg-black/[0.04] hover:text-black",
        danger:
          "bg-danger text-white shadow-soft hover:-translate-y-0.5 hover:shadow-premium",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-xl px-3",
        icon: "h-10 w-10 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
