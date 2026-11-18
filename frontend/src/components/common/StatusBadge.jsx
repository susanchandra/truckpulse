import React from 'react';

export function StatusBadge({ status }) {
  const s = (status || 'OFF').toUpperCase();

  const config = {
    RUNNING: {
      bg: 'bg-lime-500/10 text-lime-400 border-lime-500/30',
      dot: 'bg-lime-400',
    },
    IDLE: {
      bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      dot: 'bg-cyan-400',
    },
    WARNING: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400',
    },
    CRITICAL: {
      bg: 'bg-red-500/10 text-red-400 border-red-500/30',
      dot: 'bg-red-400',
    },
    OFF: {
      bg: 'bg-slate-700/20 text-slate-400 border-slate-700/40',
      dot: 'bg-slate-500',
    },
  }[s] || {
    bg: 'bg-slate-700/20 text-slate-400 border-slate-700/40',
    dot: 'bg-slate-500',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {s}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const sev = (severity || 'INFO').toUpperCase();

  const config = {
    CRITICAL: {
      bg: 'bg-red-500/15 text-red-400 border-red-500/30',
      label: 'CRITICAL',
    },
    WARNING: {
      bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      label: 'WARNING',
    },
    INFO: {
      bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      label: 'INFO',
    },
  }[sev] || {
    bg: 'bg-slate-700/30 text-slate-400 border-slate-700/40',
    label: sev,
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold border ${config.bg}`}>
      {config.label}
    </span>
  );
}

export function HealthBadge({ health }) {
  const h = (health || 'HEALTHY').toUpperCase();

  const config = {
    HEALTHY: {
      bg: 'bg-lime-500/10 text-lime-400 border-lime-500/30',
      dot: 'bg-lime-400',
    },
    WARNING: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400',
    },
    CRITICAL: {
      bg: 'bg-red-500/10 text-red-400 border-red-500/30',
      dot: 'bg-red-400',
    },
  }[h] || {
    bg: 'bg-slate-700/20 text-slate-400 border-slate-700/40',
    dot: 'bg-slate-400',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {h}
    </span>
  );
}
