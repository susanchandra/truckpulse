# TruckPulse — Automotive Diagnostics and Fleet Health Platform

> **Phase 1 — Vehicle Telemetry Simulation and Communication Foundation**  
> Built for the Graduate Engineer Trainee application at **Daimler Truck Innovation Center India (DTICI)**

---

## 1. Project Overview

TruckPulse is a C++17 vehicle telemetry simulation system that models a small fleet of trucks, generates structured sensor data, serialises it into binary frames, and validates the decoded output — demonstrating the data pipeline that underpins a real embedded fleet management platform.

This is a **portfolio-quality educational project**. It is not a production automotive system. The binary protocol is a custom, simplified format inspired by CAN/J1939 concepts but it is not a real SAE J1939 or ISO 15765 implementation.

---

## 2. Problem Statement

Fleet operators need reliable, real-time insight into vehicle health. In a real truck, tens of ECUs transmit hundreds of sensor readings per second over CAN or Ethernet. This project simulates the core data path:

1. **Sensor simulation** — model realistic engine, thermal, and electrical readings.
2. **Telemetry construction** — assemble a validated snapshot per vehicle per tick.
3. **Binary encoding** — pack the snapshot into a compact, checksummed frame.
4. **Binary decoding** — parse, validate, and reject any corrupted frames.
5. **Fault injection** — deliberately trigger known failure scenarios to verify detection.

---

## 3. Features

| Feature | Detail |
|---|---|
| Six sensor types per vehicle | RPM, Coolant Temp, Oil Pressure, Speed, Fuel Level, Battery Voltage |
| Fleet management | Register, remove, and look up vehicles by ID |
| Reproducible simulation | Configurable RNG seed for each vehicle |
| CAN-inspired binary protocol | 44-byte fixed frame with start marker, version, type, CRC-16 |
| Four fault scenarios | Engine overheat, low oil, over-rev, low battery |
| Frame validation | 7-step decode validation; never silently accepts corruption |
| 15 automated tests | All pass; covers normal path, round-trip, and all error paths |
| Zero external dependencies | Standard library only |

---

## 4. Architecture

```
main.cpp
   │
   ├── FleetManager          (owns vehicles and simulators)
   │     ├── Vehicle         (identity + sensor collection)
   │     │     └── Sensor[]  (abstract base → 6 concrete types)
   │     └── VehicleSimulator (drives sensors, builds Telemetry)
   │
   ├── Telemetry             (plain-data value type per snapshot)
   │
   ├── FrameEncoder          (Telemetry → byte vector)
   ├── TelemetryFrame        (decoded in-memory frame struct)
   └── FrameDecoder          (byte vector → TelemetryFrame, 7-step validation)
```

**Separation of concerns:**
- `Vehicle` knows nothing about simulation or the wire format.
- `Telemetry` knows nothing about binary encoding.
- `FrameEncoder`/`FrameDecoder` know nothing about sensors.
- `FleetManager` knows nothing about the binary protocol.

---

## 5. Technology Stack

| Item | Choice |
|---|---|
| Language | C++17 |
| Build system | CMake 3.16+ |
| Compiler tested | GCC 6.3.0 (MinGW win32), portable to GCC 12+, MSVC 2019+, Clang 14+ |
| Testing | Custom lightweight test framework (~50 lines), integrated with CTest |
| Threading library | `std::mutex` guarded by `TP_HAS_MUTEX` for portability |
| Randomness | `std::mt19937` with per-vehicle configurable seed |

---

## 6. Folder Structure

```
TruckPulse/
├── cpp/
│   ├── CMakeLists.txt
│   ├── include/
│   │   ├── models/
│   │   │   ├── Vehicle.h          # Vehicle class + EngineStatus enum
│   │   │   ├── Sensor.h           # Abstract Sensor + 6 concrete types
│   │   │   └── Telemetry.h        # Telemetry value type + validation
│   │   ├── simulator/
│   │   │   ├── VehicleSimulator.h # Drives sensors, produces frames
│   │   │   └── FleetManager.h     # Fleet registry + bulk telemetry
│   │   ├── protocol/
│   │   │   ├── TelemetryFrame.h   # Frame constants + decoded struct
│   │   │   ├── FrameEncoder.h     # Telemetry → bytes + CRC-16
│   │   │   └── FrameDecoder.h     # bytes → TelemetryFrame, 7-step validation
│   │   └── utils/
│   │       └── Logger.h           # Timestamped INFO/WARNING/ERROR logger
│   ├── src/
│   │   └── main.cpp               # CLI demo: 3 trucks, encode, decode, faults
│   └── tests/
│       └── tests.cpp              # 15 tests, self-contained framework
├── docs/
├── .gitignore
└── README.md
```

---

## 7. Binary Telemetry Frame Specification

> This is a **custom educational simulation protocol**, not SAE J1939 or ISO 15765.

All multi-byte integers are **little-endian**.

### Frame layout (44 bytes total)

| Field | Offset | Size | Type | Value |
|---|---|---|---|---|
| `START_MARKER` | 0 | 2 | — | `0xAA 0x55` |
| `PROTOCOL_VER` | 2 | 1 | `uint8_t` | `0x01` |
| `MESSAGE_TYPE` | 3 | 1 | `uint8_t` | `0x01` = TELEMETRY |
| `VEHICLE_ID` | 4 | 8 | ASCII (null-padded) | e.g. `TRK-101\0` |
| `PAYLOAD_LENGTH` | 12 | 2 | `uint16_t` LE | `28` |
| *(payload start)* | 14 | — | — | — |
| `TIMESTAMP` | 14 | 8 | `uint64_t` LE | Unix epoch seconds |
| `ENGINE_RPM` | 22 | 2 | `uint16_t` LE | e.g. `1450` |
| `COOLANT_TEMP` | 24 | 4 | `float` IEEE-754 LE | e.g. `88.0` |
| `OIL_PRESSURE` | 28 | 4 | `float` IEEE-754 LE | e.g. `42.0` |
| `SPEED_KMH` | 32 | 4 | `float` IEEE-754 LE | e.g. `65.0` |
| `FUEL_LEVEL` | 36 | 4 | `float` IEEE-754 LE | e.g. `74.0` |
| `BATTERY_MV` | 40 | 2 | `uint16_t` LE | millivolts: `13800` = 13.8 V |
| `CHECKSUM` | 42 | 2 | `uint16_t` LE | CRC-16/CCITT-FALSE |

