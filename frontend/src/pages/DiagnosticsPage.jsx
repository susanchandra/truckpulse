import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { SeverityBadge } from '../components/common/StatusBadge';
import { formatDateTime } from '../utils/formatters';
import { ShieldAlert, AlertTriangle, CheckCircle2, Filter, Search, Clock, Cpu } from 'lucide-react';

export function DiagnosticsPage({ onSelectVehicle }) {
  const { activeFaults, diagnosticsHistory, vehicles } = useFleet();
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');

  // Combined list for filtering
  const allEvents = [...diagnosticsHistory];

  const filteredEvents = allEvents.filter((ev) => {
    const matchesSearch = 
      ev.vehicle_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.fault_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVehicle = 
      selectedVehicle === 'ALL' || ev.vehicle_id === selectedVehicle;

    let matchesSeverity = true;
    if (filterSeverity === 'CRITICAL') matchesSeverity = ev.severity === 'CRITICAL' && !ev.is_resolved;
    else if (filterSeverity === 'WARNING') matchesSeverity = ev.severity === 'WARNING' && !ev.is_resolved;
    else if (filterSeverity === 'RESOLVED') matchesSeverity = ev.is_resolved === true;

    return matchesSearch && matchesVehicle && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Active Diagnostics Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-red-400 font-semibold">CRITICAL ACTIVE FAULTS</p>
            <p className="text-2xl font-bold font-mono text-white mt-1">
              {activeFaults.filter(f => f.severity === 'CRITICAL').length}
            </p>
          </div>
          <ShieldAlert className="w-8 h-8 text-red-400 opacity-80" />
        </div>

        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-amber-400 font-semibold">WARNING ACTIVE ALERTS</p>
            <p className="text-2xl font-bold font-mono text-white mt-1">
              {activeFaults.filter(f => f.severity === 'WARNING').length}
            </p>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-400 opacity-80" />
        </div>

        <div className="p-4 rounded-lg border border-lime-500/30 bg-lime-500/10 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-lime-400 font-semibold">RESOLVED TRANSITIONS</p>
            <p className="text-2xl font-bold font-mono text-white mt-1">
              {diagnosticsHistory.filter(f => f.is_resolved).length}
            </p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-lime-400 opacity-80" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fault code, vehicle, or description..."
              className="w-full pl-9 pr-3 py-1.5 bg-graphite-850 border border-panel-border rounded text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-accent-lime"
            />
          </div>

          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="bg-graphite-850 border border-panel-border rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-accent-lime"
          >
            <option value="ALL">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.id}</option>
            ))}
          </select>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
          {['ALL', 'CRITICAL', 'WARNING', 'RESOLVED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                filterSeverity === s
                  ? 'bg-accent-lime text-graphite-950 font-bold'
                  : 'bg-graphite-850 text-slate-400 hover:text-white hover:bg-graphite-800 border border-panel-border'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostic Events Table / Stream */}
      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-panel-border bg-panel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent-lime" />
            <h3 className="text-sm font-semibold text-white">Diagnostic Trouble Codes (DTC) Event Log</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {filteredEvents.length} records found
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">
            No diagnostic events matching the current search & filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-graphite-900 border-b border-panel-border text-[10px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-3">Vehicle</th>
                  <th className="py-3 px-3">Fault Code</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-4 font-sans">Description</th>
                  <th className="py-3 px-3 text-right">Observed</th>
                  <th className="py-3 px-3 text-right">Threshold</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-graphite-850/60 transition-colors">
                    <td className="py-3 px-4 text-slate-400">{ev.id}</td>
                    <td 
                      onClick={() => onSelectVehicle(ev.vehicle_id)}
                      className="py-3 px-3 font-bold text-accent-lime hover:underline cursor-pointer"
                    >
                      {ev.vehicle_id}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">{ev.fault_code}</td>
                    <td className="py-3 px-3">
                      <SeverityBadge severity={ev.severity} />
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{ev.description}</td>
                    <td className="py-3 px-3 text-right font-bold text-white">{ev.observed_value}</td>
                    <td className="py-3 px-3 text-right text-slate-400">{ev.threshold}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.is_resolved 
                          ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' 
                          : 'bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse'
                      }`}>
                        {ev.is_resolved ? 'RESOLVED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">{formatDateTime(ev.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
