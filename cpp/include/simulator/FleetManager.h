#pragma once
/**
 * FleetManager.h
 * Manages a collection of trucks and their simulators.
 *
 * Data structure rationale:
 *   std::unordered_map<string, unique_ptr<Vehicle>> gives O(1) average-case
 *   lookup by vehicle ID, which is exactly what dispatch, telemetry routing,
 *   and fault reporting need.  A std::map would give O(log n) lookup but
 *   ordered iteration — we prefer speed here and have no ordering requirement.
 *
 * The FleetManager also owns the VehicleSimulator for each registered truck
 * in a parallel unordered_map keyed by the same vehicle ID.
 *
 * Thread-safety note: a mutex is included (when available) so that Phase 2
 * can safely call generateAllTelemetry() from multiple threads.
 * Phase 1 uses a single thread; on win32-thread MinGW builds where
 * std::mutex is unavailable, the guards are compiled out safely.
 */

#include <unordered_map>
#include <memory>
#include <string>
#include <vector>
#include <stdexcept>
#include "models/Vehicle.h"
#include "simulator/VehicleSimulator.h"
#include "utils/Logger.h"

// Mutex availability guard (same as Logger.h)
#if defined(_GLIBCXX_HAS_GTHREADS) || (!defined(__MINGW32__) && !defined(__MINGW64__))
    #include <mutex>
    #define TP_HAS_MUTEX 1
#else
    #define TP_HAS_MUTEX 0
#endif

namespace TruckPulse {

class FleetManager {
public:
    explicit FleetManager(Logger& logger) : m_logger(logger) {}

    // Non-copyable: manages unique ownership of vehicles
    FleetManager(const FleetManager&)            = delete;
    FleetManager& operator=(const FleetManager&) = delete;

    // ── Vehicle registration ──────────────────────────────────────────────────
    /**
     * Transfer ownership of a vehicle into the fleet.
     * Throws if the vehicle ID is already registered.
     *
     * @param vehicle  Fully-constructed vehicle (sensors already attached).
     * @param rngSeed  RNG seed forwarded to this vehicle's simulator.
     */
    void registerVehicle(std::unique_ptr<Vehicle> vehicle, uint32_t rngSeed = 42) {
        if (!vehicle)
            throw std::invalid_argument("Cannot register a null vehicle.");

#if TP_HAS_MUTEX
        std::lock_guard<std::mutex> lock(m_mutex);
#endif

        const std::string& id = vehicle->vehicleId();
        if (m_vehicles.count(id) > 0)
            throw std::invalid_argument(
                "Vehicle '" + id + "' is already registered in the fleet.");

        // Create simulator before moving the vehicle into the map
        auto sim = std::make_unique<VehicleSimulator>(*vehicle, m_logger, rngSeed);
        m_simulators.emplace(id, std::move(sim));
        m_vehicles.emplace(id, std::move(vehicle));

        m_logger.info("Fleet: registered vehicle " + id);
    }

    /**
     * Remove a vehicle and its simulator from the fleet.
     * No-op if the vehicle is not found (logs a warning).
     */
    void removeVehicle(const std::string& vehicleId) {
#if TP_HAS_MUTEX
        std::lock_guard<std::mutex> lock(m_mutex);
#endif
        auto it = m_vehicles.find(vehicleId);
        if (it == m_vehicles.end()) {
            m_logger.warning("Fleet: remove requested for unknown vehicle " + vehicleId);
            return;
        }
        m_vehicles.erase(it);
        m_simulators.erase(vehicleId);
        m_logger.info("Fleet: removed vehicle " + vehicleId);
    }

    // ── Lookup ────────────────────────────────────────────────────────────────
    /**
     * Returns a raw pointer to the vehicle, or nullptr if not found.
     * Caller must not store this pointer past the fleet's lifetime.
     */
    const Vehicle* findVehicle(const std::string& vehicleId) const {
        auto it = m_vehicles.find(vehicleId);
        return it != m_vehicles.end() ? it->second.get() : nullptr;
    }

    /**
     * Returns the simulator for a given vehicle ID, or nullptr if not found.
     */
    VehicleSimulator* findSimulator(const std::string& vehicleId) {
        auto it = m_simulators.find(vehicleId);
        return it != m_simulators.end() ? it->second.get() : nullptr;
    }

    /**
     * Set active fault scenario for a specific vehicle.
     * Returns true if vehicle found and fault set, false otherwise.
     */
    bool setVehicleFault(const std::string& vehicleId, FaultScenario fault) {
#if TP_HAS_MUTEX
        std::lock_guard<std::mutex> lock(m_mutex);
#endif
        auto it = m_simulators.find(vehicleId);
        if (it != m_simulators.end()) {
            it->second->setActiveFault(fault);
            return true;
        }
        return false;
    }

    // ── Telemetry generation ──────────────────────────────────────────────────
    /**
     * Generate one Telemetry snapshot for every registered vehicle.
     * If faultOverride is provided (not NONE), it forces that fault onto all vehicles.
     * Otherwise each vehicle uses its own currently configured active fault.
     */
    std::vector<Telemetry> generateAllTelemetry(
        FaultScenario faultOverride = FaultScenario::NONE)
    {
#if TP_HAS_MUTEX
        std::lock_guard<std::mutex> lock(m_mutex);
#endif
        std::vector<Telemetry> results;
        results.reserve(m_simulators.size());

        for (auto it = m_simulators.begin(); it != m_simulators.end(); ++it) {
            if (faultOverride != FaultScenario::NONE)
                results.push_back(it->second->generateTelemetry(faultOverride));
            else
                results.push_back(it->second->generateTelemetry());
        }

        return results;
    }

    /**
     * Generate one encoded binary frame per vehicle.
     */
    std::vector<std::vector<uint8_t>> generateAllFrames(
        FaultScenario fault = FaultScenario::NONE)
    {
#if TP_HAS_MUTEX
        std::lock_guard<std::mutex> lock(m_mutex);
#endif
        std::vector<std::vector<uint8_t>> frames;
        frames.reserve(m_simulators.size());

        for (auto it = m_simulators.begin(); it != m_simulators.end(); ++it)
            frames.push_back(it->second->generateFrame(fault));

        return frames;
    }

    // ── Accessors ─────────────────────────────────────────────────────────────
    std::size_t vehicleCount() const {
#if TP_HAS_MUTEX
        std::lock_guard<std::mutex> lock(m_mutex);
#endif
        return m_vehicles.size();
    }

    /**
     * Returns all registered vehicle IDs in an unspecified order.
     */
    std::vector<std::string> vehicleIds() const {
#if TP_HAS_MUTEX
        std::lock_guard<std::mutex> lock(m_mutex);
#endif
        std::vector<std::string> ids;
        ids.reserve(m_vehicles.size());
        for (auto it = m_vehicles.begin(); it != m_vehicles.end(); ++it)
            ids.push_back(it->first);
        return ids;
    }

private:
#if TP_HAS_MUTEX
    mutable std::mutex m_mutex; // guards both maps for thread-safe Phase 2 use
#endif

    // Both maps are keyed by vehicleId.  We keep simulators separate so that
    // Vehicle remains a pure data/model object without simulator concerns.
    std::unordered_map<std::string, std::unique_ptr<Vehicle>>         m_vehicles;
    std::unordered_map<std::string, std::unique_ptr<VehicleSimulator>> m_simulators;

    Logger& m_logger;
};

} // namespace TruckPulse
