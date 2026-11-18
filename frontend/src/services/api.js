import axios from 'axios';

// Base URL defaults to empty string so Vite proxy forwards /api and /health to :8000,
// but can fallback to direct URL if needed.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Health
  getHealth: async () => {
    const res = await client.get('/health');
    return res.data;
  },

  // Fleet
  getFleet: async () => {
    const res = await client.get('/api/fleet');
    return res.data;
  },

  // Vehicles
  getVehicles: async () => {
    const res = await client.get('/api/vehicles');
    return res.data;
  },

  getVehicle: async (vehicleId) => {
    const res = await client.get(`/api/vehicles/${vehicleId}`);
    return res.data;
  },

  getVehicleTelemetry: async (vehicleId, limit = 50) => {
    const res = await client.get(`/api/vehicles/${vehicleId}/telemetry?limit=${limit}`);
    return res.data;
  },

  // Diagnostics
  getDiagnostics: async (vehicleId = null) => {
    const url = vehicleId ? `/api/diagnostics?vehicle_id=${vehicleId}` : '/api/diagnostics';
    const res = await client.get(url);
    return res.data;
  },

  getActiveDiagnostics: async (vehicleId = null) => {
    const url = vehicleId ? `/api/diagnostics/active?vehicle_id=${vehicleId}` : '/api/diagnostics/active';
    const res = await client.get(url);
    return res.data;
  },

  getDiagnosticsHistory: async (vehicleId = null, limit = 100) => {
    let url = `/api/diagnostics/history?limit=${limit}`;
    if (vehicleId) url += `&vehicle_id=${vehicleId}`;
    const res = await client.get(url);
    return res.data;
  },

  // Simulation Controls
  startSimulation: async () => {
    const res = await client.post('/api/simulation/start');
    return res.data;
  },

  stopSimulation: async () => {
    const res = await client.post('/api/simulation/stop');
    return res.data;
  },

  injectFault: async (vehicleId, faultType) => {
    const res = await client.post('/api/simulation/inject-fault', {
      vehicle_id: vehicleId,
      fault_type: faultType,
    });
    return res.data;
  },
};

export default api;
