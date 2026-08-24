'use client';

import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface TradePieChartProps {
  ELECTRICAL: number;
  ELECTRONICS: number;
  AUTOMOTIVE: number;
  KITCHEN?: number;
}

const TRADE_CONFIG = [
  { key: 'ELECTRICAL', label: 'ไฟฟ้า', color: '#eab308' },
  { key: 'ELECTRONICS', label: 'อิเล็กทรอนิกส์', color: '#3b82f6' },
  { key: 'AUTOMOTIVE', label: 'ยานยนต์', color: '#22c55e' },
  { key: 'KITCHEN', label: 'ครัวอาชีวะ', color: '#f43f5e' },
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function TradePieChart({ ELECTRICAL, ELECTRONICS, AUTOMOTIVE, KITCHEN = 0 }: TradePieChartProps) {
  const data = [
    { name: 'ไฟฟ้า', value: ELECTRICAL },
    { name: 'อิเล็กทรอนิกส์', value: ELECTRONICS },
    { name: 'ยานยนต์', value: AUTOMOTIVE },
    { name: 'ครัวอาชีวะ', value: KITCHEN },
  ].filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={100}
          dataKey="value"
        >
          {TRADE_CONFIG.map((trade, index) => (
            <Cell key={trade.key} fill={TRADE_CONFIG[index].color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [value, 'รายการ']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
