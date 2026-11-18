#pragma once
/**
 * DiagnosticEngine.h
 * Automotive diagnostic engine evaluating real-time vehicle telemetry against
 * predefined ECU diagnostic trouble thresholds.
 *
 * Rules:
 *  1. Coolant temperature > 105 °C -> ENGINE_OVERHEATING   (CRITICAL)
 *  2. Oil pressure < 15 PSI         -> LOW_OIL_PRESSURE    (CRITICAL)
 *  3. Engine RPM > 3500            -> HIGH_ENGINE_RPM     (WARNING)
 *  4. Battery voltage < 11.5 V     -> LOW_BATTERY_VOLTAGE (WARNING)
 *  5. Fuel level < 5%              -> LOW_FUEL            (WARNING)
 *
 * State Tracking & Deduplication:
 *  - Maintains active faults in an unordered_map keyed by "vehicleId:faultCode".
 *  - Prevents alert spam by only emitting a new event on fault state TRANSITIONS:
 *    (a) Newly triggered fault (Normal -> Active)
 *    (b) Fault resolution (Active -> Resolved) when reading returns to normal.
 */

#include <string>
#include <vector>
#include <unordered_map>
#include <chrono>
#include <sstream>
#include <iomanip>
#include <atomic>
#include "models/Telemetry.h"

namespace TruckPulse {

enum class DiagnosticSeverity {
    INFO,
    WARNING,
    CRITICAL
};

inline std::string severityToString(DiagnosticSeverity sev) {
    switch (sev) {
        case DiagnosticSeverity::INFO:     return "INFO";
        case DiagnosticSeverity::WARNING:  return "WARNING";
        case DiagnosticSeverity::CRITICAL: return "CRITICAL";
    }
    return "UNKNOWN";
}

struct DiagnosticEvent {
    std::string        id;             // e.g. "EVT-1001"
    std::string        vehicleId;      // e.g. "TRK-101"
    std::string        faultCode;      // e.g. "ENGINE_OVERHEATING"
    DiagnosticSeverity severity;       // INFO, WARNING, CRITICAL
    std::string        description;    // Human-readable summary
    float              observedValue;  // Value that triggered / resolved the rule
    float              threshold;      // Configured threshold
    uint64_t           timestamp;      // Epoch seconds
    bool               isResolved;     // false = active, true = cleared
    uint64_t           resolvedTimestamp; // Epoch seconds when resolved (or 0)

    std::string toJson() const {
        std::ostringstream oss;
        oss << "{"
            << "\"id\":\"" << id << "\","
            << "\"vehicleId\":\"" << vehicleId << "\","
            << "\"faultCode\":\"" << faultCode << "\","
            << "\"severity\":\"" << severityToString(severity) << "\","
            << "\"description\":\"" << description << "\","
            << std::fixed << std::setprecision(1)
            << "\"observedValue\":" << observedValue << ","
            << "\"threshold\":" << threshold << ","
            << "\"timestamp\":" << timestamp << ","
            << "\"isResolved\":" << (isResolved ? "true" : "false") << ","
            << "\"resolvedTimestamp\":" << resolvedTimestamp
            << "}";
        return oss.str();
    }
};

class DiagnosticEngine {
public:
    DiagnosticEngine() : m_eventCounter(1000) {}

    /**
     * Process one telemetry snapshot.
     * Evaluates all 5 diagnostic rules.
     * Returns a list of state-change events generated during this tick
     * (new faults triggered and existing faults resolved).
     */
    std::vector<DiagnosticEvent> processTelemetry(const Telemetry& tel) {
        std::vector<DiagnosticEvent> transitions;

        // Rule 1: Coolant Temperature > 105 °C (CRITICAL)
        checkRule(tel.vehicleId, "ENGINE_OVERHEATING", DiagnosticSeverity::CRITICAL,
                  "Coolant temperature exceeded 105 C threshold",
                  tel.coolantTempC, 105.0f,
                  tel.coolantTempC > 105.0f, tel.timestampEpoch, transitions);

        // Rule 2: Oil Pressure < 15 PSI (CRITICAL)
        checkRule(tel.vehicleId, "LOW_OIL_PRESSURE", DiagnosticSeverity::CRITICAL,
                  "Oil pressure dropped below 15 PSI threshold",
                  tel.oilPressurePSI, 15.0f,
                  tel.oilPressurePSI < 15.0f, tel.timestampEpoch, transitions);

        // Rule 3: Engine RPM > 3500 (WARNING)
        checkRule(tel.vehicleId, "HIGH_ENGINE_RPM", DiagnosticSeverity::WARNING,
                  "Engine speed exceeded 3500 RPM threshold",
                  static_cast<float>(tel.engineRPM), 3500.0f,
                  tel.engineRPM > 3500, tel.timestampEpoch, transitions);

        // Rule 4: Battery Voltage < 11.5 V (WARNING)
        checkRule(tel.vehicleId, "LOW_BATTERY_VOLTAGE", DiagnosticSeverity::WARNING,
                  "Battery voltage dropped below 11.5 V threshold",
                  tel.batteryVoltage, 11.5f,
                  tel.batteryVoltage < 11.5f, tel.timestampEpoch, transitions);

        // Rule 5: Fuel Level < 5% (WARNING)
        checkRule(tel.vehicleId, "LOW_FUEL", DiagnosticSeverity::WARNING,
                  "Fuel level dropped below 5% reserve threshold",
                  tel.fuelLevelPct, 5.0f,
                  tel.fuelLevelPct < 5.0f, tel.timestampEpoch, transitions);

        return transitions;
    }

