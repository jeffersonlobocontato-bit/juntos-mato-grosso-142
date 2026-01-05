import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  isLoading?: boolean;
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-primary/10 border-primary/20",
  success: "bg-green-500/10 border-green-500/20",
  warning: "bg-yellow-500/10 border-yellow-500/20",
  danger: "bg-red-500/10 border-red-500/20",
};

const iconVariantStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/20 text-primary",
  success: "bg-green-500/20 text-green-600",
  warning: "bg-yellow-500/20 text-yellow-600",
  danger: "bg-red-500/20 text-red-600",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  variant = "default",
  isLoading = false,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("border", variantStyles[variant])}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-12 w-12 bg-muted animate-pulse rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border transition-all hover:shadow-md", variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trend && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", iconVariantStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
