import React from 'react';
import { useFleet } from '../context/FleetContext';
import { KpiCard } from '../components/dashboard/KpiCard';
import { FleetHealthDistribution } from '../components/dashboard/FleetHealthDistribution';
import { FleetStatusTable } from '../components/dashboard/FleetStatusTable';
import { TelemetryTrendsChart } from '../components/dashboard/TelemetryTrendsChart';
import { RecentAlertsPanel } from '../components/dashboard/RecentAlertsPanel';
import { computeVehicleHealth } from '../utils/formatters';
import { Truck, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export function OverviewPage({ onSelectVehicle, onSelectTab }) {
  const { 
    vehicles, 
    latestTelemetry, 
    telemetryHistory, 
    activeFaults, 
    diagnosticsHistory, 
    loading 
  } = useFleet();

  // Compute KPI values from real backend data
  const totalVehicles = vehicles.length;
  let healthyCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  vehicles.forEach((v) => {
    const health = computeVehicleHealth(v.id, activeFaults);
    if (health === 'CRITICAL') criticalCount++;
    else if (health === 'WARNING') warningCount++;
    else healthyCount++;
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Fleet Assets"
          value={totalVehicles}
          subtitle="Monitored heavy vehicles"
          icon={Truck}
          color="cyan"
        />
        <KpiCard
          title="Healthy Assets"
          value={healthyCount}
          subtitle="All ECU thresholds normal"
          icon={ShieldCheck}
          color="lime"
        />
        <KpiCard
          title="Warning Condition"
          value={warningCount}
          subtitle="Non-critical parameters elevated"
          icon={AlertTriangle}
          color="amber"
        />
        <KpiCard
          title="Critical Faults"
          value={criticalCount}
          subtitle="Immediate maintenance required"
          icon={AlertOctagon}
          color="red"
        />
      </div>

      {/* Grid: Health Distribution & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <FleetHealthDistribution
            total={totalVehicles}
            healthy={healthyCount}
            warning={warningCount}
            critical={criticalCount}
          />
        </div>
        <div className="lg:col-span-2">
          <RecentAlertsPanel
            activeFaults={activeFaults}
            diagnosticsHistory={diagnosticsHistory}
            onSelectTab={onSelectTab}
          />
        </div>
      </div>

      {/* Real-time Telemetry Trends */}
      <div>
        <TelemetryTrendsChart
          telemetryHistory={telemetryHistory}
          vehicles={vehicles}
        />
      </div>

      {/* Fleet Status Matrix Table */}
      <div>
        <FleetStatusTable
          vehicles={vehicles}
          latestTelemetry={latestTelemetry}
          activeFaults={activeFaults}
          onSelectVehicle={onSelectVehicle}
        />
      </div>
    </div>
  );
}