    // Retrieve all currently active (unresolved) diagnostic events
    std::vector<DiagnosticEvent> getActiveFaults(const std::string& vehicleId = "") const {
        std::vector<DiagnosticEvent> active;
        for (const auto& pair : m_activeFaults) {
            if (vehicleId.empty() || pair.second.vehicleId == vehicleId) {
                active.push_back(pair.second);
            }
        }
        return active;
    }

    // Retrieve entire history of generated events
    const std::vector<DiagnosticEvent>& getEventHistory() const {
        return m_eventHistory;
    }

    // Check if a specific fault is currently active on a vehicle
    bool isFaultActive(const std::string& vehicleId, const std::string& faultCode) const {
        std::string key = makeKey(vehicleId, faultCode);
        return m_activeFaults.find(key) != m_activeFaults.end();
    }

    // Clear all history and active states (e.g. for testing)
    void reset() {
        m_activeFaults.clear();
        m_eventHistory.clear();
    }

private:
    std::atomic<uint64_t> m_eventCounter;
    // Map of active faults: key = "vehicleId:faultCode"
    std::unordered_map<std::string, DiagnosticEvent> m_activeFaults;
    // Sequential log of all generated events (both activations and resolutions)
    std::vector<DiagnosticEvent> m_eventHistory;

    static std::string makeKey(const std::string& vehicleId, const std::string& faultCode) {
        return vehicleId + ":" + faultCode;
    }

    std::string generateEventId() {
        return "EVT-" + std::to_string(++m_eventCounter);
    }

    void checkRule(const std::string& vehicleId,
                   const std::string& faultCode,
                   DiagnosticSeverity severity,
                   const std::string& desc,
                   float observedValue,
                   float threshold,
                   bool conditionMet,
                   uint64_t timestamp,
                   std::vector<DiagnosticEvent>& outTransitions)
    {
        std::string key = makeKey(vehicleId, faultCode);
        auto it = m_activeFaults.find(key);

        if (conditionMet) {
            // Fault condition is TRUE
            if (it == m_activeFaults.end()) {
                // New fault activation (not currently active)
                DiagnosticEvent evt;
                evt.id = generateEventId();
                evt.vehicleId = vehicleId;
                evt.faultCode = faultCode;
                evt.severity = severity;
                evt.description = desc;
                evt.observedValue = observedValue;
                evt.threshold = threshold;
                evt.timestamp = timestamp;
                evt.isResolved = false;
                evt.resolvedTimestamp = 0;

                m_activeFaults[key] = evt;
                m_eventHistory.push_back(evt);
                outTransitions.push_back(evt);
            } else {
                // Already active: update observed value in active record,
                // but do NOT emit a duplicate transition event.
                it->second.observedValue = observedValue;
                it->second.timestamp = timestamp;
            }
        } else {
            // Fault condition is FALSE
            if (it != m_activeFaults.end()) {
                // Fault has resolved!
                DiagnosticEvent resolvedEvt = it->second;
                resolvedEvt.id = generateEventId();
                resolvedEvt.severity = DiagnosticSeverity::INFO;
                resolvedEvt.description = "Resolved: " + desc;
                resolvedEvt.observedValue = observedValue;
                resolvedEvt.isResolved = true;
                resolvedEvt.resolvedTimestamp = timestamp;

                m_activeFaults.erase(it);
                m_eventHistory.push_back(resolvedEvt);
                outTransitions.push_back(resolvedEvt);
            }
        }
    }
};

} // namespace TruckPulse
