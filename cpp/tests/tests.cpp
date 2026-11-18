/**
 * TruckPulse Phase 1 — Self-contained test suite
 *
 * This file implements a lightweight test framework (~50 lines) and 15
 * test cases covering all required behaviours.  It does NOT depend on
 * GoogleTest so it compiles with any C++17-capable compiler using only
 * the standard library.
 *
 * Framework:
 *   ASSERT_TRUE(expr)          — passes if expr is true
 *   ASSERT_EQ(a, b)            — passes if a == b
 *   ASSERT_NE(a, b)            — passes if a != b
 *   ASSERT_THROWS(expr, type)  — passes if expr throws type
 *
 * Each TEST(name) block is registered automatically and run by main().
 */

#include <iostream>
#include <string>
#include <vector>
#include <functional>
#include <stdexcept>
#include <cstdint>
#include <cstring>
#include <memory>

// ── Project headers ───────────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
// Minimal test framework
// ═══════════════════════════════════════════════════════════════════════════════
namespace TestFW {

struct TestCase {
    std::string              name;
    std::function<void()>    fn;
};

static std::vector<TestCase>& registry() {
    static std::vector<TestCase> r;
    return r;
}

struct Registrar {
    Registrar(const std::string& name, std::function<void()> fn) {
        registry().push_back({name, std::move(fn)});
    }
};

struct TestFailure : std::runtime_error {
    explicit TestFailure(const std::string& msg) : std::runtime_error(msg) {}
};

// Assertion helpers
inline void assertTrue(bool cond, const std::string& expr,
                       const std::string& file, int line) {
    if (!cond)
        throw TestFailure("ASSERT_TRUE(" + expr + ") failed at " +
                          file + ":" + std::to_string(line));
}

template<typename A, typename B>
inline void assertEquals(const A& a, const B& b, const std::string& ea,
                          const std::string& eb,
                          const std::string& file, int line) {
    if (!(a == b))
        throw TestFailure("ASSERT_EQ(" + ea + ", " + eb + ") failed at " +
                          file + ":" + std::to_string(line));
}

template<typename A, typename B>
inline void assertNotEquals(const A& a, const B& b, const std::string& ea,
                             const std::string& eb,
                             const std::string& file, int line) {
    if (a == b)
        throw TestFailure("ASSERT_NE(" + ea + ", " + eb + ") failed at " +
                          file + ":" + std::to_string(line));
}

int runAll() {
    int passed = 0, failed = 0;
    std::cout << "\n========================================\n"
              << "       TRUCKPULSE TEST SUITE\n"
              << "========================================\n\n";

    for (auto& tc : registry()) {
        std::cout << "[ RUN  ] " << tc.name << "\n";
        try {
            tc.fn();
            std::cout << "[ PASS ] " << tc.name << "\n\n";
            ++passed;
        } catch (const TestFailure& e) {
            std::cout << "[ FAIL ] " << tc.name << "\n"
                      << "         " << e.what() << "\n\n";
            ++failed;
        } catch (const std::exception& e) {
            std::cout << "[ FAIL ] " << tc.name
                      << " (unexpected exception: " << e.what() << ")\n\n";
            ++failed;
        }
    }

    std::cout << "========================================\n"
              << "Results: " << passed << " passed, " << failed << " failed\n"
              << "========================================\n";

    return (failed == 0) ? 0 : 1;
}

} // namespace TestFW

#define TEST(name) \
    static void _test_##name(); \
    static TestFW::Registrar _reg_##name(#name, _test_##name); \
    static void _test_##name()

