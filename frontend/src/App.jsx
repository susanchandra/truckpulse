import React, { useState } from 'react';
import { FleetProvider } from './context/FleetContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { FaultInjectionModal } from './components/layout/FaultInjectionModal';
import { OverviewPage } from './pages/OverviewPage';
import { FleetPage } from './pages/FleetPage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { TelemetryPage } from './pages/TelemetryPage';
import { SettingsPage } from './pages/SettingsPage';

function DashboardContent() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [isFaultModalOpen, setIsFaultModalOpen] = useState(false);

  // Deep-linking hash support for direct navigation and screenshot capture
  React.useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('vehicle-')) {
        setSelectedVehicleId(hash.replace('vehicle-', ''));
        setCurrentTab('vehicle-detail');
      } else if (['overview', 'fleet', 'diagnostics', 'telemetry', 'settings'].includes(hash)) {
        setCurrentTab(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectVehicle = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    setCurrentTab('vehicle-detail');
  };

  const getPageTitle = () => {
    switch (currentTab) {
      case 'overview':
        return 'Fleet Operations Overview';
      case 'fleet':
        return 'Registered Fleet Inventory';
      case 'vehicle-detail':
        return `Vehicle Diagnostic Inspector — ${selectedVehicleId || 'Asset'}`;
      case 'diagnostics':
        return 'ECU Diagnostic Events & Trouble Codes (DTC)';
      case 'telemetry':
        return 'Real-Time Binary Telemetry Streaming (CAN-Inspired)';
      case 'settings':
        return 'System Specs & Architecture';
      default:
        return 'Overview';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-graphite-950 text-slate-100">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
        }}
      />

      {/* Main Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          title={getPageTitle()}
          onOpenFaultModal={() => setIsFaultModalOpen(true)}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'overview' && (
              <OverviewPage
                onSelectVehicle={handleSelectVehicle}
                onSelectTab={setCurrentTab}
              />
            )}

            {currentTab === 'fleet' && (
              <FleetPage onSelectVehicle={handleSelectVehicle} />
            )}

            {currentTab === 'vehicle-detail' && (
              <VehicleDetailPage
                vehicleId={selectedVehicleId || 'TRK-101'}
                onBack={() => setCurrentTab('fleet')}
                onOpenFaultModal={() => setIsFaultModalOpen(true)}
              />
            )}

            {currentTab === 'diagnostics' && (
              <DiagnosticsPage onSelectVehicle={handleSelectVehicle} />
            )}

            {currentTab === 'telemetry' && (
              <TelemetryPage />
            )}

            {currentTab === 'settings' && (
              <SettingsPage />
            )}
          </div>
        </main>
      </div>

      {/* Fault Injection Modal */}
      <FaultInjectionModal
        isOpen={isFaultModalOpen}
        onClose={() => setIsFaultModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FleetProvider>
      <DashboardContent />
    </FleetProvider>
  );
}
