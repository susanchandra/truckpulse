import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  AlertTriangle, 
  Activity, 
  Settings, 
  Cpu, 
  Radio
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';

export function Sidebar({ currentTab, onSelectTab }) {
  const { isConnected, activeFaults } = useFleet();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'fleet', label: 'Fleet', icon: Truck },
    { 
      id: 'diagnostics', 
      label: 'Diagnostics', 
      icon: AlertTriangle, 
      badge: activeFaults.length > 0 ? activeFaults.length : null 
    },
    { id: 'telemetry', label: 'Telemetry', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings, placeholder: true },
  ];

  return (
    <aside className="w-64 bg-graphite-900 border-r border-panel-border flex flex-col shrink-0 select-none">
      {/* Brand Logo & Header */}
      <div className="h-16 px-5 border-b border-panel-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-accent-lime/10 border border-accent-lime/30 flex items-center justify-center text-accent-lime font-mono font-bold text-base shadow-[0_0_12px_rgba(163,230,53,0.15)]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-wider text-sm text-white">TRUCK<span className="text-accent-lime">PULSE</span></span>
              <span className="text-[10px] font-mono px-1 rounded bg-panel-border text-slate-400">v1.0</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">DTICI FLEET HEALTH</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div className="p-3 space-y-1 flex-1">
        <div className="px-3 py-2 text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent-lime/10 text-white border-l-2 border-accent-lime shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-graphite-850'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent-lime' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-red/20 text-accent-red border border-accent-red/30">
                  {item.badge}
                </span>
              )}

              {item.placeholder && (
                <span className="text-[9px] font-mono text-slate-400 uppercase">
                  DEMO
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Protocol Status */}
      <div className="p-4 border-t border-panel-border bg-graphite-950/40 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-accent-cyan" /> BINARY BUS (CAN-INSPIRED)
          </span>
          <span className="text-[10px] font-mono text-accent-lime bg-accent-lime/10 px-1.5 py-0.2 rounded border border-accent-lime/20">
            44 BYTES
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
          <div className="flex justify-between">
            <span>CRC-16/CCITT:</span>
            <span className="text-slate-300">ACTIVE</span>
          </div>
          <div className="flex justify-between">
            <span>Telemetry rate:</span>
            <span className="text-slate-300">1.0 Hz</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
