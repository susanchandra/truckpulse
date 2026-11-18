import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend
} from 'recharts';
import { formatTimestamp } from '../../utils/formatters';
import { Activity } from 'lucide-react';

const METRICS = [
  { key: 'engine_rpm', label: 'Engine RPM', unit: 'RPM', color: '#a3e635', threshold: 3500 },
  { key: 'coolant_temp_c', label: 'Coolant Temp', unit: '°C', color: '#ef4444', threshold: 105 },
  { key: 'oil_pressure_psi', label: 'Oil Pressure', unit: 'PSI', color: '#06b6d4', threshold: 15 },
  { key: 'speed_kmh', label: 'Vehicle Speed', unit: 'KM/H', color: '#38bdf8', threshold: null },
  { key: 'fuel_level_pct', label: 'Fuel Level', unit: '%', color: '#f59e0b', threshold: 5 },
  { key: 'battery_voltage', label: 'Battery Voltage', unit: 'V', color: '#ec4899', threshold: 11.5 },
];

export function TelemetryTrendsChart({ telemetryHistory, vehicles }) {
  const [selectedMetric, setSelectedMetric] = useState(METRICS[0]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('ALL');

  // Build merged timeline points
  // For 'ALL', we show lines for TRK-101, TRK-102, TRK-103
  // Each history list has items with timestamp, engine_rpm, etc.
  const vehicleColors = {
    'TRK-101': '#a3e635', // Electric Lime
    'TRK-102': '#38bdf8', // Light Blue
    'TRK-103': '#fbbf24', // Amber
  };

  // Find max length history to map chart data
  const vehicleKeys = vehicles.map(v => v.id);
  const targetKeys = selectedVehicleId === 'ALL' ? vehicleKeys : [selectedVehicleId];

  // Align data by index (latest points)
  const maxLength = Math.max(
    ...targetKeys.map(k => (telemetryHistory[k] || []).length),
    0
  );

  const chartData = [];
  for (let i = 0; i < maxLength; i++) {
    const point = {};
    let pointTime = null;

    targetKeys.forEach(vId => {
      const hist = telemetryHistory[vId] || [];
      const item = hist[i];
      if (item) {
        point[vId] = item[selectedMetric.key];
        if (!pointTime) pointTime = item.timestamp;
      }
    });

    point.formattedTime = pointTime ? formatTimestamp(pointTime) : `T-${maxLength - i}`;
    chartData.push(point);
  }

  return (
    <div className="panel p-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-lime" />
            <h3 className="text-sm font-semibold text-white">Live Telemetry Trends</h3>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Streaming CAN bus sensor parameters across fleet
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Vehicle selector */}
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="bg-graphite-850 border border-panel-border rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-accent-lime"
          >
            <option value="ALL">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.id} ({v.model.split(' ')[0]})</option>
            ))}
          </select>

          {/* Metric selector */}
          <select
            value={selectedMetric.key}
            onChange={(e) => {
              const m = METRICS.find(item => item.key === e.target.value);
              if (m) setSelectedMetric(m);
            }}
            className="bg-graphite-850 border border-panel-border rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-accent-lime"
          >
            {METRICS.map(m => (
              <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">
            Waiting for live telemetry packets from C++ simulator...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222838" vertical={false} />
              <XAxis 
                dataKey="formattedTime" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false}
                axisLine={{ stroke: '#222838' }}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false}
                axisLine={{ stroke: '#222838' }}
                unit={selectedMetric.unit === '°C' ? '°' : selectedMetric.unit === '%' ? '%' : ''}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0e1117', 
                  borderColor: '#2b3348',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }} 
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} 
              />

              {/* Threshold warning line if applicable */}
              {selectedMetric.threshold && (
                <ReferenceLine 
                  y={selectedMetric.threshold} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: `Threshold: ${selectedMetric.threshold} ${selectedMetric.unit}`, 
                    fill: '#ef4444', 
                    fontSize: 10, 
                    position: 'insideTopRight' 
                  }} 
                />
              )}

              {/* Lines per vehicle */}
              {targetKeys.map((vId) => (
                <Line
                  key={vId}
                  type="monotone"
                  dataKey={vId}
                  name={vId}
                  stroke={vehicleColors[vId] || selectedMetric.color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
