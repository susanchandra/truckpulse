import React from 'react';
import { SeverityBadge } from '../common/StatusBadge';
import { formatTimestamp } from '../../utils/formatters';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export function RecentAlertsPanel({ activeFaults, diagnosticsHistory, onSelectTab }) {
  const displayAlerts = activeFaults.length > 0 
    ? activeFaults 
    : diagnosticsHistory.slice(0, 4);

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-accent-red" />
          <h3 className="text-sm font-semibold text-white">Active Diagnostic Alerts</h3>
        </div>
        <button
          onClick={() => onSelectTab('diagnostics')}
          className="text-xs font-mono text-accent-lime hover:underline"
        >
          View all ({diagnosticsHistory.length}) &rarr;
        </button>
      </div>

      {displayAlerts.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <CheckCircle className="w-8 h-8 text-accent-lime mb-2 opacity-80" />
          <p className="text-xs font-mono text-slate-300 font-semibold">ALL SYSTEMS NOMINAL</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
            No active diagnostic trouble codes. All vehicle ECU rules within operational thresholds.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayAlerts.map((alert, idx) => (
            <div
              key={alert.id || idx}
              className={`p-3 rounded border transition-colors ${
                alert.is_resolved
                  ? 'bg-graphite-850 border-panel-border opacity-70'
                  : alert.severity === 'CRITICAL'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-white">{alert.vehicle_id}</span>
                  <span className="font-mono text-xs text-slate-300 font-semibold">{alert.fault_code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-[10px] font-mono text-slate-400">
                    {formatTimestamp(alert.timestamp)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-300">{alert.description}</p>

              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-panel-border/60 text-[10px] font-mono text-slate-400">
                <div>
                  Observed: <span className="text-white font-bold">{alert.observed_value}</span> / Limit: <span>{alert.threshold}</span>
                </div>
                <div>
                  Status: <span className={alert.is_resolved ? 'text-accent-lime' : 'text-accent-red font-bold'}>
                    {alert.is_resolved ? 'RESOLVED' : 'ACTIVE'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
