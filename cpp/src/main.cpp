/**
 * main.cpp
 * TruckPulse — Vehicle Telemetry Simulation & Diagnostics Engine
 *
 * Modes of operation:
 *  1. Default (no args):
 *     Demonstrates Phase 1 telemetry pipeline (encoding, decoding, corruption detection)
 *     and Phase 2 diagnostics evaluation (rules, transitions, fault resolution).
 *  2. --interactive:
 *     Reads newline commands from stdin (TICK, FAULT <vid> <type>, CLEAR <vid>, FLEET, QUIT)
 *     and emits single-line JSON responses to stdout. Used by the Python backend.
 *  3. --stream [interval_ms]:
 *     Periodically emits newline-delimited JSON ticks to stdout.
 */

#include <iostream>
#include <iomanip>
#include <string>
#include <vector>
#include <memory>
#include <sstream>
#include <chrono>

#ifdef _WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
static void sleepMs(int ms) { Sleep(static_cast<DWORD>(ms)); }
#else
#include <thread>
static void sleepMs(int ms) { std::this_thread::sleep_for(std::chrono::milliseconds(ms)); }
#endif

#include "models/Vehicle.h"
#include "models/Sensor.h"
#include "models/Telemetry.h"
#include "simulator/VehicleSimulator.h"
#include "simulator/FleetManager.h"
#include "protocol/TelemetryFrame.h"
#include "protocol/FrameEncoder.h"
#include "protocol/FrameDecoder.h"
#include "diagnostics/DiagnosticEngine.h"
#include "utils/Logger.h"

using namespace TruckPulse;

// ── Helper: attach the standard six sensors to a vehicle ─────────────────────
static void attachStandardSensors(Vehicle& v) {
    const std::string& id = v.vehicleId();
    v.addSensor(std::make_unique<EngineRPMSensor>(id));
    v.addSensor(std::make_unique<CoolantTemperatureSensor>(id));
    v.addSensor(std::make_unique<OilPressureSensor>(id));
    v.addSensor(std::make_unique<VehicleSpeedSensor>(id));
    v.addSensor(std::make_unique<FuelLevelSensor>(id));
    v.addSensor(std::make_unique<BatteryVoltageSensor>(id));
}

struct TruckSpec {
    std::string id;
    std::string fleetTag;
    std::string model;
    uint32_t    seed;
};

static const std::vector<TruckSpec> kStandardSpecs = {
    { "TRK-101", "DTICI-FLEET-A", "Mercedes Actros 2645", 101 },
    { "TRK-102", "DTICI-FLEET-A", "Mercedes Actros 2548", 102 },
    { "TRK-103", "DTICI-FLEET-B", "Freightliner Cascadia", 103 },
};

static void initFleet(FleetManager& fleet) {
    for (const auto& sp : kStandardSpecs) {
        auto truck = std::make_unique<Vehicle>(sp.id, sp.fleetTag, sp.model);
        attachStandardSensors(*truck);
        fleet.registerVehicle(std::move(truck), sp.seed);
    }
}

static FaultScenario parseFaultType(const std::string& type) {
    if (type == "overheating" || type == "ENGINE_OVERHEAT")
        return FaultScenario::ENGINE_OVERHEAT;
    if (type == "low_oil_pressure" || type == "LOW_OIL_PRESSURE")
        return FaultScenario::LOW_OIL_PRESSURE;
    if (type == "high_rpm" || type == "EXCESSIVE_RPM")
        return FaultScenario::EXCESSIVE_RPM;
    if (type == "low_battery" || type == "LOW_BATTERY_VOLTAGE")
        return FaultScenario::LOW_BATTERY_VOLTAGE;
    if (type == "low_fuel" || type == "LOW_FUEL")
        return FaultScenario::LOW_FUEL;
    return FaultScenario::NONE;
}