### Checksum
CRC-16/CCITT-FALSE: polynomial `0x1021`, initial value `0xFFFF`, no input/output reflection. Computed over bytes `[0 .. 41]` (header + payload, excluding the two checksum bytes).

### Decode validation sequence
1. Minimum length ≥ 16 bytes
2. Start marker == `0xAA 0x55`
3. Protocol version == `0x01`
4. Message type is a known type
5. Payload length field == `28`
6. Actual frame length == header + payload + checksum
7. Computed CRC matches stored CRC

---

## 8. OOP Concepts Demonstrated

| Concept | Where |
|---|---|
| **Abstraction** | `Sensor` abstract base class with pure virtual `generateReading()` |
| **Inheritance** | `EngineRPMSensor`, `CoolantTemperatureSensor`, etc. extend `Sensor` |
| **Polymorphism** | `Vehicle::sensors()` returns `unique_ptr<Sensor>[]`; simulator calls `generateReading()` virtually |
| **Encapsulation** | Private members in all classes; getters/setters where needed; no exposed mutable internals |
| **Composition** | `Vehicle` owns `Sensor` collection; `FleetManager` owns `Vehicle` + `VehicleSimulator` |
| **RAII** | `unique_ptr<Sensor>`, `unique_ptr<Vehicle>`, `unique_ptr<VehicleSimulator>` for all heap objects |
| **Const-correctness** | `const Vehicle*` lookups, `const std::string&` parameters, `const` methods |
| **Value types** | `Telemetry` is a plain-data value type; `TelemetryFrame` is a decoded value struct |
| **Smart pointers** | `unique_ptr` throughout; no raw owning pointers |
| **Move semantics** | Vehicles are moved into the fleet map; `unique_ptr` moved into collections |
| **Enums** | `EngineStatus`, `FaultScenario`, `LogLevel` as typed enum classes |

---

## 9. Build Instructions

### Prerequisites
- CMake ≥ 3.16
- C++17-capable compiler: GCC ≥ 7 (POSIX-thread MinGW or Linux), MSVC ≥ 2017, Clang ≥ 5

### Configure and build

```bash
# From the project root
cd cpp

# Configure (Linux / POSIX MinGW)
cmake -B build -DCMAKE_BUILD_TYPE=Release

# Configure (Windows, MinGW Makefiles)
cmake -B build -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build build
```

### Run the application

```bash
./build/truckpulse          # Linux
build\truckpulse.exe        # Windows
```

---

## 10. Test Instructions

```bash
# Run directly
./build/truckpulse_tests          # Linux
build\truckpulse_tests.exe        # Windows

# Run via CTest
cd build
ctest --output-on-failure
```

Expected output:
```
Results: 15 passed, 0 failed
```

---

## 11. Example Output

```
====================================
          TRUCKPULSE
   VEHICLE TELEMETRY SYSTEM
       Phase 1 — C++17
====================================

Fleet initialised: 3 vehicles

Vehicle : TRK-101  [Mercedes Actros 2645]
  Engine RPM  : 1860 RPM
  Coolant     : 96.8 C
  Oil Pressure: 61.5 PSI
  Speed       : 0.1 KM/H
  Fuel Level  : 60.4 %
  Battery     : 12.9 V
  Frame encoded  : 44 bytes ✓
  Frame decoded  : OK ✓

...

=== Corrupted Frame Detection ===

  Corrupted frame detected ✓
  Reason: Checksum mismatch: stored 0x277F, computed 0xD0D1.

=== Fault Injection Scenarios ===

  [FAULT] TRK-101 — Engine Overheat
  Coolant     : 121.0 C
  Fault frame encode/decode: OK ✓
```

---

## 12. Current Limitations

| Limitation | Reason |
|---|---|
| `std::mutex` absent on win32-thread MinGW 6.3.0 | Win32-thread GCC doesn't expose `std::mutex`; guarded by `TP_HAS_MUTEX` |
| No persistent storage | Phase 1 is in-memory only |
| No real CAN or serial I/O | Frame bytes are in-process vectors; Phase 2 adds network transport |
| Sensor readings are uniform-random | Simple model; Phase 2 can add time-series with drift |
| Fleet operates single-threaded | Mutex guards are present for Phase 2 multi-threaded expansion |

---

## 13. Future Development Roadmap

| Phase | Features |
|---|---|
| **Phase 2** | Diagnostics engine: DTC generation, severity classification, threshold rules |
| **Phase 2** | Python FastAPI REST backend, WebSocket push to clients |
| **Phase 2** | PostgreSQL telemetry history, alert storage |
| **Phase 3** | React dashboard, real-time charts, map view |
| **Phase 3** | Multi-threaded telemetry pipeline with concurrent vehicle processing |
| **Phase 4** | MQTT/CAN adapter for real hardware integration |

---

*TruckPulse is a demonstration project for the DTICI Graduate Engineer Trainee programme. All sensor data, vehicles, and protocols are simulated.*