#define ASSERT_TRUE(expr) \
    TestFW::assertTrue((expr), #expr, __FILE__, __LINE__)

#define ASSERT_EQ(a, b) \
    TestFW::assertEquals((a), (b), #a, #b, __FILE__, __LINE__)

#define ASSERT_NE(a, b) \
    TestFW::assertNotEquals((a), (b), #a, #b, __FILE__, __LINE__)

#define ASSERT_THROWS(expr, ExType) \
    do { \
        bool _threw = false; \
        try { (expr); } \
        catch (const ExType&) { _threw = true; } \
        if (!_threw) throw TestFW::TestFailure( \
            "Expected " #ExType " from: " #expr " at " __FILE__ ":" + \
            std::to_string(__LINE__)); \
    } while(false)


// ═══════════════════════════════════════════════════════════════════════════════
// Shared fixture helpers
// ═══════════════════════════════════════════════════════════════════════════════
static std::unique_ptr<Vehicle> makeStandardTruck(const std::string& id = "TRK-001") {
    auto v = std::make_unique<Vehicle>(id, "FLEET-TEST", "Test Model");
    v->addSensor(std::make_unique<EngineRPMSensor>(id));
    v->addSensor(std::make_unique<CoolantTemperatureSensor>(id));
    v->addSensor(std::make_unique<OilPressureSensor>(id));
    v->addSensor(std::make_unique<VehicleSpeedSensor>(id));
    v->addSensor(std::make_unique<FuelLevelSensor>(id));
    v->addSensor(std::make_unique<BatteryVoltageSensor>(id));
    return v;
}

static Logger& nullLogger() {
    // Logger writing to /dev/null equivalent: use a stringstream sink
    static std::ostringstream sink;
    static Logger lg(sink);
    return lg;
}

static Telemetry validTelemetry(const std::string& vid = "TRK-001") {
    return Telemetry::make(vid, 1500, 85.0f, 42.0f, 60.0f, 75.0f, 13.8f);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: Vehicle construction
// ═══════════════════════════════════════════════════════════════════════════════
TEST(VehicleConstruction) {
    Vehicle v("TRK-001", "FLEET-A", "Actros 2645");
    ASSERT_EQ(v.vehicleId(), std::string("TRK-001"));
    ASSERT_EQ(v.fleetTag(),  std::string("FLEET-A"));
    ASSERT_EQ(v.model(),     std::string("Actros 2645"));
    ASSERT_EQ(v.engineStatus(), EngineStatus::OFF);
    ASSERT_EQ(v.sensorCount(), std::size_t(0));

    // Empty vehicle ID must throw
    ASSERT_THROWS(Vehicle("", "FLEET", "Model"), std::invalid_argument);
    // Empty fleet tag must throw
    ASSERT_THROWS(Vehicle("TRK-X", "", "Model"),  std::invalid_argument);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: Duplicate vehicle registration
// ═══════════════════════════════════════════════════════════════════════════════
TEST(DuplicateVehicleRegistration) {
    FleetManager fleet(nullLogger());
    fleet.registerVehicle(makeStandardTruck("TRK-DUP"), 1);

    // Registering a second vehicle with the same ID must throw
    ASSERT_THROWS(
        fleet.registerVehicle(makeStandardTruck("TRK-DUP"), 2),
        std::invalid_argument
    );
    ASSERT_EQ(fleet.vehicleCount(), std::size_t(1));
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: Sensor reading validation
// ═══════════════════════════════════════════════════════════════════════════════
TEST(SensorReadingValidation) {
    std::mt19937 rng(42);
    EngineRPMSensor rpm("V1");
    CoolantTemperatureSensor coolant("V1");
    OilPressureSensor oil("V1");
    FuelLevelSensor fuel("V1");
    BatteryVoltageSensor bat("V1");

    // Normal readings must be within valid range
    rpm.generateReading(rng, false);
    ASSERT_TRUE(rpm.isReadingValid());

    coolant.generateReading(rng, false);
    ASSERT_TRUE(coolant.isReadingValid());

    oil.generateReading(rng, false);
    ASSERT_TRUE(oil.isReadingValid());

    fuel.generateReading(rng, false);
    ASSERT_TRUE(fuel.isReadingValid());

    bat.generateReading(rng, false);
    ASSERT_TRUE(bat.isReadingValid());

    // Fault readings must be OUT of valid range
    rpm.generateReading(rng, true);     // over-rev > 3000
    ASSERT_TRUE(!rpm.isReadingValid());

    coolant.generateReading(rng, true); // overheat > 100
    ASSERT_TRUE(!coolant.isReadingValid());

    oil.generateReading(rng, true);     // low oil < 25 PSI
    ASSERT_TRUE(!oil.isReadingValid());

    bat.generateReading(rng, true);     // low battery < 12 V
    ASSERT_TRUE(!bat.isReadingValid());
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: Telemetry validation
// ═══════════════════════════════════════════════════════════════════════════════
TEST(TelemetryValidation) {
    // Valid telemetry
    auto tel = validTelemetry();
    ASSERT_TRUE(tel.isValid());

    // Empty vehicle ID
    ASSERT_THROWS(Telemetry::make("", 1000, 85.0f, 40.0f, 60.0f, 70.0f, 13.5f),
                  std::invalid_argument);

    // RPM beyond physical limit
    Telemetry bad = validTelemetry();
    bad.engineRPM = 9000;
    std::string reason;
    ASSERT_TRUE(!bad.isValid(reason));
    ASSERT_TRUE(!reason.empty());

    // Negative speed
    bad = validTelemetry();
    bad.speedKmh = -5.0f;
    ASSERT_TRUE(!bad.isValid());

    // Fuel over 100 %
    bad = validTelemetry();
    bad.fuelLevelPct = 110.0f;
    ASSERT_TRUE(!bad.isValid());
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: Correct frame encoding
// ═══════════════════════════════════════════════════════════════════════════════
TEST(FrameEncoding) {
    auto tel = validTelemetry("TRK-101");
    auto frame = FrameEncoder::encode(tel);

    ASSERT_EQ(frame.size(), FrameConstants::FULL_TELEMETRY_FRAME_SIZE);
    ASSERT_EQ(frame[0], FrameConstants::START_BYTE_0);
    ASSERT_EQ(frame[1], FrameConstants::START_BYTE_1);
    ASSERT_EQ(frame[2], FrameConstants::PROTOCOL_VERSION);
    ASSERT_EQ(frame[3], FrameConstants::MSG_TELEMETRY);

    // Vehicle ID field: "TRK-101" at bytes [4..11]
    ASSERT_EQ(frame[4], uint8_t('T'));
    ASSERT_EQ(frame[5], uint8_t('R'));
    ASSERT_EQ(frame[6], uint8_t('K'));
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: Correct frame decoding
// ═══════════════════════════════════════════════════════════════════════════════
TEST(FrameDecoding) {
    auto tel   = validTelemetry("TRK-102");
    auto frame = FrameEncoder::encode(tel);
    auto res   = FrameDecoder::decode(frame);

    ASSERT_TRUE(res.ok);
    ASSERT_EQ(res.frame.vehicleIdStr(), std::string("TRK-102"));
    ASSERT_EQ(res.frame.engineRPM, uint16_t(1500));
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: Encode-decode round trip
// ═══════════════════════════════════════════════════════════════════════════════
TEST(RoundTrip) {
    auto tel   = Telemetry::make("TRK-RT", 2200, 92.5f, 38.0f, 75.0f, 55.0f, 13.2f);
    auto frame = FrameEncoder::encode(tel);
    auto res   = FrameDecoder::decode(frame);

    ASSERT_TRUE(res.ok);
    ASSERT_EQ(res.frame.vehicleIdStr(), std::string("TRK-RT"));
    ASSERT_EQ(res.frame.engineRPM, uint16_t(2200));

    // Coolant must round-trip through float with negligible error
    float diff = res.frame.coolantTempC - 92.5f;
    ASSERT_TRUE(diff > -0.01f && diff < 0.01f);

    // Battery millivolt encoding: 13.2 V → 13200 mV → 13.2 V
    float battDiff = res.frame.batteryVoltage() - 13.2f;
    ASSERT_TRUE(battDiff > -0.01f && battDiff < 0.01f);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8: Invalid start marker
// ═══════════════════════════════════════════════════════════════════════════════
TEST(InvalidStartMarker) {
    auto tel   = validTelemetry();
    auto frame = FrameEncoder::encode(tel);
    frame[0]   = 0x00;  // corrupt first start byte

    auto res = FrameDecoder::decode(frame);
    ASSERT_TRUE(!res.ok);
    ASSERT_TRUE(res.reason.find("start marker") != std::string::npos);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 9: Invalid protocol version
// ═══════════════════════════════════════════════════════════════════════════════
TEST(InvalidProtocolVersion) {
    auto tel   = validTelemetry();
    auto frame = FrameEncoder::encode(tel);
    frame[2]   = 0xFF;  // unknown version

    auto res = FrameDecoder::decode(frame);
    ASSERT_TRUE(!res.ok);
    ASSERT_TRUE(res.reason.find("protocol version") != std::string::npos);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 10: Incorrect payload length
// ═══════════════════════════════════════════════════════════════════════════════
TEST(IncorrectPayloadLength) {
    auto tel   = validTelemetry();
    auto frame = FrameEncoder::encode(tel);
    // Bytes [12,13] are the payload length field (LE uint16_t)
    frame[12] = 0xFF;
    frame[13] = 0xFF;  // wildly wrong length

    auto res = FrameDecoder::decode(frame);
    ASSERT_TRUE(!res.ok);
    ASSERT_TRUE(res.reason.find("payload length") != std::string::npos);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 11: Corrupted checksum
// ═══════════════════════════════════════════════════════════════════════════════
TEST(CorruptedChecksum) {
    auto tel   = validTelemetry();
    auto frame = FrameEncoder::encode(tel);
    // Flip a byte deep in the payload to change data without touching the
    // checksum bytes, so the stored CRC no longer matches the computed CRC
    frame[20] ^= 0xFF;

    auto res = FrameDecoder::decode(frame);
    ASSERT_TRUE(!res.ok);
    ASSERT_TRUE(res.reason.find("Checksum") != std::string::npos ||
                res.reason.find("checksum") != std::string::npos);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 12: Truncated frame
// ═══════════════════════════════════════════════════════════════════════════════
TEST(TruncatedFrame) {
    auto tel   = validTelemetry();
    auto frame = FrameEncoder::encode(tel);
    frame.resize(frame.size() - 10);  // remove last 10 bytes

    auto res = FrameDecoder::decode(frame);
    ASSERT_TRUE(!res.ok);
    ASSERT_TRUE(!res.reason.empty());
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 13: Empty fleet handling
// ═══════════════════════════════════════════════════════════════════════════════
TEST(EmptyFleet) {
    FleetManager fleet(nullLogger());
    ASSERT_EQ(fleet.vehicleCount(), std::size_t(0));
    ASSERT_TRUE(fleet.vehicleIds().empty());

    auto telemetry = fleet.generateAllTelemetry();
    ASSERT_TRUE(telemetry.empty());

    // findVehicle on empty fleet should return nullptr, not crash
    ASSERT_TRUE(fleet.findVehicle("GHOST") == nullptr);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 14: Vehicle lookup
// ═══════════════════════════════════════════════════════════════════════════════
TEST(VehicleLookup) {
    FleetManager fleet(nullLogger());
    fleet.registerVehicle(makeStandardTruck("TRK-LOOK"), 99);

    // Positive lookup
    const Vehicle* v = fleet.findVehicle("TRK-LOOK");
    ASSERT_TRUE(v != nullptr);
    ASSERT_EQ(v->vehicleId(), std::string("TRK-LOOK"));

    // Negative lookup
    ASSERT_TRUE(fleet.findVehicle("GHOST-999") == nullptr);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 15: Fault injection
// ═══════════════════════════════════════════════════════════════════════════════
TEST(FaultInjection) {
    // Run each fault scenario 20 times to avoid lucky-seed false passes
    for (uint32_t seed = 0; seed < 20; ++seed) {
        // ENGINE_OVERHEAT → coolant > 100 C
        {
            auto v = makeStandardTruck("TRK-F1");
            Logger& lg = nullLogger();
            VehicleSimulator sim(*v, lg, seed);
            Telemetry tel = sim.generateTelemetry(FaultScenario::ENGINE_OVERHEAT);
            ASSERT_TRUE(tel.coolantTempC > 100.0f);
        }

        // LOW_OIL_PRESSURE → oil < 25 PSI
        {
            auto v = makeStandardTruck("TRK-F2");
            Logger& lg = nullLogger();
            VehicleSimulator sim(*v, lg, seed);
            Telemetry tel = sim.generateTelemetry(FaultScenario::LOW_OIL_PRESSURE);
            ASSERT_TRUE(tel.oilPressurePSI < 25.0f);
        }

        // EXCESSIVE_RPM → RPM > 3000
        {
            auto v = makeStandardTruck("TRK-F3");
            Logger& lg = nullLogger();
            VehicleSimulator sim(*v, lg, seed);
            Telemetry tel = sim.generateTelemetry(FaultScenario::EXCESSIVE_RPM);
            ASSERT_TRUE(tel.engineRPM > 3000);
        }

        // LOW_BATTERY_VOLTAGE → battery < 12.0 V
        {
            auto v = makeStandardTruck("TRK-F4");
            Logger& lg = nullLogger();
            VehicleSimulator sim(*v, lg, seed);
            Telemetry tel = sim.generateTelemetry(FaultScenario::LOW_BATTERY_VOLTAGE);
            ASSERT_TRUE(tel.batteryVoltage < 12.0f);
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 16: Diagnostic Rule Evaluation
// ═══════════════════════════════════════════════════════════════════════════════
TEST(DiagnosticRuleEvaluation) {
    DiagnosticEngine engine;

    // Normal telemetry -> 0 events
    auto normal = Telemetry::make("TRK-D1", 1500, 88.0f, 40.0f, 60.0f, 50.0f, 13.5f);
    auto evNormal = engine.processTelemetry(normal);
    ASSERT_EQ(evNormal.size(), std::size_t(0));
    ASSERT_EQ(engine.getActiveFaults().size(), std::size_t(0));

    // 1. Coolant > 105 -> ENGINE_OVERHEATING
    auto hot = Telemetry::make("TRK-D1", 1500, 110.0f, 40.0f, 60.0f, 50.0f, 13.5f);
    auto evHot = engine.processTelemetry(hot);
    ASSERT_EQ(evHot.size(), std::size_t(1));
    ASSERT_EQ(evHot[0].faultCode, std::string("ENGINE_OVERHEATING"));
    ASSERT_EQ(severityToString(evHot[0].severity), std::string("CRITICAL"));
    ASSERT_TRUE(engine.isFaultActive("TRK-D1", "ENGINE_OVERHEATING"));

    // 2. Oil pressure < 15 -> LOW_OIL_PRESSURE
    auto lowOil = Telemetry::make("TRK-D2", 1500, 88.0f, 10.0f, 60.0f, 50.0f, 13.5f);
    auto evOil = engine.processTelemetry(lowOil);
    ASSERT_EQ(evOil.size(), std::size_t(1));
    ASSERT_EQ(evOil[0].faultCode, std::string("LOW_OIL_PRESSURE"));
    ASSERT_EQ(severityToString(evOil[0].severity), std::string("CRITICAL"));

    // 3. High RPM > 3500 -> HIGH_ENGINE_RPM
    auto highRpm = Telemetry::make("TRK-D3", 3800, 88.0f, 40.0f, 60.0f, 50.0f, 13.5f);
    auto evRpm = engine.processTelemetry(highRpm);
    ASSERT_EQ(evRpm.size(), std::size_t(1));
    ASSERT_EQ(evRpm[0].faultCode, std::string("HIGH_ENGINE_RPM"));
    ASSERT_EQ(severityToString(evRpm[0].severity), std::string("WARNING"));

    // 4. Low battery < 11.5 -> LOW_BATTERY_VOLTAGE
    auto lowBat = Telemetry::make("TRK-D4", 1500, 88.0f, 40.0f, 60.0f, 50.0f, 11.0f);
    auto evBat = engine.processTelemetry(lowBat);
    ASSERT_EQ(evBat.size(), std::size_t(1));
    ASSERT_EQ(evBat[0].faultCode, std::string("LOW_BATTERY_VOLTAGE"));
    ASSERT_EQ(severityToString(evBat[0].severity), std::string("WARNING"));

    // 5. Low fuel < 5% -> LOW_FUEL
    auto lowFuel = Telemetry::make("TRK-D5", 1500, 88.0f, 40.0f, 60.0f, 3.0f, 13.5f);
    auto evFuel = engine.processTelemetry(lowFuel);
    ASSERT_EQ(evFuel.size(), std::size_t(1));
    ASSERT_EQ(evFuel[0].faultCode, std::string("LOW_FUEL"));
    ASSERT_EQ(severityToString(evFuel[0].severity), std::string("WARNING"));
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 17: Diagnostic Deduplication & Fault Resolution
// ═══════════════════════════════════════════════════════════════════════════════
TEST(DiagnosticDeduplicationAndResolution) {
    DiagnosticEngine engine;

    // Tick 1: Trigger overheating
    auto hot1 = Telemetry::make("TRK-RES", 1500, 112.0f, 40.0f, 60.0f, 50.0f, 13.5f);
    auto ev1 = engine.processTelemetry(hot1);
    ASSERT_EQ(ev1.size(), std::size_t(1));
    ASSERT_TRUE(engine.isFaultActive("TRK-RES", "ENGINE_OVERHEATING"));

    // Tick 2: Still overheating -> Must NOT emit duplicate event
    auto hot2 = Telemetry::make("TRK-RES", 1500, 115.0f, 40.0f, 60.0f, 50.0f, 13.5f);
    auto ev2 = engine.processTelemetry(hot2);
    ASSERT_EQ(ev2.size(), std::size_t(0)); // Deduplicated!
    ASSERT_TRUE(engine.isFaultActive("TRK-RES", "ENGINE_OVERHEATING"));
    ASSERT_EQ(engine.getActiveFaults("TRK-RES").size(), std::size_t(1));

    // Tick 3: Temperature cools down to 90 C -> Must emit 1 RESOLUTION event
    auto cool = Telemetry::make("TRK-RES", 1500, 90.0f, 40.0f, 60.0f, 50.0f, 13.5f);
    auto ev3 = engine.processTelemetry(cool);
    ASSERT_EQ(ev3.size(), std::size_t(1));
    ASSERT_TRUE(ev3[0].isResolved);
    ASSERT_EQ(ev3[0].faultCode, std::string("ENGINE_OVERHEATING"));
    ASSERT_EQ(severityToString(ev3[0].severity), std::string("INFO"));
    ASSERT_TRUE(!engine.isFaultActive("TRK-RES", "ENGINE_OVERHEATING"));
    ASSERT_EQ(engine.getActiveFaults("TRK-RES").size(), std::size_t(0));
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 18: Multiple Vehicles Diagnostics Isolation
// ═══════════════════════════════════════════════════════════════════════════════
TEST(DiagnosticMultipleVehiclesIsolation) {
    DiagnosticEngine engine;

    auto hotA = Telemetry::make("TRK-A", 1500, 115.0f, 40.0f, 60.0f, 50.0f, 13.5f);
    auto coolB = Telemetry::make("TRK-B", 1500, 85.0f, 40.0f, 60.0f, 50.0f, 13.5f);

    engine.processTelemetry(hotA);
    engine.processTelemetry(coolB);

    ASSERT_TRUE(engine.isFaultActive("TRK-A", "ENGINE_OVERHEATING"));
    ASSERT_TRUE(!engine.isFaultActive("TRK-B", "ENGINE_OVERHEATING"));

    ASSERT_EQ(engine.getActiveFaults("TRK-A").size(), std::size_t(1));
    ASSERT_EQ(engine.getActiveFaults("TRK-B").size(), std::size_t(0));
    ASSERT_EQ(engine.getActiveFaults().size(), std::size_t(1));
}


// ═══════════════════════════════════════════════════════════════════════════════
int main() {
    return TestFW::runAll();
}
