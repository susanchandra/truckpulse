import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { StatusBadge, HealthBadge, SeverityBadge } from '../components/common/StatusBadge';
import { TelemetryGauge } from '../components/telemetry/TelemetryGauge';
import { computeVehicleHealth, formatTimestamp, formatDateTime } from '../utils/formatters';
import { 
  ArrowLeft, 
  Activity, 
  Flame, 
  Gauge, 
  Battery, 
  Fuel, 
  Zap, 
  ShieldAlert, 
  Clock, 
  Radio, 
  CheckCircle2, 
  AlertOctagon 
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export function VehicleDetailPage({ vehicleId, onBack, onOpenFaultModal }) {
  const { vehicles, latestTelemetry, telemetryHistory, activeFaults, diagnosticsHistory } = useFleet();

  const vehicle = vehicles.find((v) => v.id === vehicleId) || {
    id: vehicleId,
    model: 'Mercedes Actros',
    fleet_tag: 'FLEET-A',
    engine_status: 'RUNNING',
  };

  const telemetry = latestTelemetry[vehicleId];
  const history = telemetryHistory[vehicleId] || [];
  const health = computeVehicleHealth(vehicleId, activeFaults);
  const vehicleActiveFaults = activeFaults.filter((f) => f.vehicle_id === vehicleId);
  const vehicleHistoryFaults = diagnosticsHistory.filter((f) => f.vehicle_id === vehicleId);

  const [chartMetric, setChartMetric] = useState('engine_rpm');

  const chartMetricsConfig = {
    engine_rpm: { label: 'Engine RPM', unit: 'RPM', color: '#a3e635' },
    coolant_temp_c: { label: 'Coolant Temp', unit: '°C', color: '#ef4444' },
    oil_pressure_psi: { label: 'Oil Pressure', unit: 'PSI', color: '#06b6d4' },
    speed_kmh: { label: 'Vehicle Speed', unit: 'KM/H', color: '#38bdf8' },
    fuel_level_pct: { label: 'Fuel Level', unit: '%', color: '#f59e0b' },
    battery_voltage: { label: 'Battery Voltage', unit: 'V', color: '#ec4899' },
  };

  const formattedChartData = history.map((pt) => ({
    time: formatTimestamp(pt.timestamp),
    [chartMetric]: pt[chartMetric],
  }));

  return (
    <div className="space-y-6">
      {/* Back button & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-panel-border">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded bg-graphite-850 border border-panel-border text-slate-300 hover:text-white hover:bg-graphite-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold font-mono text-white tracking-wide">{vehicle.id}</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-graphite-800 border border-panel-border text-slate-400">
                {vehicle.fleet_tag}
              </span>
              <HealthBadge health={health} />
              <StatusBadge status={telemetry?.engine_status || vehicle.engine_status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{vehicle.model}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenFaultModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-mono font-medium bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 transition-all"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>INJECT FAULT ON {vehicle.id}</span>
          </button>
        </div>
      </div>

      {/* Six Live Sensor Gauges */}
      <div>
        <h3 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-accent-lime" /> Telemetry Transducer Readings (Protocol v1.0)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <TelemetryGauge
            label="Engine Speed"
            value={telemetry?.engine_rpm}
            unit="RPM"
            min={600}
            max={4500}
            thresholdWarning={3500}
            icon={Zap}
          />
          <TelemetryGauge
            label="Coolant Temp"
            value={telemetry?.coolant_temp_c}
            unit="°C"
            min={40}
            max={130}
            thresholdCritical={105}
            icon={Flame}
          />
          <TelemetryGauge
            label="Oil Pressure"
            value={telemetry?.oil_pressure_psi}
            unit="PSI"
            min={0}
            max={80}
            thresholdCritical={15}
            higherIsBad={false}
            icon={Gauge}
          />
          <TelemetryGauge
            label="Ground Speed"
            value={telemetry?.speed_kmh}
            unit="KM/H"
            min={0}
            max={130}
            icon={Activity}
          />
          <TelemetryGauge
            label="Fuel Tank"
            value={telemetry?.fuel_level_pct}
            unit="%"
            min={0}
            max={100}
            thresholdWarning={5}
            higherIsBad={false}
            icon={Fuel}
          />
          <TelemetryGauge
            label="Bus Battery"
            value={telemetry?.battery_voltage}
            unit="V"
            min={9}
            max={16}
            thresholdWarning={11.5}
            higherIsBad={false}
            icon={Battery}
          />
        </div>
      </div>

      {/* Historical Telemetry Chart for this Truck */}
      <div className="panel p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Historical Parameter Trace</h3>
            <p className="text-[11px] text-slate-400 font-mono">Time-series sensor telemetry for {vehicle.id}</p>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {Object.keys(chartMetricsConfig).map((k) => (
              <button
                key={k}
                onClick={() => setChartMetric(k)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  chartMetric === k
                    ? 'bg-accent-lime text-graphite-950 font-bold'
                    : 'bg-graphite-850 border border-panel-border text-slate-400 hover:text-white'
                }`}
              >
                {chartMetricsConfig[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full">
          {formattedChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">
              No historical samples recorded yet for {vehicle.id}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <Line
                  type="monotone"
                  dataKey={chartMetric}
                  name={chartMetricsConfig[chartMetric].label}
                  stroke={chartMetricsConfig[chartMetric].color}
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: chartMetricsConfig[chartMetric].color }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Diagnostic Alerts: Active & History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-accent-red" />
            <h3 className="text-sm font-semibold text-white">Active Diagnostic Faults ({vehicleActiveFaults.length})</h3>
          </div>

          {vehicleActiveFaults.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-7 h-7 text-accent-lime mx-auto mb-2 opacity-80" />
              <p className="text-xs font-mono text-slate-300">NO ACTIVE DTCs</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Vehicle operating within normal factory tolerances.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicleActiveFaults.map((f) => (
                <div key={f.id} className="p-3.5 rounded bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-xs text-white">{f.fault_code}</span>
                    <SeverityBadge severity={f.severity} />
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{f.description}</p>
                  <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-slate-400">
                    <span>Observed: <strong className="text-white">{f.observed_value}</strong></span>
                    <span>Threshold: {f.threshold}</span>
                    <span>{formatDateTime(f.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Diagnostic History */}
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-white">Diagnostic Event Log ({vehicleHistoryFaults.length})</h3>
          </div>

          {vehicleHistoryFaults.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-400">
              No historical fault transitions recorded.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {vehicleHistoryFaults.map((f) => (
                <div key={f.id} className="p-2.5 rounded bg-graphite-850 border border-panel-border text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{f.fault_code}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      f.is_resolved ? 'bg-lime-500/20 text-lime-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {f.is_resolved ? 'RESOLVED' : 'TRIGGERED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{f.description}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(f.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
