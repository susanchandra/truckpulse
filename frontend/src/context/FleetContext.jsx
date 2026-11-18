import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { normalizeTelemetry, normalizeDiagnosticEvent } from '../utils/formatters';

const FleetContext = createContext(null);

export function FleetProvider({ children }) {
  const [vehicles, setVehicles] = useState([]);
  const [fleetSummary, setFleetSummary] = useState(null);
  const [latestTelemetry, setLatestTelemetry] = useState({});
  const [telemetryHistory, setTelemetryHistory] = useState({});
  const [activeFaults, setActiveFaults] = useState([]);
  const [diagnosticsHistory, setDiagnosticsHistory] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ status: 'connecting', database: 'unknown' });
  const [isConnected, setIsConnected] = useState(false);
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Initial load via REST APIs
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [healthRes, fleetRes, activeRes, histRes] = await Promise.allSettled([
        api.getHealth(),
        api.getFleet(),
        api.getActiveDiagnostics(),
        api.getDiagnosticsHistory(null, 50),
      ]);

      if (healthRes.status === 'fulfilled') {
        setSystemHealth(healthRes.value);
      }
      if (fleetRes.status === 'fulfilled') {
        const fleetData = fleetRes.value;
        setFleetSummary(fleetData);
        setVehicles(fleetData.vehicles || []);
        setIsSimRunning(fleetData.simulation_running || false);

        // Fetch initial telemetry history for each vehicle
        if (fleetData.vehicles?.length) {
          const telPromises = fleetData.vehicles.map(v =>
            api.getVehicleTelemetry(v.id, 30).catch(() => [])
          );
          const results = await Promise.all(telPromises);
          const historyMap = {};
          const latestMap = {};

          fleetData.vehicles.forEach((v, idx) => {
            const list = (results[idx] || []).map(normalizeTelemetry).filter(Boolean);
            historyMap[v.id] = list;
            if (list.length > 0) {
              latestMap[v.id] = list[list.length - 1];
            }
          });

          setTelemetryHistory(historyMap);
          setLatestTelemetry(latestMap);
        }
      }

      if (activeRes.status === 'fulfilled') {
        setActiveFaults((activeRes.value || []).map(normalizeDiagnosticEvent));
      }

      if (histRes.status === 'fulfilled') {
        setDiagnosticsHistory((histRes.value || []).map(normalizeDiagnosticEvent));
      }

      setLastUpdated(Math.floor(Date.now() / 1000));
    } catch (err) {
      console.error('Failed to load initial fleet data:', err);
      setError(err.message || 'Error loading fleet data');
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket Connection Management (Single Shared Connection)
  useEffect(() => {
    isMountedRef.current = true;

    function connectWebSocket() {
      // Determine WS URL (ws://localhost:8000/ws/telemetry)
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/telemetry';

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) return;
          setIsConnected(true);
          console.log('[WebSocket] Connected to TruckPulse telemetry stream');
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'telemetry_tick') {
              const tickTime = data.timestamp || Math.floor(Date.now() / 1000);
              setLastUpdated(tickTime);

              // 1. Process incoming telemetry
              if (Array.isArray(data.telemetry)) {
                setLatestTelemetry((prev) => {
                  const nextLatest = { ...prev };
                  data.telemetry.forEach((t) => {
                    const norm = normalizeTelemetry(t);
                    if (norm) {
                      nextLatest[norm.vehicle_id] = norm;
                    }
                  });
                  return nextLatest;
                });

                setTelemetryHistory((prev) => {
                  const nextHistory = { ...prev };
                  data.telemetry.forEach((t) => {
                    const norm = normalizeTelemetry(t);
                    if (norm) {
                      const list = nextHistory[norm.vehicle_id] ? [...nextHistory[norm.vehicle_id]] : [];
                      list.push(norm);
                      // Bound history points in memory to 40 for fast charting
                      if (list.length > 40) list.shift();
                      nextHistory[norm.vehicle_id] = list;
                    }
                  });
                  return nextHistory;
                });
              }

              // 2. Process active faults
              if (Array.isArray(data.activeFaults)) {
                const normActive = data.activeFaults.map(normalizeDiagnosticEvent);
                setActiveFaults(normActive);
              }

              // 3. Process new transition events
              if (Array.isArray(data.newEvents) && data.newEvents.length > 0) {
                const normNew = data.newEvents.map(normalizeDiagnosticEvent);
                setDiagnosticsHistory((prev) => [...normNew, ...prev].slice(0, 100));
              }
            }
          } catch (err) {
            console.error('[WebSocket] Message parse error:', err);
          }
        };

        ws.onerror = (err) => {
          console.warn('[WebSocket] Connection error:', err);
          setIsConnected(false);
        };

        ws.onclose = () => {
          if (!isMountedRef.current) return;
          setIsConnected(false);
          console.log('[WebSocket] Connection closed. Retrying in 2.5s...');
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2500);
        };
      } catch (err) {
        console.error('[WebSocket] Init failed:', err);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      }
    }

    loadInitialData();
    connectWebSocket();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [loadInitialData]);

  // Simulation Controls
  const toggleSimulation = async () => {
    try {
      if (isSimRunning) {
        await api.stopSimulation();
        setIsSimRunning(false);
      } else {
        await api.startSimulation();
        setIsSimRunning(true);
      }
    } catch (err) {
      console.error('Failed to toggle simulation:', err);
    }
  };

  const injectFault = async (vehicleId, faultType) => {
    return await api.injectFault(vehicleId, faultType);
  };

  const getVehicleData = (vehicleId) => {
    return {
      vehicle: vehicles.find((v) => v.id === vehicleId),
      telemetry: latestTelemetry[vehicleId] || null,
      history: telemetryHistory[vehicleId] || [],
      activeFaults: activeFaults.filter((f) => f.vehicle_id === vehicleId),
      eventsHistory: diagnosticsHistory.filter((f) => f.vehicle_id === vehicleId),
    };
  };

  const value = {
    vehicles,
    fleetSummary,
    latestTelemetry,
    telemetryHistory,
    activeFaults,
    diagnosticsHistory,
    systemHealth,
    isConnected,
    isSimRunning,
    lastUpdated,
    loading,
    error,
    refreshFleet: loadInitialData,
    toggleSimulation,
    injectFault,
    getVehicleData,
  };

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
}
