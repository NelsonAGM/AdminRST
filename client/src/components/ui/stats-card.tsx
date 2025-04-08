import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  description?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  progress?: {
    value: number;
    color?: string;
  };
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  iconBgColor = "bg-blue-100",
  description,
  trend,
  progress,
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={cn("p-3 rounded-full", iconBgColor)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
          <div className="ml-4">
            <h2 className="text-sm font-medium text-gray-600">{title}</h2>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        </div>
        
        {(description || trend) && (
          <div className="mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{description}</span>
              {trend && (
                <span 
                  className={cn(
                    "text-sm", 
                    trend.positive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {trend.positive ? "↑" : "↓"} {trend.value}
                </span>
              )}
            </div>
            
            {progress && (
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                <div 
                  className={cn("h-full rounded-full", progress.color || "bg-primary")} 
                  style={{ width: `${progress.value}%` }}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
