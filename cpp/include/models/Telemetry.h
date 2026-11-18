#pragma once
/**
 * Telemetry.h
 * A single snapshot of all sensor readings for one vehicle at one point in time.
 *
 * Telemetry is a plain-data value type. It carries no business logic and
 * makes no I/O calls. Display and serialisation are handled by callers so
 * that the model layer stays clean.
 *
 * All readings use fixed-precision types:
 *   - RPM and speed are stored as uint16_t to reflect realistic ranges.
 *   - Temperatures, pressure, fuel, and voltage are float for decimals.
 *   - Timestamp is seconds since Unix epoch (uint64_t).
 */

#include <string>
#include <cstdint>
#include <chrono>
#include <stdexcept>
#include <sstream>
#include <iomanip>

namespace TruckPulse {

struct Telemetry {
    std::string  vehicleId;
    uint64_t     timestampEpoch;   // seconds since Unix epoch
    uint16_t     engineRPM;        // 0 – 65535 RPM
    float        coolantTempC;     // degrees Celsius
    float        oilPressurePSI;   // PSI
    float        speedKmh;         // KM/H
    float        fuelLevelPct;     // 0.0 – 100.0 %
    float        batteryVoltage;   // Volts

    // ── Factory ───────────────────────────────────────────────────────────────
    /**
     * Construct a Telemetry snapshot with an auto-generated UTC timestamp.
     * Throws std::invalid_argument if vehicleId is empty.
     */
    static Telemetry make(const std::string& vehicleId,
                          uint16_t rpm,
                          float coolant,
                          float oil,
                          float speed,
                          float fuel,
                          float battery)
    {
        if (vehicleId.empty())
            throw std::invalid_argument("Telemetry: vehicleId cannot be empty.");

        Telemetry t;
        t.vehicleId       = vehicleId;
        t.timestampEpoch  = static_cast<uint64_t>(
            std::chrono::duration_cast<std::chrono::seconds>(
                std::chrono::system_clock::now().time_since_epoch()).count());
        t.engineRPM       = rpm;
        t.coolantTempC    = coolant;
        t.oilPressurePSI  = oil;
        t.speedKmh        = speed;
        t.fuelLevelPct    = fuel;
        t.batteryVoltage  = battery;
        return t;
    }

    // ── Validation ────────────────────────────────────────────────────────────
    /**
     * Checks whether all readings lie within plausible physical bounds.
     * Returns false and populates 'reason' with the first violated constraint.
     *
     * These bounds are wider than individual sensor "normal" ranges because
     * telemetry can legitimately carry out-of-range fault data — the purpose
     * here is to catch nonsensical values, not healthy vs faulted status.
     */
    bool isValid(std::string& reason) const {
        if (vehicleId.empty()) {
            reason = "Vehicle ID is empty.";
            return false;
        }
        if (engineRPM > 8000) {
            reason = "Engine RPM out of physical range: " + std::to_string(engineRPM);
            return false;
        }
        if (coolantTempC < -40.0f || coolantTempC > 200.0f) {
            reason = "Coolant temperature out of physical range.";
            return false;
        }
        if (oilPressurePSI < 0.0f || oilPressurePSI > 150.0f) {
            reason = "Oil pressure out of physical range.";
            return false;
        }
        if (speedKmh < 0.0f || speedKmh > 300.0f) {
            reason = "Speed out of physical range.";
            return false;
        }
        if (fuelLevelPct < 0.0f || fuelLevelPct > 100.0f) {
            reason = "Fuel level out of physical range.";
            return false;
        }
        if (batteryVoltage < 0.0f || batteryVoltage > 30.0f) {
            reason = "Battery voltage out of physical range.";
            return false;
        }
        return true;
    }

    bool isValid() const {
        std::string unused;
        return isValid(unused);
    }

    // ── Display ───────────────────────────────────────────────────────────────
    /**
     * Returns a formatted, human-readable multi-line string.
     * Does NOT write to any stream so the caller controls output.
     */
    std::string toString() const {
        std::ostringstream oss;
        oss << "Vehicle     : " << vehicleId << "\n"
            << "Timestamp   : " << timestampEpoch << " (epoch s)\n"
            << std::fixed << std::setprecision(1)
            << "Engine RPM  : " << engineRPM   << " RPM\n"
            << "Coolant     : " << coolantTempC << " C\n"
            << "Oil Pressure: " << oilPressurePSI << " PSI\n"
            << "Speed       : " << speedKmh    << " KM/H\n"
            << "Fuel Level  : " << fuelLevelPct << " %\n"
            << "Battery     : " << batteryVoltage << " V";
        return oss.str();
    }

    std::string toJson() const {
        std::ostringstream oss;
        oss << "{"
            << "\"vehicleId\":\"" << vehicleId << "\","
            << "\"timestamp\":" << timestampEpoch << ","
            << "\"engineRPM\":" << engineRPM << ","
            << std::fixed << std::setprecision(1)
            << "\"coolantTempC\":" << coolantTempC << ","
            << "\"oilPressurePSI\":" << oilPressurePSI << ","
            << "\"speedKmh\":" << speedKmh << ","
            << "\"fuelLevelPct\":" << fuelLevelPct << ","
            << "\"batteryVoltage\":" << batteryVoltage
            << "}";
        return oss.str();
    }
};

} // namespace TruckPulse
