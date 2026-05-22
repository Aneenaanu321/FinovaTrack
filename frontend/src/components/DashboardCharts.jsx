import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

const STAGE_COLORS = {
  New: '#94a3b8',
  Contacted: '#60a5fa',
  Interested: '#a78bfa',
  Closed: '#34d399',
};

const KYC_COLORS = {
  'Not Started': '#e2e8f0',
  'In Progress': '#fbbf24',
  Completed: '#34d399',
};

export function DealsByStageChart({ data }) {
  const chartData = (data || []).map((d) => ({
    name: d.stage,
    count: d.count,
    fill: STAGE_COLORS[d.stage] || '#64748b',
  }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function KycChart({ kyc }) {
  const chartData = (kyc?.breakdown || []).map((b) => ({
    name: b.status,
    value: b.count,
    fill: KYC_COLORS[b.status] || '#94a3b8',
  }));

  if (!chartData.some((d) => d.value > 0)) {
    return <p className="text-sm text-gray-400 text-center py-8">No clients yet</p>;
  }

  return (
    <div className="h-56 relative">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{kyc?.percentComplete ?? 0}%</p>
          <p className="text-xs text-gray-500">KYC complete</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={72}
            paddingAngle={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TasksPerWeekChart({ data }) {
  const chartData = (data || []).map((w) => ({
    week: format(parseISO(w.weekStart), 'MMM d'),
    count: w.count,
  }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="week" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
