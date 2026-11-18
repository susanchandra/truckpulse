import React from 'react';

export function KpiCard({ title, value, subtitle, icon: Icon, color = 'lime' }) {
  const colorMap = {
    lime: {
      border: 'border-lime-500/30',
      bg: 'bg-lime-500/5',
      iconBg: 'bg-lime-500/10 text-lime-400 border-lime-500/30',
      text: 'text-lime-400',
    },
    amber: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/5',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      text: 'text-amber-400',
    },
    red: {
      border: 'border-red-500/30',
      bg: 'bg-red-500/5',
      iconBg: 'bg-red-500/10 text-red-400 border-red-500/30',
      text: 'text-red-400',
    },
    cyan: {
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/5',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      text: 'text-cyan-400',
    },
    neutral: {
      border: 'border-panel-border',
      bg: 'bg-graphite-900',
      iconBg: 'bg-graphite-800 text-slate-400 border-panel-border',
      text: 'text-white',
    }
  }[color] || {};

  return (
    <div className={`p-4 rounded-lg border bg-graphite-900 flex items-center justify-between ${colorMap.border} ${colorMap.bg}`}>
      <div>
        <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{title}</p>
        <p className={`text-2xl font-bold font-mono mt-1 ${colorMap.text}`}>{value}</p>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      {Icon && (
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${colorMap.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
