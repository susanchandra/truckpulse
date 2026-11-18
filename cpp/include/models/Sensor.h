#pragma once
/**
 * Sensor.h
 * Abstract base class for all vehicle sensors, plus six concrete sensor types.
 *
 * Design decisions:
 *  - Sensor is abstract with a pure virtual generateReading().  Every concrete
 *    sensor must override it, enforcing the template-method pattern used by
 *    the simulator.
 *  - Reading generation uses <random> so values are realistic per execution
 *    without being identical every time.  The simulator owns the RNG engine and
 *    passes a seed so runs can be made reproducible.
 *  - Min/max bounds are stored here so the base class can offer a uniform
 *    isReadingValid() check without each subclass duplicating range logic.
 *  - We use virtual destructor to ensure correct cleanup through base pointers.
 */

#include <string>
#include <random>
#include <stdexcept>
#include <cstdint>
#include <sstream>
#include <iomanip>

namespace TruckPulse {

// ─────────────────────────────────────────────
// Abstract Sensor base class
// ─────────────────────────────────────────────
class Sensor {
public:
    Sensor(std::string id,
           std::string name,
           std::string unit,
           double minValid,
           double maxValid)
        : m_id(std::move(id))
        , m_name(std::move(name))
        , m_unit(std::move(unit))
        , m_minValid(minValid)
        , m_maxValid(maxValid)
        , m_currentReading(0.0)
    {
        if (m_minValid >= m_maxValid)
            throw std::invalid_argument(
                "Sensor '" + m_name + "': minValid must be < maxValid.");
    }

    virtual ~Sensor() = default;

    // Disallow copy; sensors are identity objects tied to a vehicle
    Sensor(const Sensor&)            = delete;
    Sensor& operator=(const Sensor&) = delete;

    // Allow move for container placement
    Sensor(Sensor&&)            = default;
    Sensor& operator=(Sensor&&) = default;

    // ---- Accessors ----
    const std::string& id()             const { return m_id; }
    const std::string& name()           const { return m_name; }
    const std::string& unit()           const { return m_unit; }
    double             currentReading() const { return m_currentReading; }
    double             minValid()       const { return m_minValid; }
    double             maxValid()       const { return m_maxValid; }

    // Returns true when the last reading lies within the declared valid range
    bool isReadingValid() const {
        return m_currentReading >= m_minValid &&
               m_currentReading <= m_maxValid;
    }

    // Formats the reading for display, e.g. "1450 RPM"
    std::string formattedReading() const {
        std::ostringstream oss;
        oss << std::fixed << std::setprecision(1) << m_currentReading
            << " " << m_unit;
        return oss.str();
    }

    /**
     * Generate a new sensor reading using the supplied RNG engine.
     * Subclasses must implement this.  The result must be stored in
     * m_currentReading.  Fault injection is controlled by injectFault.
     *
     * @param rng        Mersenne-twister engine owned by the simulator.
     * @param injectFault When true the sensor should produce an out-of-range
     *                    value that represents a realistic failure mode.
     */
    virtual void generateReading(std::mt19937& rng, bool injectFault = false) = 0;

protected:
    void setReading(double value) { m_currentReading = value; }

private:
    std::string m_id;
    std::string m_name;
    std::string m_unit;
    double      m_minValid;
    double      m_maxValid;
    double      m_currentReading;
};


// ─────────────────────────────────────────────
// Concrete sensor: Engine RPM
// Normal range  : 600 – 3000 RPM
// Fault scenario: spike above 3500 (over-rev)
// ─────────────────────────────────────────────
class EngineRPMSensor : public Sensor {
public:
    explicit EngineRPMSensor(const std::string& vehicleId)
        : Sensor(vehicleId + "_RPM", "Engine RPM", "RPM", 600.0, 3000.0) {}

    void generateReading(std::mt19937& rng, bool injectFault = false) override {
        if (injectFault) {
            // Over-rev fault: 3200 – 4500 RPM
            std::uniform_real_distribution<double> dist(3200.0, 4500.0);
            setReading(dist(rng));
        } else {
            // Normal cruising / idle range
            std::uniform_real_distribution<double> dist(700.0, 2800.0);
            setReading(dist(rng));
        }
    }
};


// ─────────────────────────────────────────────
// Concrete sensor: Coolant Temperature
// Normal range  : 70 – 100 °C
// Fault scenario: overheating > 115 °C
// ─────────────────────────────────────────────
class CoolantTemperatureSensor : public Sensor {
public:
    explicit CoolantTemperatureSensor(const std::string& vehicleId)
        : Sensor(vehicleId + "_COOLANT", "Coolant Temperature", "C", 70.0, 100.0) {}

