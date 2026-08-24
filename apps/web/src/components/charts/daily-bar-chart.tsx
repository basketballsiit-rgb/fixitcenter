'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

interface DailyData {
  date: string;
  count: number;
}

interface DailyBarChartProps {
  data: DailyData[];
}

export function DailyBarChart({ data }: DailyBarChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: (() => {
      try {
        return format(parseISO(d.date), 'd MMM', { locale: th });
      } catch {
        return d.date;
      }
    })(),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value: number) => [value, 'รายการซ่อม']}
          labelFormatter={(label) => `วันที่ ${label}`}
        />
        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
