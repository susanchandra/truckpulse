#pragma once
/**
 * VehicleSimulator.h
 * Drives one vehicle's sensors and produces telemetry frames.
 *
 * The simulator owns a std::mt19937 engine so that:
 *  (a) Readings vary realistically between simulation ticks.
 *  (b) When a fixed seed is provided the entire sequence is reproducible —
 *      useful for unit testing and regression comparisons.
 *
 * Fault injection is explicit: the caller asks for a specific fault scenario
 * by name rather than the simulator randomly faulting on its own.
 */

#include <memory>
#include <random>
#include <stdexcept>
#include <string>
#include "models/Vehicle.h"
#include "models/Telemetry.h"
#include "protocol/TelemetryFrame.h"
#include "protocol/FrameEncoder.h"
#include "utils/Logger.h"

namespace TruckPulse {

// ── Fault scenarios ───────────────────────────────────────────────────────────
enum class FaultScenario {
    NONE,
    ENGINE_OVERHEAT,     // CoolantTemperatureSensor fault
    LOW_OIL_PRESSURE,    // OilPressureSensor fault
    EXCESSIVE_RPM,       // EngineRPMSensor fault
    LOW_BATTERY_VOLTAGE, // BatteryVoltageSensor fault
    LOW_FUEL             // FuelLevelSensor fault
};

class VehicleSimulator {
public:
    /**
     * @param vehicle Reference to the vehicle this simulator drives.
     *                The vehicle must outlive the simulator.
     * @param logger  Reference to a logger.
     * @param seed    RNG seed. Use a fixed value for reproducible tests.
     */
    VehicleSimulator(Vehicle& vehicle, Logger& logger, uint32_t seed = 42)
        : m_vehicle(vehicle)
        , m_logger(logger)
        , m_rng(seed)
    {}

    // Non-copyable (holds a reference to its vehicle)
    VehicleSimulator(const VehicleSimulator&)            = delete;
    VehicleSimulator& operator=(const VehicleSimulator&) = delete;

    const Vehicle& vehicle() const { return m_vehicle; }

    void setActiveFault(FaultScenario f) { m_activeFault = f; }
    FaultScenario activeFault() const { return m_activeFault; }

    /**
     * Generate one telemetry snapshot from the vehicle's current sensor values.
     * If fault is NONE, uses the vehicle's currently configured m_activeFault.
     * Otherwise overrides with the specified fault.
     *
     * @param fault Fault scenario to inject. NONE = use active fault.
     * @return A fully-populated Telemetry value.
     */
    Telemetry generateTelemetry(FaultScenario fault = FaultScenario::NONE) {
        FaultScenario effFault = (fault != FaultScenario::NONE) ? fault : m_activeFault;

        // Drive each sensor — pass injectFault=true to the relevant sensor
        for (const auto& sensorPtr : m_vehicle.sensors()) {
            Sensor& s = *sensorPtr;
            const std::string& sid = s.id();

            bool injectFault = false;
            if (effFault == FaultScenario::ENGINE_OVERHEAT
                    && sid.find("_COOLANT") != std::string::npos)
                injectFault = true;
            else if (effFault == FaultScenario::LOW_OIL_PRESSURE
                    && sid.find("_OIL") != std::string::npos)
                injectFault = true;
            else if (effFault == FaultScenario::EXCESSIVE_RPM
                    && sid.find("_RPM") != std::string::npos)
                injectFault = true;
            else if (effFault == FaultScenario::LOW_BATTERY_VOLTAGE
                    && sid.find("_BATTERY") != std::string::npos)
                injectFault = true;
            else if (effFault == FaultScenario::LOW_FUEL
                    && sid.find("_FUEL") != std::string::npos)
                injectFault = true;

            s.generateReading(m_rng, injectFault);
        }

        // Update engine status based on fault
        if (effFault == FaultScenario::NONE)
            m_vehicle.setEngineStatus(EngineStatus::RUNNING);
        else if (effFault == FaultScenario::ENGINE_OVERHEAT ||
                 effFault == FaultScenario::LOW_OIL_PRESSURE)
            m_vehicle.setEngineStatus(EngineStatus::CRITICAL);
        else
            m_vehicle.setEngineStatus(EngineStatus::WARNING);

        // Build Telemetry from sensor readings
        return buildTelemetry();
    }

    /**
     * Generate a complete encoded binary frame for this vehicle.
     * Convenience wrapper around generateTelemetry() + FrameEncoder::encode().
     */
    std::vector<uint8_t> generateFrame(FaultScenario fault = FaultScenario::NONE) {
        Telemetry tel = generateTelemetry(fault);
        return FrameEncoder::encode(tel);
    }

private:
    Vehicle& m_vehicle;
    Logger&  m_logger;
    std::mt19937 m_rng;
    FaultScenario m_activeFault = FaultScenario::NONE;

    /**
     * Walk the vehicle's sensor list and extract each reading by type.
     * We locate sensors by ID suffix rather than by index so that the
     * sensor attachment order does not matter.
     */
    Telemetry buildTelemetry() const {
        uint16_t rpm     = 0;
        float coolant    = 0.0f;
        float oil        = 0.0f;
        float speed      = 0.0f;
        float fuel       = 0.0f;
        float battery    = 0.0f;

        for (const auto& sPtr : m_vehicle.sensors()) {
            const std::string& id = sPtr->id();
            double val = sPtr->currentReading();

            if      (id.find("_RPM")     != std::string::npos)
                rpm     = static_cast<uint16_t>(val);
            else if (id.find("_COOLANT") != std::string::npos)
                coolant = static_cast<float>(val);
            else if (id.find("_OIL")     != std::string::npos)
                oil     = static_cast<float>(val);
            else if (id.find("_SPEED")   != std::string::npos)
                speed   = static_cast<float>(val);
            else if (id.find("_FUEL")    != std::string::npos)
                fuel    = static_cast<float>(val);
            else if (id.find("_BATTERY") != std::string::npos)
                battery = static_cast<float>(val);
        }

        return Telemetry::make(m_vehicle.vehicleId(),
                               rpm, coolant, oil, speed, fuel, battery);
    }
};

} // namespace TruckPulse