    void generateReading(std::mt19937& rng, bool injectFault = false) override {
        if (injectFault) {
            // Engine overheating fault: 108 – 130 °C
            std::uniform_real_distribution<double> dist(108.0, 130.0);
            setReading(dist(rng));
        } else {
            std::uniform_real_distribution<double> dist(72.0, 98.0);
            setReading(dist(rng));
        }
    }
};


// ─────────────────────────────────────────────
// Concrete sensor: Oil Pressure
// Normal range  : 25 – 65 PSI
// Fault scenario: dangerously low < 15 PSI
// ─────────────────────────────────────────────
class OilPressureSensor : public Sensor {
public:
    explicit OilPressureSensor(const std::string& vehicleId)
        : Sensor(vehicleId + "_OIL", "Oil Pressure", "PSI", 25.0, 65.0) {}

    void generateReading(std::mt19937& rng, bool injectFault = false) override {
        if (injectFault) {
            // Low oil pressure fault: 2 – 14 PSI
            std::uniform_real_distribution<double> dist(2.0, 14.0);
            setReading(dist(rng));
        } else {
            std::uniform_real_distribution<double> dist(28.0, 62.0);
            setReading(dist(rng));
        }
    }
};


// ─────────────────────────────────────────────
// Concrete sensor: Vehicle Speed
// Normal range  : 0 – 120 KM/H
// Fault scenario: (speed sensor faults are not safety-critical in this sim;
//                  fault generates 0 to represent a stalled reading)
// ─────────────────────────────────────────────
class VehicleSpeedSensor : public Sensor {
public:
    explicit VehicleSpeedSensor(const std::string& vehicleId)
        : Sensor(vehicleId + "_SPEED", "Vehicle Speed", "KM/H", 0.0, 120.0) {}

    void generateReading(std::mt19937& rng, bool injectFault = false) override {
        if (injectFault) {
            // Stalled / sensor dropout: speed reads 0
            setReading(0.0);
        } else {
            std::uniform_real_distribution<double> dist(0.0, 110.0);
            setReading(dist(rng));
        }
    }
};


// ─────────────────────────────────────────────
// Concrete sensor: Fuel Level
// Normal range  : 10 – 100 %
// Fault scenario: critically low < 8 %
// ─────────────────────────────────────────────
class FuelLevelSensor : public Sensor {
public:
    explicit FuelLevelSensor(const std::string& vehicleId)
        : Sensor(vehicleId + "_FUEL", "Fuel Level", "%", 10.0, 100.0) {}

    void generateReading(std::mt19937& rng, bool injectFault = false) override {
        if (injectFault) {
            // Near-empty: 1 – 7 %
            std::uniform_real_distribution<double> dist(1.0, 7.0);
            setReading(dist(rng));
        } else {
            std::uniform_real_distribution<double> dist(15.0, 100.0);
            setReading(dist(rng));
        }
    }
};


// ─────────────────────────────────────────────
// Concrete sensor: Battery Voltage
// Normal range  : 12.0 – 14.8 V
// Fault scenario: low-voltage / failing alternator < 11.5 V
// ─────────────────────────────────────────────
class BatteryVoltageSensor : public Sensor {
public:
    explicit BatteryVoltageSensor(const std::string& vehicleId)
        : Sensor(vehicleId + "_BATTERY", "Battery Voltage", "V", 12.0, 14.8) {}

    void generateReading(std::mt19937& rng, bool injectFault = false) override {
        if (injectFault) {
            // Low battery / failing alternator: 9.5 – 11.4 V
            std::uniform_real_distribution<double> dist(9.5, 11.4);
            setReading(dist(rng));
        } else {
            std::uniform_real_distribution<double> dist(12.2, 14.6);
            setReading(dist(rng));
        }
    }
};

} // namespace TruckPulse
