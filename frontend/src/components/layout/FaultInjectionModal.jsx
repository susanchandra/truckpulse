import React, { useState } from 'react';
import { X, AlertOctagon, CheckCircle2, AlertTriangle, Flame, Gauge, BatteryLow, Fuel, Zap } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';

export function FaultInjectionModal({ isOpen, onClose }) {
  const { vehicles, injectFault } = useFleet();
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]?.id || 'TRK-101');
  const [selectedFault, setSelectedFault] = useState('overheating');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isOpen) return null;

  const faultOptions = [
    {
      id: 'overheating',
      name: 'Engine Overheating',
      description: 'Coolant temp spikes to 108–130 °C (Threshold: 105 °C)',
      icon: Flame,
      severity: 'CRITICAL',
    },
    {
      id: 'low_oil_pressure',
      name: 'Low Oil Pressure',
      description: 'Oil pressure drops to 2–14 PSI (Threshold: 15 PSI)',
      icon: Gauge,
      severity: 'CRITICAL',
    },
    {
      id: 'high_rpm',
      name: 'Excessive Engine RPM',
      description: 'RPM surges to 3200–4500 RPM (Threshold: 3500 RPM)',
      icon: Zap,
      severity: 'WARNING',
    },
    {
      id: 'low_battery',
      name: 'Low Battery Voltage',
      description: 'Alternator drop to 9.5–11.4 V (Threshold: 11.5 V)',
      icon: BatteryLow,
      severity: 'WARNING',
    },
    {
      id: 'low_fuel',
      name: 'Critically Low Fuel',
      description: 'Fuel level drains to 1–7% (Threshold: 5%)',
      icon: Fuel,
      severity: 'WARNING',
    },
    {
      id: 'none',
      name: 'Clear Active Fault (Normalize)',
      description: 'Restores sensor simulation to normal healthy operating range',
      icon: CheckCircle2,
      severity: 'RESOLVE',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await injectFault(selectedVehicle, selectedFault);
      setFeedback({
        type: 'success',
        message: selectedFault === 'none' 
          ? `Fault cleared on ${selectedVehicle}. Sensors normalizing...`
          : `Fault '${selectedFault}' injected into ${selectedVehicle}. ECU rules triggered!`,
      });
      setTimeout(() => {
        setSubmitting(false);
        onClose();
        setFeedback(null);
      }, 1400);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || err.message || 'Failed to inject fault',
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-graphite-900 border border-panel-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-panel-border bg-panel-header flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Controlled Fault Injection</h2>
              <p className="text-[11px] text-slate-400 font-mono">Software-in-the-Loop (SIL) ECU Simulator Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-graphite-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Vehicle Target Selector */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-2">
              TARGET VEHICLE
            </label>
            <div className="grid grid-cols-3 gap-2">
              {vehicles.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setSelectedVehicle(v.id)}
                  className={`px-3 py-2.5 rounded border text-left transition-all ${
                    selectedVehicle === v.id
                      ? 'bg-accent-lime/10 border-accent-lime text-white'
                      : 'bg-graphite-850 border-panel-border text-slate-400 hover:bg-graphite-800 hover:text-slate-200'
                  }`}
                >
                  <div className="font-mono font-bold text-xs">{v.id}</div>
                  <div className="text-[10px] text-slate-400 truncate">{v.model}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fault Scenario Selector */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-2">
              DIAGNOSTIC FAULT SCENARIO
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {faultOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedFault === opt.id;
                const isClear = opt.id === 'none';

                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedFault(opt.id)}
                    className={`p-3 rounded border cursor-pointer flex items-start gap-3 transition-all ${
                      isSelected
                        ? isClear
                          ? 'bg-lime-500/10 border-lime-500 text-white'
                          : 'bg-red-500/10 border-red-500 text-white'
                        : 'bg-graphite-850 border-panel-border text-slate-400 hover:bg-graphite-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isSelected 
                        ? (isClear ? 'text-accent-lime' : 'text-accent-red') 
                        : 'text-slate-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">{opt.name}</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                          opt.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          opt.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-lime-500/20 text-lime-400 border-lime-500/30'
                        }`}>
                          {opt.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{opt.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div className={`p-3 rounded border text-xs font-mono flex items-center gap-2 ${
              feedback.type === 'success' 
                ? 'bg-lime-500/15 border-lime-500/30 text-lime-400'
                : 'bg-red-500/15 border-red-500/30 text-red-400'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-panel-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded text-xs font-mono text-slate-400 hover:text-white hover:bg-graphite-800 transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 rounded text-xs font-mono font-semibold transition-all ${
                selectedFault === 'none'
                  ? 'bg-accent-lime text-graphite-950 hover:bg-lime-400'
                  : 'bg-accent-red text-white hover:bg-red-600'
              } disabled:opacity-50`}
            >
              {submitting ? 'COMMUNICATING WITH C++...' : (selectedFault === 'none' ? 'NORMALIZE SENSORS' : 'TRIGGER FAULT')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
