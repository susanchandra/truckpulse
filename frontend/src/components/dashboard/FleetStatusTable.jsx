import React from 'react';
import { StatusBadge, HealthBadge } from '../common/StatusBadge';
import { computeVehicleHealth } from '../../utils/formatters';
import { ChevronRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function FleetStatusTable({ vehicles, latestTelemetry, activeFaults, onSelectVehicle }) {
  return (
    <div className="panel overflow-hidden">
      <div className="p-4 border-b border-panel-border bg-panel-header flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Live Fleet Status</h3>
          <p className="text-[11px] text-slate-400 font-mono">Real-time telemetry matrix & ECU status (CAN-inspired)</p>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Showing {vehicles.length} trucks
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-graphite-900 border-b border-panel-border text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Vehicle ID</th>
              <th className="py-3 px-3">Model</th>
              <th className="py-3 px-3">Engine Status</th>
              <th className="py-3 px-3 text-right">RPM</th>
              <th className="py-3 px-3 text-right">Coolant</th>
              <th className="py-3 px-3 text-right">Oil Press.</th>
              <th className="py-3 px-3 text-right">Speed</th>
              <th className="py-3 px-3 text-right">Fuel</th>
              <th className="py-3 px-3 text-right">Battery</th>
              <th className="py-3 px-4 text-center">Health</th>
              <th className="py-3 px-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border font-mono">
            {vehicles.map((v) => {
              const tel = latestTelemetry[v.id];
              const health = computeVehicleHealth(v.id, activeFaults);
              const vehicleFaults = activeFaults.filter(f => f.vehicle_id === v.id);

              return (
                <tr
                  key={v.id}
                  onClick={() => onSelectVehicle(v.id)}
                  className="hover:bg-graphite-850/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-bold text-accent-lime flex items-center gap-2">
                    <span>{v.id}</span>
                    <span className="text-[10px] px-1 rounded bg-panel-border text-slate-400 font-normal">
                      {v.fleet_tag || 'FLEET'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-200 font-sans">{v.model}</td>
                  <td className="py-3.5 px-3">
                    <StatusBadge status={tel?.engine_status || v.engine_status} />
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-200">
                    {tel ? `${tel.engine_rpm} RPM` : '--'}
                  </td>
                  <td className={`py-3.5 px-3 text-right font-semibold ${
                    tel?.coolant_temp_c > 105 ? 'text-accent-red font-bold animate-pulse' : 'text-slate-200'
                  }`}>
                    {tel ? `${tel.coolant_temp_c} °C` : '--'}
                  </td>
                  <td className={`py-3.5 px-3 text-right font-semibold ${
                    tel?.oil_pressure_psi < 15 ? 'text-accent-red font-bold animate-pulse' : 'text-slate-200'
                  }`}>
                    {tel ? `${tel.oil_pressure_psi} PSI` : '--'}
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-200">
                    {tel ? `${tel.speed_kmh} KM/H` : '--'}
                  </td>
                  <td className={`py-3.5 px-3 text-right ${
                    tel?.fuel_level_pct < 5 ? 'text-accent-amber font-bold' : 'text-slate-200'
                  }`}>
                    {tel ? `${tel.fuel_level_pct}%` : '--'}
                  </td>
                  <td className={`py-3.5 px-3 text-right ${
                    tel?.battery_voltage < 11.5 ? 'text-accent-amber font-bold' : 'text-slate-200'
                  }`}>
                    {tel ? `${tel.battery_voltage} V` : '--'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <HealthBadge health={health} />
                  </td>
                  <td className="py-3.5 px-2 text-slate-400 group-hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
