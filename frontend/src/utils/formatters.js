/**
 * Utility functions for formatting automotive units, dates, and normalizing payloads.
 */

export function formatTimestamp(epochSeconds) {
  if (!epochSeconds) return 'N/A';
  const date = new Date(epochSeconds * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDateTime(epochSeconds) {
  if (!epochSeconds) return 'N/A';
  const date = new Date(epochSeconds * 1000);
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatRelativeTime(epochSeconds) {
  if (!epochSeconds) return 'Never';
  const diffSec = Math.max(0, Math.floor(Date.now() / 1000 - epochSeconds));
  if (diffSec < 2) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export function normalizeTelemetry(t) {
  if (!t) return null;
  return {
    vehicle_id: t.vehicle_id || t.vehicleId || '',
    timestamp: t.timestamp || Math.floor(Date.now() / 1000),
    engine_rpm: Math.round(t.engine_rpm ?? t.engineRPM ?? 0),
    coolant_temp_c: Number((t.coolant_temp_c ?? t.coolantTempC ?? 0).toFixed(1)),
    oil_pressure_psi: Number((t.oil_pressure_psi ?? t.oilPressurePSI ?? 0).toFixed(1)),
    speed_kmh: Number((t.speed_kmh ?? t.speedKmh ?? 0).toFixed(1)),
    fuel_level_pct: Number((t.fuel_level_pct ?? t.fuelLevelPct ?? 0).toFixed(1)),
    battery_voltage: Number((t.battery_voltage ?? t.batteryVoltage ?? 0).toFixed(1)),
    engine_status: t.engine_status || t.engineStatus || 'RUNNING',
    frame_valid: t.frame_valid ?? t.frameValid ?? true,
    frame_size: t.frame_size ?? t.frameSize ?? 44,
  };
}

export function normalizeDiagnosticEvent(e) {
  if (!e) return null;
  return {
    id: e.id || '',
    vehicle_id: e.vehicle_id || e.vehicleId || '',
    fault_code: e.fault_code || e.faultCode || '',
    severity: e.severity || 'WARNING',
    description: e.description || '',
    observed_value: Number((e.observed_value ?? e.observedValue ?? 0).toFixed(1)),
    threshold: Number((e.threshold ?? 0).toFixed(1)),
    timestamp: e.timestamp || Math.floor(Date.now() / 1000),
    is_resolved: Boolean(e.is_resolved ?? e.isResolved ?? false),
    resolved_timestamp: e.resolved_timestamp ?? e.resolvedTimestamp ?? 0,
  };
}

export function computeVehicleHealth(vehicleId, activeFaults = []) {
  const faults = activeFaults.filter(f => (f.vehicle_id === vehicleId || f.vehicleId === vehicleId));
  if (faults.some(f => f.severity === 'CRITICAL')) return 'CRITICAL';
  if (faults.some(f => f.severity === 'WARNING')) return 'WARNING';
  return 'HEALTHY';
}
