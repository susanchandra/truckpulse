import React from 'react';
import { Settings, Server, Cpu, Radio, Shield, Database } from 'lucide-react';
import { useFleet } from '../context/FleetContext';

export function SettingsPage() {
  const { systemHealth, isConnected } = useFleet();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded bg-graphite-800 border border-panel-border text-slate-300">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">System Architecture & Configuration</h2>
            <p className="text-xs text-slate-400 font-mono">Daimler Truck Innovation Center India (DTICI) Platform Specs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded bg-graphite-850 border border-panel-border">
            <div className="flex items-center gap-2 text-accent-lime font-mono text-xs font-bold mb-2">
              <Cpu className="w-4 h-4" /> C++17 VEHICLE SIMULATOR
            </div>
            <ul className="text-xs font-mono text-slate-300 space-y-1.5">
              <li>Status: <span className="text-white font-semibold">Native Executable Child Process</span></li>
              <li>IPC Interface: <span className="text-white font-semibold">Standard IO JSON Stream</span></li>
              <li>PRNG Engine: <span className="text-white font-semibold">std::mt19937 (deterministic seed)</span></li>
              <li>Binary Framing: <span className="text-white font-semibold">44-byte Little-Endian, CRC-16</span></li>
            </ul>
          </div>

          <div className="p-4 rounded bg-graphite-850 border border-panel-border">
            <div className="flex items-center gap-2 text-accent-cyan font-mono text-xs font-bold mb-2">
              <Server className="w-4 h-4" /> PYTHON FASTAPI BACKEND
            </div>
            <ul className="text-xs font-mono text-slate-300 space-y-1.5">
              <li>Runtime: <span className="text-white font-semibold">Python 3.12 / Uvicorn ASGI</span></li>
              <li>Database: <span className="text-white font-semibold">SQLite + SQLAlchemy 2.0 ORM</span></li>
              <li>Live Updates: <span className="text-white font-semibold">WebSocket (1.0 Hz cadence)</span></li>
              <li>Health Check: <span className="text-lime-400 font-semibold">{systemHealth.status}</span></li>
            </ul>
          </div>

          <div className="p-4 rounded bg-graphite-850 border border-panel-border">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold mb-2">
              <Shield className="w-4 h-4" /> DIAGNOSTICS ENGINE RULES
            </div>
            <ul className="text-xs font-mono text-slate-300 space-y-1.5">
              <li>Coolant Temp: <span className="text-red-400">&gt; 105 °C (CRITICAL)</span></li>
              <li>Oil Pressure: <span className="text-red-400">&lt; 15 PSI (CRITICAL)</span></li>
              <li>Engine RPM: <span className="text-amber-400">&gt; 3500 RPM (WARNING)</span></li>
              <li>Battery Voltage: <span className="text-amber-400">&lt; 11.5 V (WARNING)</span></li>
              <li>Fuel Reserve: <span className="text-amber-400">&lt; 5% (WARNING)</span></li>
            </ul>
          </div>

          <div className="p-4 rounded bg-graphite-850 border border-panel-border">
            <div className="flex items-center gap-2 text-pink-400 font-mono text-xs font-bold mb-2">
              <Radio className="w-4 h-4" /> WEBSOCKET STREAM
            </div>
            <ul className="text-xs font-mono text-slate-300 space-y-1.5">
              <li>Endpoint: <span className="text-white font-semibold">ws://localhost:8000/ws/telemetry</span></li>
              <li>Connection State: <span className={isConnected ? "text-lime-400 font-bold" : "text-red-400 font-bold"}>
                {isConnected ? 'ESTABLISHED' : 'DISCONNECTED'}
              </span></li>
              <li>Message Format: <span className="text-white font-semibold">telemetry_tick (JSON)</span></li>
              <li>Heartbeat: <span className="text-white font-semibold">Bidirectional PING/PONG</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
