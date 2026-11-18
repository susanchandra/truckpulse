import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { VehicleCard } from '../components/fleet/VehicleCard';
import { computeVehicleHealth } from '../utils/formatters';
import { Search, Filter, Truck } from 'lucide-react';

export function FleetPage({ onSelectVehicle }) {
  const { vehicles, latestTelemetry, activeFaults } = useFleet();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHealth, setFilterHealth] = useState('ALL');

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const health = computeVehicleHealth(v.id, activeFaults);
    const matchesSearch = 
      v.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.fleet_tag || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterHealth === 'ALL' || health === filterHealth;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls: Search & Health Filter Tabs */}
      <div className="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Vehicle ID (e.g. TRK-101) or Model..."
            className="w-full pl-9 pr-4 py-2 bg-graphite-850 border border-panel-border rounded text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-accent-lime"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-mono text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {['ALL', 'HEALTHY', 'WARNING', 'CRITICAL'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterHealth(f)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                filterHealth === f
                  ? 'bg-accent-lime text-graphite-950 font-bold'
                  : 'bg-graphite-850 text-slate-400 hover:text-white hover:bg-graphite-800 border border-panel-border'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Vehicle Cards */}
      {filteredVehicles.length === 0 ? (
        <div className="panel p-12 text-center">
          <Truck className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
          <p className="text-sm font-mono text-slate-300 font-semibold">No vehicles found</p>
          <p className="text-xs text-slate-400 mt-1">No fleet assets match "{searchTerm}" under filter "{filterHealth}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              telemetry={latestTelemetry[v.id]}
              activeFaults={activeFaults}
              onClick={() => onSelectVehicle(v.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
