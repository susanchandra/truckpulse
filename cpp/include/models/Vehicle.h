#pragma once
/**
 * Vehicle.h
 * Represents a single truck in the fleet.
 *
 * A Vehicle owns its sensors through unique_ptr<Sensor> stored in a vector.
 * This keeps ownership unambiguous (RAII) and allows polymorphic dispatch
 * to whichever concrete sensor is attached.
 *
 * The Vehicle class deliberately contains no diagnostic logic.  Its
 * responsibility is data: identity, status, and sensor collection.
 */

#include <string>
#include <vector>
#include <memory>
#include <stdexcept>
#include <algorithm>
#include "models/Sensor.h"

namespace TruckPulse {

// ── Engine operational status ────────────────────────────────────────────────
enum class EngineStatus {
    OFF,
    IDLE,
    RUNNING,
    WARNING,
    CRITICAL
};

// Helper to convert status to a human-readable string
inline std::string engineStatusToString(EngineStatus s) {
    switch (s) {
        case EngineStatus::OFF:      return "OFF";
        case EngineStatus::IDLE:     return "IDLE";
        case EngineStatus::RUNNING:  return "RUNNING";
        case EngineStatus::WARNING:  return "WARNING";
        case EngineStatus::CRITICAL: return "CRITICAL";
    }
    return "UNKNOWN";
}

// ── Vehicle class ─────────────────────────────────────────────────────────────
class Vehicle {
public:
    /**
     * @param vehicleId   Short unique identifier, e.g. "TRK-101".
     * @param fleetTag    Fleet or registration label, e.g. "DTICI-FLEET-A".
     * @param model       Commercial model name, e.g. "Actros 2645".
     */
    Vehicle(std::string vehicleId,
            std::string fleetTag,
            std::string model)
        : m_vehicleId(std::move(vehicleId))
        , m_fleetTag(std::move(fleetTag))
        , m_model(std::move(model))
        , m_engineStatus(EngineStatus::OFF)
    {
        if (m_vehicleId.empty())
            throw std::invalid_argument("Vehicle ID cannot be empty.");
        if (m_fleetTag.empty())
            throw std::invalid_argument("Fleet tag cannot be empty.");
    }

    // Non-copyable: each Vehicle is a unique physical entity
    Vehicle(const Vehicle&)            = delete;
    Vehicle& operator=(const Vehicle&) = delete;

    // Movable so it can be stored in containers before C++17 NRVO kicks in
    Vehicle(Vehicle&&)            = default;
    Vehicle& operator=(Vehicle&&) = default;

    // ── Accessors ────────────────────────────────────────────────────────────
    const std::string& vehicleId()  const { return m_vehicleId; }
    const std::string& fleetTag()   const { return m_fleetTag; }
    const std::string& model()      const { return m_model; }
    EngineStatus       engineStatus() const { return m_engineStatus; }

    void setEngineStatus(EngineStatus status) { m_engineStatus = status; }

    // ── Sensor management ────────────────────────────────────────────────────
    /**
     * Attach a sensor to this vehicle.  The vehicle takes ownership.
     * Duplicate sensor IDs within the same vehicle are rejected.
     */
    void addSensor(std::unique_ptr<Sensor> sensor) {
        if (!sensor)
            throw std::invalid_argument("Cannot attach a null sensor.");

        // Prevent duplicate sensor IDs on the same vehicle
        for (const auto& s : m_sensors) {
            if (s->id() == sensor->id())
                throw std::invalid_argument(
                    "Sensor '" + sensor->id() + "' is already attached to vehicle "
                    + m_vehicleId + ".");
        }
        m_sensors.push_back(std::move(sensor));
    }

    // Returns a read-only view of attached sensors
    const std::vector<std::unique_ptr<Sensor>>& sensors() const {
        return m_sensors;
    }

    std::size_t sensorCount() const { return m_sensors.size(); }

    /**
     * Looks up a sensor by its ID.
     * @return Pointer to the sensor, or nullptr if not found.
     */
    const Sensor* findSensor(const std::string& sensorId) const {
        for (const auto& s : m_sensors) {
            if (s->id() == sensorId)
                return s.get();
        }
        return nullptr;
    }

private:
    std::string  m_vehicleId;
    std::string  m_fleetTag;
    std::string  m_model;
    EngineStatus m_engineStatus;

    // Sensors are owned exclusively by the vehicle
    std::vector<std::unique_ptr<Sensor>> m_sensors;
};

} // namespace TruckPulse
