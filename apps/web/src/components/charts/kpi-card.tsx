import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'rose' | 'orange';
}

const colorMap = {
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', value: 'text-blue-700' },
  green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', value: 'text-green-700' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', value: 'text-yellow-700' },
  red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', value: 'text-red-700' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', value: 'text-purple-700' },
  rose: { bg: 'bg-rose-50', icon: 'bg-rose-100 text-rose-600', value: 'text-rose-700' },
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', value: 'text-orange-700' },
};

export function KpiCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }: KpiCardProps) {
  const colors = colorMap[color];

  return (
    <Card className={cn('border-0 shadow-sm', colors.bg)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className={cn('text-3xl font-bold', colors.value)}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className={cn(
                'flex items-center gap-1 mt-2 text-xs font-medium',
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {trend >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend)}% จากสัปดาห์ที่แล้ว
              </div>
            )}
          </div>
          <div className={cn('rounded-xl p-3', colors.icon)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
