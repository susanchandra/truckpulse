import React from 'react';
import { StatusBadge, HealthBadge } from '../common/StatusBadge';
import { computeVehicleHealth } from '../../utils/formatters';
import { ChevronRight, Gauge, Flame, Activity, Battery, Fuel, Radio } from 'lucide-react';

export function VehicleCard({ vehicle, telemetry, activeFaults, onClick }) {
  const health = computeVehicleHealth(vehicle.id, activeFaults);
  const vehicleFaults = activeFaults.filter(f => f.vehicle_id === vehicle.id);

  return (
    <div
      onClick={onClick}
      className="panel p-5 hover:border-slate-500 transition-all cursor-pointer group bg-graphite-900 flex flex-col justify-between"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold font-mono text-accent-lime group-hover:underline">
                {vehicle.id}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-graphite-800 border border-panel-border text-slate-400">
                {vehicle.fleet_tag}
              </span>
            </div>
            <h4 className="text-xs text-slate-200 mt-1 font-medium">{vehicle.model}</h4>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <HealthBadge health={health} />
            <StatusBadge status={telemetry?.engine_status || vehicle.engine_status} />
          </div>
        </div>

        {/* Diagnostic alert banner if active */}
        {vehicleFaults.length > 0 && (
          <div className="mb-4 p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center justify-between">
            <span className="font-bold">{vehicleFaults[0].fault_code}</span>
            <span className="text-[10px]">{vehicleFaults.length} Active DTC</span>
          </div>
        )}

        {/* Telemetry Metric Grid */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-panel-border text-xs font-mono my-2">
          <div className="p-2 rounded bg-graphite-850">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-lime-400" /> RPM
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              {telemetry ? telemetry.engine_rpm : '--'}
            </div>
          </div>

          <div className="p-2 rounded bg-graphite-850">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-400" /> COOLANT
            </div>
            <div className={`text-sm font-bold mt-0.5 ${
              telemetry?.coolant_temp_c > 105 ? 'text-accent-red' : 'text-white'
            }`}>
              {telemetry ? `${telemetry.coolant_temp_c}°C` : '--'}
            </div>
          </div>

          <div className="p-2 rounded bg-graphite-850">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" /> OIL
            </div>
            <div className={`text-sm font-bold mt-0.5 ${
              telemetry?.oil_pressure_psi < 15 ? 'text-accent-red' : 'text-white'
            }`}>
              {telemetry ? `${telemetry.oil_pressure_psi} PSI` : '--'}
            </div>
          </div>

          <div className="p-2 rounded bg-graphite-850">
            <div className="text-[10px] text-slate-400">SPEED</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {telemetry ? `${telemetry.speed_kmh} KM/H` : '--'}
            </div>
          </div>

          <div className="p-2 rounded bg-graphite-850">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Fuel className="w-3 h-3 text-amber-400" /> FUEL
            </div>
            <div className={`text-sm font-bold mt-0.5 ${
              telemetry?.fuel_level_pct < 5 ? 'text-accent-amber' : 'text-white'
            }`}>
              {telemetry ? `${telemetry.fuel_level_pct}%` : '--'}
            </div>
          </div>

          <div className="p-2 rounded bg-graphite-850">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Battery className="w-3 h-3 text-pink-400" /> BATTERY
            </div>
            <div className={`text-sm font-bold mt-0.5 ${
              telemetry?.battery_voltage < 11.5 ? 'text-accent-amber' : 'text-white'
            }`}>
              {telemetry ? `${telemetry.battery_voltage} V` : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
        <span className="flex items-center gap-1.5 text-[10px]">
          <Radio className="w-3 h-3 text-accent-lime" /> Frame CRC Valid
        </span>
        <span className="text-accent-lime flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
          Diagnostics View <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}
