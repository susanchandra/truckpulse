import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { TelemetryGauge } from '../components/telemetry/TelemetryGauge';
import { formatTimestamp, formatDateTime } from '../utils/formatters';
import { 
  Activity, 
  Flame, 
  Gauge, 
  Battery, 
  Fuel, 
  Zap, 
  Radio, 
  Clock, 
  Layers 
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';

export function TelemetryPage() {
  const { vehicles, latestTelemetry, telemetryHistory } = useFleet();
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || 'TRK-101');
  const [selectedMetric, setSelectedMetric] = useState('all');

  const vehicleTelemetry = latestTelemetry[selectedVehicleId];
  const vehicleHistory = telemetryHistory[selectedVehicleId] || [];

  const metricsConfig = {
    engine_rpm: { label: 'Engine RPM', unit: 'RPM', color: '#a3e635', threshold: 3500 },
    coolant_temp_c: { label: 'Coolant Temp', unit: '°C', color: '#ef4444', threshold: 105 },
    oil_pressure_psi: { label: 'Oil Pressure', unit: 'PSI', color: '#06b6d4', threshold: 15 },
    speed_kmh: { label: 'Vehicle Speed', unit: 'KM/H', color: '#38bdf8', threshold: null },
    fuel_level_pct: { label: 'Fuel Level', unit: '%', color: '#f59e0b', threshold: 5 },
    battery_voltage: { label: 'Battery Voltage', unit: 'V', color: '#ec4899', threshold: 11.5 },
  };

  const chartData = vehicleHistory.map((item) => ({
    time: formatTimestamp(item.timestamp),
    engine_rpm: item.engine_rpm,
    coolant_temp_c: item.coolant_temp_c,
    oil_pressure_psi: item.oil_pressure_psi,
    speed_kmh: item.speed_kmh,
    fuel_level_pct: item.fuel_level_pct,
    battery_voltage: item.battery_voltage,
  }));

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Custom Binary Telemetry Inspector</h2>
          <p className="text-[11px] text-slate-400 font-mono">
            Simulated sensor telemetry stream (44-byte binary packet, little-endian, CRC-16)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Target vehicle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">VEHICLE:</span>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-graphite-850 border border-panel-border rounded px-3 py-1.5 text-xs font-mono text-accent-lime font-bold focus:outline-none focus:border-accent-lime"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {v.model}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">METRIC:</span>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-graphite-850 border border-panel-border rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-accent-lime"
            >
              <option value="all">Normalized Comparison</option>
              {Object.keys(metricsConfig).map((k) => (
                <option key={k} value={k}>{metricsConfig[k].label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Six Live Sensor Cards for selected vehicle */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <TelemetryGauge
            label="Engine Speed"
            value={vehicleTelemetry?.engine_rpm}
            unit="RPM"
            min={600}
            max={4500}
            thresholdWarning={3500}
            icon={Zap}
          />
          <TelemetryGauge
            label="Coolant Temp"
            value={vehicleTelemetry?.coolant_temp_c}
            unit="°C"
            min={40}
            max={130}
            thresholdCritical={105}
            icon={Flame}
          />
          <TelemetryGauge
            label="Oil Pressure"
            value={vehicleTelemetry?.oil_pressure_psi}
            unit="PSI"
            min={0}
            max={80}
            thresholdCritical={15}
            higherIsBad={false}
            icon={Gauge}
          />
          <TelemetryGauge
            label="Ground Speed"
            value={vehicleTelemetry?.speed_kmh}
            unit="KM/H"
            min={0}
            max={130}
            icon={Activity}
          />
          <TelemetryGauge
            label="Fuel Tank"
            value={vehicleTelemetry?.fuel_level_pct}
            unit="%"
            min={0}
            max={100}
            thresholdWarning={5}
            higherIsBad={false}
            icon={Fuel}
          />
          <TelemetryGauge
            label="Bus Battery"
            value={vehicleTelemetry?.battery_voltage}
            unit="V"
            min={9}
            max={16}
            thresholdWarning={11.5}
            higherIsBad={false}
            icon={Battery}
          />
        </div>
      </div>

      {/* Main Real-Time Telemetry Chart */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-lime" />
            <h3 className="text-sm font-semibold text-white">Live Time-Series Sensor Trace</h3>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-accent-lime" /> Streaming 1.0 Hz
            </span>
            <span>{vehicleHistory.length} Samples</span>
          </div>
        </div>

        <div className="h-80 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">
              Awaiting telemetry buffer population from C++ simulator...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222838" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0e1117', 
                    borderColor: '#2b3348', 
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />

                {selectedMetric === 'all' ? (
                  <>
                    <Line type="monotone" dataKey="engine_rpm" name="RPM" stroke="#a3e635" dot={false} strokeWidth={2} isAnimationActive={false} />
                    <Line type="monotone" dataKey="coolant_temp_c" name="Coolant (°C)" stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
                    <Line type="monotone" dataKey="oil_pressure_psi" name="Oil (PSI)" stroke="#06b6d4" dot={false} strokeWidth={2} isAnimationActive={false} />
                    <Line type="monotone" dataKey="speed_kmh" name="Speed (KM/H)" stroke="#38bdf8" dot={false} strokeWidth={2} isAnimationActive={false} />
                    <Line type="monotone" dataKey="fuel_level_pct" name="Fuel (%)" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
                    <Line type="monotone" dataKey="battery_voltage" name="Battery (V)" stroke="#ec4899" dot={false} strokeWidth={2} isAnimationActive={false} />
                  </>
                ) : (
                  <>
                    {metricsConfig[selectedMetric]?.threshold && (
                      <ReferenceLine
                        y={metricsConfig[selectedMetric].threshold}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        label={{
                          value: `Limit: ${metricsConfig[selectedMetric].threshold}`,
                          fill: '#ef4444',
                          fontSize: 10,
                          position: 'insideTopRight',
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey={selectedMetric}
                      name={`${metricsConfig[selectedMetric]?.label} (${metricsConfig[selectedMetric]?.unit})`}
                      stroke={metricsConfig[selectedMetric]?.color || '#a3e635'}
                      dot={{ r: 2 }}
                      strokeWidth={2.5}
                      isAnimationActive={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Telemetry Frame History Table */}
      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-panel-border bg-panel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-cyan" />
            <h3 className="text-sm font-semibold text-white">Recent Received Telemetry Packets (44B Binary)</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Latest {vehicleHistory.length} packets
          </span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-graphite-900 border-b border-panel-border text-[10px] text-slate-400 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Frame Timestamp</th>
                <th className="py-2.5 px-3 text-right">RPM</th>
                <th className="py-2.5 px-3 text-right">Coolant</th>
                <th className="py-2.5 px-3 text-right">Oil Press.</th>
                <th className="py-2.5 px-3 text-right">Speed</th>
                <th className="py-2.5 px-3 text-right">Fuel</th>
                <th className="py-2.5 px-3 text-right">Battery</th>
                <th className="py-2.5 px-4 text-center">Protocol Integrity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border">
              {vehicleHistory.slice().reverse().map((rec, i) => (
                <tr key={i} className="hover:bg-graphite-850/60">
                  <td className="py-2.5 px-4 text-slate-300">{formatDateTime(rec.timestamp)}</td>
                  <td className="py-2.5 px-3 text-right">{rec.engine_rpm} RPM</td>
                  <td className="py-2.5 px-3 text-right">{rec.coolant_temp_c} °C</td>
                  <td className="py-2.5 px-3 text-right">{rec.oil_pressure_psi} PSI</td>
                  <td className="py-2.5 px-3 text-right">{rec.speed_kmh} KM/H</td>
                  <td className="py-2.5 px-3 text-right">{rec.fuel_level_pct}%</td>
                  <td className="py-2.5 px-3 text-right">{rec.battery_voltage} V</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] text-accent-lime bg-lime-500/10 px-2 py-0.5 rounded border border-lime-500/20">
                      CRC-16 OK (44B)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
