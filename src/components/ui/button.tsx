import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)] hover:shadow-[0_8px_30px_-8px_hsl(215_25%_15%_/_0.12)] hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)]",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)] hover:shadow-[0_8px_30px_-8px_hsl(215_25%_15%_/_0.12)] hover:-translate-y-0.5",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_30px_hsl(42_90%_55%_/_0.4)] hover:shadow-[0_20px_50px_-15px_hsl(215_25%_15%_/_0.2)] hover:-translate-y-1 font-bold text-base",
        heroOutline: "border-2 border-primary-foreground/80 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 backdrop-blur-sm",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)] hover:shadow-[0_8px_30px_-8px_hsl(215_25%_15%_/_0.12)]",
        glass: "backdrop-blur-md bg-background/20 border border-border/30 text-foreground hover:bg-background/30",
        glassDark: "backdrop-blur-md bg-foreground/10 border border-foreground/20 text-primary-foreground hover:bg-foreground/20",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
