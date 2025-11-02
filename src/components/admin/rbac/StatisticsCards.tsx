import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Assuming tooltip is available
import { LucideIcon, Users, Shield, Key, Package, TrendingUp, TrendingDown } from "lucide-react"; // Import relevant icons
import { cn } from "@/lib/utils";

interface StatItem {
  value: number | string;
  label: string;
  icon: LucideIcon;
  color: string; // e.g., 'blue', 'green', 'gray', 'red'
  trend?: string; // e.g., '+5', '-2'
  tooltip?: string;
}

interface StatisticsCardsProps {
  stats: StatItem[];
  loading: boolean;
}

export function StatisticsCards({ stats, loading }: StatisticsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Card className={cn(
                "hover:shadow-lg transition-shadow cursor-pointer",
                `border-t-${stat.color}-500` // Color accent on top border
              )}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={cn(
                        "p-2 rounded-full",
                        stat.color === 'blue' && "bg-blue-100 text-blue-600",
                        stat.color === 'green' && "bg-green-100 text-green-600",
                        stat.color === 'gray' && "bg-gray-100 text-gray-600",
                        stat.color === 'red' && "bg-red-100 text-red-600"
                      )}>
                        <stat.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold">{stat.value}</div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                        {stat.trend && (
                          <div className="flex items-center text-xs mt-1">
                            {stat.trend.startsWith('+') ? (
                              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                            )}
                            <span className={stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}>
                              {stat.trend}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Optional sparkline placeholder - can be implemented later */}
                    {/* <div className="w-16 h-8 bg-gray-200 rounded"></div> */}
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            {stat.tooltip && (
              <TooltipContent>
                <p>{stat.tooltip}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}