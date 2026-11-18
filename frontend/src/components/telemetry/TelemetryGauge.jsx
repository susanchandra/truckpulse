import React from 'react';

export function TelemetryGauge({ 
  label, 
  value, 
  unit, 
  min = 0, 
  max = 100, 
  thresholdWarning, 
  thresholdCritical, 
  higherIsBad = true,
  icon: Icon 
}) {
  const numVal = typeof value === 'number' ? value : 0;
  const pct = Math.min(100, Math.max(0, ((numVal - min) / (max - min)) * 100));

  let isCritical = false;
  let isWarning = false;

  if (higherIsBad) {
    if (thresholdCritical !== undefined && numVal > thresholdCritical) isCritical = true;
    else if (thresholdWarning !== undefined && numVal > thresholdWarning) isWarning = true;
  } else {
    if (thresholdCritical !== undefined && numVal < thresholdCritical) isCritical = true;
    else if (thresholdWarning !== undefined && numVal < thresholdWarning) isWarning = true;
  }

  const statusColor = isCritical 
    ? 'text-accent-red border-red-500/40 bg-red-500/10' 
    : isWarning 
    ? 'text-accent-amber border-amber-500/40 bg-amber-500/10'
    : 'text-accent-lime border-lime-500/30 bg-lime-500/5';

  const barColor = isCritical 
    ? 'bg-accent-red' 
    : isWarning 
    ? 'bg-accent-amber' 
    : 'bg-accent-lime';

  return (
    <div className={`p-4 rounded-lg border bg-graphite-900 ${statusColor} transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 opacity-80" />}
          <span className="text-xs font-mono font-medium text-slate-300">{label}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          [{min} - {max} {unit}]
        </span>
      </div>

      <div className="flex items-baseline justify-between my-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">
          {value !== undefined && value !== null ? value : '--'}
        </span>
        <span className="text-xs font-mono text-slate-400 font-semibold">{unit}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-graphite-800 rounded-full overflow-hidden mt-3 border border-panel-border/40">
        <div
          style={{ width: `${pct}%` }}
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
        />
      </div>
    </div>
  );
}
