import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        default: "shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)] hover:shadow-[0_8px_30px_-8px_hsl(215_25%_15%_/_0.12)]",
        elevated: "shadow-[0_8px_30px_-8px_hsl(215_25%_15%_/_0.12)] hover:shadow-[0_20px_50px_-15px_hsl(215_25%_15%_/_0.2)] hover:-translate-y-1",
        glass: "backdrop-blur-md bg-background/80 border-border/50",
        outline: "border-2 border-border bg-transparent",
        gradient: "bg-gradient-to-br from-card to-muted border-0 shadow-[0_8px_30px_-8px_hsl(215_25%_15%_/_0.12)]",
        stat: "bg-gradient-to-br from-card to-muted shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)] hover:shadow-[0_8px_30px_-8px_hsl(215_25%_15%_/_0.12)] hover:-translate-y-1 border-0",
        feature: "bg-card shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)] hover:shadow-[0_20px_50px_-15px_hsl(215_25%_15%_/_0.2)] hover:-translate-y-2 border-primary/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-bold leading-none tracking-tight font-display", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
