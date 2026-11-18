# TruckPulse Dashboard — React Fleet Health & Diagnostics

> **Phase 4: High-Performance Automotive Fleet Monitoring Dashboard**  
> Built for the Graduate Engineer Trainee (GET) portfolio at **Daimler Truck Innovation Center India (DTICI)**.

---

## 1. Overview

The TruckPulse Dashboard is a desktop-first, responsive React application built with **React 18, Vite, Tailwind CSS, Recharts, Lucide React, and Axios**. It interfaces directly with the TruckPulse FastAPI backend and receives real-time 1.0 Hz simulated telemetry packets (44-byte binary layout inspired by CAN framing) via WebSockets.

---

## 2. Design System & Aesthetics

- **Background**: Dark graphite (`#0a0c10` / `#0e1117`).
- **Panels**: Charcoal cards (`#12161f`) with subtle borders (`#222838`).
- **Typography**: Inter (UI prose) & JetBrains Mono (automotive telemetry and fault codes).
- **Accents**:
  - `Electric Lime (#a3e635)`: Nominal / Healthy / Normal operating parameters.
  - `Amber (#f59e0b)`: Warning alerts (High RPM, Low Battery, Low Fuel).
  - `Red (#ef4444)`: Critical faults (Engine Overheating, Low Oil Pressure).
  - `Cyan (#06b6d4)`: Diagnostic status & metadata.

---

## 3. Pages & Features

1. **Overview Dashboard**:
   - Fleet KPI cards (Total, Healthy, Warning, Critical assets).
   - Fleet Health Distribution bar chart.
   - Live Fleet Status table with direct navigation to vehicle details.
   - Live Telemetry Trends line chart with metric selectors (RPM, Coolant, Oil Pressure, Speed, Fuel, Battery).
   - Recent Diagnostic Alerts panel.
2. **Fleet Inventory**:
   - Grid of vehicle cards displaying current telemetry, engine status, and active DTCs.
   - Search by Vehicle ID (e.g. `TRK-101`) or model.
   - Filter by health: All, Healthy, Warning, Critical.
3. **Vehicle Diagnostic Detail**:
   - Deep inspection view for a single truck.
   - Six individual physical sensor gauges with min/max bounds and threshold highlights.
   - Historical parameter trace chart for that specific asset.
   - Active ECU fault details & complete diagnostic event history log.
4. **Diagnostics & DTCs**:
   - Comprehensive diagnostic trouble codes log.
   - Summary statistics of Critical vs. Warning vs. Resolved faults.
   - Filter by severity: All, Critical, Warning, Resolved.
   - Search by code, vehicle, or description.
5. **Custom Telemetry Inspector**:
   - Dedicated telemetry analytics view with vehicle and metric selector.
   - Multi-metric or single-parameter time-series trace.
   - Historical received packets table verifying CRC-16 protocol integrity.
6. **Controlled Fault Injection Modal (SIL)**:
   - Interactive dialog allowing engineers to inject faults (Overheating, Low Oil Pressure, High RPM, Low Battery, Low Fuel, or Normalize).
   - Submits directly to `POST /api/simulation/inject-fault` and triggers real C++ simulator fault curves.

---

## 4. Running the Dashboard

### Prerequisites
Make sure the FastAPI backend is running on port 8000:
```powershell
cd d:\TruckPulse\backend
$env:PYTHONPATH = "d:\TruckPulse\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Start Frontend Dev Server
```powershell
cd d:\TruckPulse\frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### Build Production Bundle
```powershell
cd d:\TruckPulse\frontend
npm run build
```
Build output is saved to `dist/`.
