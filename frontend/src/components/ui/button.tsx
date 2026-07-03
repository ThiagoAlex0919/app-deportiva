import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Variantes según 06_design_system.md §4.1.
 * `cta` (acento ticket) — máximo UNO por pantalla, solo acción económica primaria.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap",
  {
    variants: {
      variant: {
        cta: "bg-ticket text-ticket-foreground active:opacity-90",
        primary: "bg-foreground text-background active:opacity-90",
        secondary: "bg-surface-raised text-foreground active:bg-surface-overlay",
        ghost: "text-foreground-secondary active:text-foreground",
        chip: "bg-surface-raised text-foreground data-[active=true]:bg-transparent data-[active=true]:ring-[1.5px] data-[active=true]:ring-foreground",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-12 px-6 text-base",
        chip: "h-10 px-5 text-[15px]",
      },
      fullWidth: { true: "w-full" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