// ── JSON formatting for interactive / stream ticks ───────────────────────────
static std::string generateTickJson(FleetManager& fleet, DiagnosticEngine& diagEngine) {
    std::vector<Telemetry> telemetryList = fleet.generateAllTelemetry();
    std::vector<DiagnosticEvent> tickEvents;

    std::ostringstream telArray;
    telArray << "[";
    bool firstTel = true;

    for (const auto& tel : telemetryList) {
        // Run full binary encode/decode round trip to verify frame validity
        auto frame = FrameEncoder::encode(tel);
        auto decodeRes = FrameDecoder::decode(frame);

        // Run diagnostics
        auto events = diagEngine.processTelemetry(tel);
        tickEvents.insert(tickEvents.end(), events.begin(), events.end());

        const Vehicle* v = fleet.findVehicle(tel.vehicleId);
        std::string engStatus = v ? engineStatusToString(v->engineStatus()) : "RUNNING";

        if (!firstTel) telArray << ",";
        firstTel = false;

        telArray << "{"
                 << "\"vehicleId\":\"" << tel.vehicleId << "\","
                 << "\"timestamp\":" << tel.timestampEpoch << ","
                 << "\"engineRPM\":" << tel.engineRPM << ","
                 << std::fixed << std::setprecision(1)
                 << "\"coolantTempC\":" << tel.coolantTempC << ","
                 << "\"oilPressurePSI\":" << tel.oilPressurePSI << ","
                 << "\"speedKmh\":" << tel.speedKmh << ","
                 << "\"fuelLevelPct\":" << tel.fuelLevelPct << ","
                 << "\"batteryVoltage\":" << tel.batteryVoltage << ","
                 << "\"engineStatus\":\"" << engStatus << "\","
                 << "\"frameValid\":" << (decodeRes.ok ? "true" : "false") << ","
                 << "\"frameSize\":" << frame.size()
                 << "}";
    }
    telArray << "]";

    // Transition events
    std::ostringstream evArray;
    evArray << "[";
    for (size_t i = 0; i < tickEvents.size(); ++i) {
        if (i > 0) evArray << ",";
        evArray << tickEvents[i].toJson();
    }
    evArray << "]";

    // Currently active faults
    auto activeFaults = diagEngine.getActiveFaults();
    std::ostringstream actArray;
    actArray << "[";
    for (size_t i = 0; i < activeFaults.size(); ++i) {
        if (i > 0) actArray << ",";
        actArray << activeFaults[i].toJson();
    }
    actArray << "]";

    std::ostringstream out;
    out << "{"
        << "\"type\":\"telemetry_tick\","
        << "\"timestamp\":" << std::chrono::duration_cast<std::chrono::seconds>(
               std::chrono::system_clock::now().time_since_epoch()).count() << ","
        << "\"telemetry\":" << telArray.str() << ","
        << "\"newEvents\":" << evArray.str() << ","
        << "\"activeFaults\":" << actArray.str()
        << "}";
    return out.str();
}

// ── Interactive mode (stdin / stdout for Python backend) ─────────────────────
static void runInteractive() {
    // Null logger to keep stdout clean for JSON parsing
    std::ostringstream sink;
    Logger nullLg(sink);
    FleetManager fleet(nullLg);
    DiagnosticEngine diagEngine;
    initFleet(fleet);

    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;

        std::istringstream iss(line);
        std::string cmd;
        iss >> cmd;

        if (cmd == "TICK") {
            std::cout << generateTickJson(fleet, diagEngine) << std::endl;
        }
        else if (cmd == "FAULT") {
            std::string vid, ftype;
            iss >> vid >> ftype;
            FaultScenario sc = parseFaultType(ftype);
            bool ok = fleet.setVehicleFault(vid, sc);
            if (ok) {
                std::cout << "{\"status\":\"ok\",\"action\":\"fault_injected\",\"vehicleId\":\""
                          << vid << "\",\"fault\":\"" << ftype << "\"}" << std::endl;
            } else {
                std::cout << "{\"status\":\"error\",\"message\":\"Vehicle not found: " << vid << "\"}" << std::endl;
            }
        }
        else if (cmd == "CLEAR") {
            std::string vid;
            iss >> vid;
            bool ok = fleet.setVehicleFault(vid, FaultScenario::NONE);
            if (ok) {
                std::cout << "{\"status\":\"ok\",\"action\":\"fault_cleared\",\"vehicleId\":\""
                          << vid << "\"}" << std::endl;
            } else {
                std::cout << "{\"status\":\"error\",\"message\":\"Vehicle not found: " << vid << "\"}" << std::endl;
            }
        }
        else if (cmd == "FLEET") {
            std::ostringstream oss;
            oss << "{\"status\":\"ok\",\"vehicles\":[";
            for (size_t i = 0; i < kStandardSpecs.size(); ++i) {
                if (i > 0) oss << ",";
                oss << "{\"id\":\"" << kStandardSpecs[i].id << "\","
                    << "\"fleetTag\":\"" << kStandardSpecs[i].fleetTag << "\","
                    << "\"model\":\"" << kStandardSpecs[i].model << "\"}";
            }
            oss << "]}";
            std::cout << oss.str() << std::endl;
        }
        else if (cmd == "DIAGNOSTICS") {
            auto active = diagEngine.getActiveFaults();
            std::ostringstream oss;
            oss << "{\"status\":\"ok\",\"activeCount\":" << active.size() << ",\"active\":[";
            for (size_t i = 0; i < active.size(); ++i) {
                if (i > 0) oss << ",";
                oss << active[i].toJson();
            }
            oss << "]}";
            std::cout << oss.str() << std::endl;
        }
        else if (cmd == "QUIT" || cmd == "EXIT") {
            std::cout << "{\"status\":\"ok\",\"message\":\"bye\"}" << std::endl;
            break;
        }
        else {
            std::cout << "{\"status\":\"error\",\"message\":\"Unknown command: " << cmd << "\"}" << std::endl;
        }
    }
}

