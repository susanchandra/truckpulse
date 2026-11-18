import React from 'react';
import { 
  Play, 
  Square, 
  AlertOctagon, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Clock 
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { formatTimestamp } from '../../utils/formatters';

export function Navbar({ title, onOpenFaultModal }) {
  const { 
    isConnected, 
    isSimRunning, 
    toggleSimulation, 
    lastUpdated, 
    refreshFleet,
    activeFaults
  } = useFleet();

  return (
    <header className="h-16 px-6 bg-graphite-900 border-b border-panel-border flex items-center justify-between shrink-0">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-base font-semibold text-white tracking-wide">{title}</h1>
        <p className="text-[11px] text-slate-400 font-mono">Daimler Truck Fleet Diagnostics Hub</p>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-3">
        {/* WebSocket Connection Status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono transition-colors ${
          isConnected 
            ? 'bg-lime-500/10 text-lime-400 border-lime-500/30' 
            : 'bg-red-500/10 text-red-400 border-red-500/30'
        }`}>
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-accent-lime animate-pulse-subtle" />
              <span>LIVE TELEMETRY</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>DISCONNECTED</span>
            </>
          )}
        </div>

        {/* Timestamp */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded border border-panel-border bg-graphite-850 text-xs font-mono text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{lastUpdated ? formatTimestamp(lastUpdated) : '--:--:--'}</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={refreshFleet}
          title="Refresh fleet data"
          className="p-2 rounded border border-panel-border bg-graphite-850 hover:bg-graphite-800 text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Simulation Start / Stop Button */}
        <button
          onClick={toggleSimulation}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-mono font-medium border transition-all ${
            isSimRunning
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
              : 'bg-lime-500/15 border-lime-500/40 text-lime-400 hover:bg-lime-500/25'
          }`}
        >
          {isSimRunning ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE SIM</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START SIM</span>
            </>
          )}
        </button>

        {/* Fault Injection Button */}
        <button
          onClick={onOpenFaultModal}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-mono font-medium bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 transition-all shadow-[0_0_12px_rgba(239,68,68,0.1)]"
        >
          <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
          <span>INJECT FAULT</span>
        </button>
      </div>
    </header>
  );
}
