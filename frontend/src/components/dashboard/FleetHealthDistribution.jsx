import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export function FleetHealthDistribution({ total, healthy, warning, critical }) {
  const healthyPct = total > 0 ? Math.round((healthy / total) * 100) : 0;
  const warningPct = total > 0 ? Math.round((warning / total) * 100) : 0;
  const criticalPct = total > 0 ? Math.round((critical / total) * 100) : 0;

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Fleet Health Distribution</h3>
          <p className="text-[11px] text-slate-400 font-mono">Real-time condition aggregation</p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-graphite-850 border border-panel-border text-slate-300">
          {total} ASSETS
        </span>
      </div>

      {/* Segmented bar */}
      <div className="h-3 w-full rounded-full bg-graphite-800 overflow-hidden flex gap-0.5 p-0.5 border border-panel-border mb-4">
        {healthyPct > 0 && (
          <div 
            style={{ width: `${healthyPct}%` }} 
            className="h-full bg-accent-lime rounded-sm transition-all duration-500 shadow-[0_0_8px_rgba(163,230,53,0.3)]" 
            title={`Healthy: ${healthy} (${healthyPct}%)`} 
          />
        )}
        {warningPct > 0 && (
          <div 
            style={{ width: `${warningPct}%` }} 
            className="h-full bg-accent-amber rounded-sm transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" 
            title={`Warning: ${warning} (${warningPct}%)`} 
          />
        )}
        {criticalPct > 0 && (
          <div 
            style={{ width: `${criticalPct}%` }} 
            className="h-full bg-accent-red rounded-sm transition-all duration-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" 
            title={`Critical: ${critical} (${criticalPct}%)`} 
          />
        )}
      </div>

      {/* Legend & Stat breakdown */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
        <div className="p-2.5 rounded bg-graphite-850 border border-panel-border">
          <div className="flex items-center gap-1.5 text-lime-400 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HEALTHY</span>
          </div>
          <p className="text-lg font-bold font-mono text-white mt-1">{healthy}</p>
          <p className="text-[10px] text-slate-400">{healthyPct}% of fleet</p>
        </div>

        <div className="p-2.5 rounded bg-graphite-850 border border-panel-border">
          <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-mono">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>WARNING</span>
          </div>
          <p className="text-lg font-bold font-mono text-white mt-1">{warning}</p>
          <p className="text-[10px] text-slate-400">{warningPct}% of fleet</p>
        </div>

        <div className="p-2.5 rounded bg-graphite-850 border border-panel-border">
          <div className="flex items-center gap-1.5 text-red-400 text-[11px] font-mono">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>CRITICAL</span>
          </div>
          <p className="text-lg font-bold font-mono text-white mt-1">{critical}</p>
          <p className="text-[10px] text-slate-400">{criticalPct}% of fleet</p>
        </div>
      </div>
    </div>
  );
}