// ── Stream mode ──────────────────────────────────────────────────────────────
static void runStream(int intervalMs) {
    std::ostringstream sink;
    Logger nullLg(sink);
    FleetManager fleet(nullLg);
    DiagnosticEngine diagEngine;
    initFleet(fleet);

    while (true) {
        std::cout << generateTickJson(fleet, diagEngine) << std::endl;
        sleepMs(intervalMs);
    }
}

// ── Default demo mode (Phase 1 + Phase 2 CLI presentation) ────────────────────
static void runDemo() {
    Logger logger;
    std::cout << "\n"
              << "====================================\n"
              << "          TRUCKPULSE\n"
              << "   VEHICLE TELEMETRY SYSTEM\n"
              << "   Phase 1 + 2 — C++17 Core\n"
              << "====================================\n\n";

    FleetManager fleet(logger);
    initFleet(fleet);
    DiagnosticEngine diagEngine;

    std::cout << "Fleet initialised: " << fleet.vehicleCount() << " vehicles\n\n";

    std::cout << "=== Normal Telemetry & Diagnostics Cycle ===\n\n";
    auto telList = fleet.generateAllTelemetry(FaultScenario::NONE);
    for (const auto& tel : telList) {
        std::cout << "------------------------------------\n";
        std::cout << "Vehicle : " << tel.vehicleId << "\n";
        std::cout << "  Engine RPM  : " << tel.engineRPM << " RPM\n"
                  << "  Coolant     : " << std::fixed << std::setprecision(1) << tel.coolantTempC << " C\n"
                  << "  Oil Pressure: " << tel.oilPressurePSI << " PSI\n"
                  << "  Speed       : " << tel.speedKmh << " KM/H\n"
                  << "  Fuel Level  : " << tel.fuelLevelPct << " %\n"
                  << "  Battery     : " << tel.batteryVoltage << " V\n";

        auto frame = FrameEncoder::encode(tel);
        auto res = FrameDecoder::decode(frame);
        std::cout << "  Frame encoded  : " << frame.size() << " bytes (valid: " << (res.ok ? "true" : "false") << ")\n";

        auto events = diagEngine.processTelemetry(tel);
        std::cout << "  Diagnostic events triggered: " << events.size() << "\n";
    }

    std::cout << "\n=== Controlled Fault Injection & Diagnostics Evaluation ===\n\n";
    // Inject Engine Overheat on TRK-101
    fleet.setVehicleFault("TRK-101", FaultScenario::ENGINE_OVERHEAT);
    auto faultTelList = fleet.generateAllTelemetry();
    for (const auto& tel : faultTelList) {
        if (tel.vehicleId == "TRK-101") {
            std::cout << "  [FAULT INJECTED] TRK-101: Overheating\n";
            std::cout << "  Coolant temp: " << tel.coolantTempC << " C\n";
            auto events = diagEngine.processTelemetry(tel);
            std::cout << "  Diagnostics detected: " << events.size() << " new fault(s)\n";
            for (const auto& ev : events) {
                std::cout << "    -> Code: " << ev.faultCode << " | Severity: " << severityToString(ev.severity)
                          << " | Observed: " << ev.observedValue << " (Threshold: " << ev.threshold << ")\n";
            }
        }
    }

    // Now clear the fault on TRK-101 and verify diagnostic resolution
    std::cout << "\n=== Fault Resolution Cycle ===\n\n";
    fleet.setVehicleFault("TRK-101", FaultScenario::NONE);
    auto normalTelList = fleet.generateAllTelemetry();
    for (const auto& tel : normalTelList) {
        if (tel.vehicleId == "TRK-101") {
            std::cout << "  [FAULT CLEARED] TRK-101: Normal operation restored\n";
            std::cout << "  Coolant temp: " << tel.coolantTempC << " C\n";
            auto events = diagEngine.processTelemetry(tel);
            std::cout << "  Diagnostics transitions: " << events.size() << "\n";
            for (const auto& ev : events) {
                std::cout << "    -> Event: " << ev.description << " | Resolved: " << (ev.isResolved ? "YES" : "NO") << "\n";
            }
        }
    }

    std::cout << "\n====================================\n"
              << "Active faults remaining across fleet: " << diagEngine.getActiveFaults().size() << "\n"
              << "Total events logged in history: " << diagEngine.getEventHistory().size() << "\n"
              << "====================================\n\n";
}

int main(int argc, char* argv[]) {
    if (argc > 1) {
        std::string arg = argv[1];
        if (arg == "--interactive") {
            runInteractive();
            return 0;
        }
        if (arg == "--stream") {
            int interval = 1000;
            if (argc > 2) {
                try { interval = std::stoi(argv[2]); } catch (...) {}
            }
            runStream(interval);
            return 0;
        }
    }

    runDemo();
    return 0;
}
