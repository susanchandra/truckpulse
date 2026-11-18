#pragma once
/**
 * TelemetryFrame.h
 * Binary frame layout for TruckPulse telemetry transmission.
 *
 * ════════════════════════════════════════════════════════════════════════
 * TRUCKPULSE BINARY TELEMETRY FRAME  (Educational simulation protocol)
 * ════════════════════════════════════════════════════════════════════════
 *
 * This is a custom, simplified binary protocol designed to illustrate
 * CAN-inspired concepts such as start markers, versioning, message types,
 * and checksums.  It is NOT SAE J1939, ISO 15765 (UDS), or any real
 * vehicle bus standard.
 *
 * All multi-byte integers are stored in LITTLE-ENDIAN byte order.
 *
 * Frame layout (all sizes in bytes):
 * ┌─────────────────┬──────┬────────────────────────────────────────────┐
 * │ Field           │ Size │ Description                                │
 * ├─────────────────┼──────┼────────────────────────────────────────────┤
 * │ START_MARKER    │  2   │ Fixed: 0xAA 0x55  (sync / framing)        │
 * │ PROTOCOL_VER    │  1   │ Fixed: 0x01                               │
 * │ MESSAGE_TYPE    │  1   │ 0x01 = TELEMETRY_DATA                     │
 * │ VEHICLE_ID      │  8   │ ASCII string, null-padded                  │
 * │ PAYLOAD_LENGTH  │  2   │ Number of payload bytes that follow (LE)   │
 * │ PAYLOAD         │  N   │ Serialised telemetry fields (see below)    │
 * │ CHECKSUM        │  2   │ CRC-16/CCITT-FALSE over header+payload(LE) │
 * └─────────────────┴──────┴────────────────────────────────────────────┘
 *
 * Payload field layout (fixed-size, 28 bytes):
 * ┌───────────────────┬──────┬──────────────────────────────────────────┐
 * │ Field             │ Size │ Notes                                    │
 * ├───────────────────┼──────┼──────────────────────────────────────────┤
 * │ TIMESTAMP         │  8   │ uint64_t, epoch seconds (LE)             │
 * │ ENGINE_RPM        │  2   │ uint16_t  (LE)                           │
 * │ COOLANT_TEMP      │  4   │ float IEEE-754 (LE)                      │
 * │ OIL_PRESSURE      │  4   │ float IEEE-754 (LE)                      │
 * │ SPEED_KMH         │  4   │ float IEEE-754 (LE)                      │
 * │ FUEL_LEVEL        │  4   │ float IEEE-754 (LE)                      │
 * │ BATTERY_VOLTAGE   │  2   │ uint16_t millivolts, e.g. 13800 = 13.8V │
 * └───────────────────┴──────┴──────────────────────────────────────────┘
 *
 * Header size  = 2+1+1+8+2 = 14 bytes
 * Payload size = 28 bytes  (TELEMETRY_PAYLOAD_SIZE)
 * Footer size  = 2 bytes
 * Total frame  = 14 + 28 + 2 = 44 bytes
 *
 * CRC-16 calculation covers bytes [0 .. headerSize+payloadSize-1],
 * i.e. everything before the two checksum bytes.
 *
 * ════════════════════════════════════════════════════════════════════════
 */

#include <cstdint>
#include <vector>
#include <string>
#include <array>

namespace TruckPulse {

// ── Frame constants ───────────────────────────────────────────────────────────
namespace FrameConstants {
    constexpr uint8_t  START_BYTE_0     = 0xAA;
    constexpr uint8_t  START_BYTE_1     = 0x55;
    constexpr uint8_t  PROTOCOL_VERSION = 0x01;
    constexpr uint8_t  MSG_TELEMETRY    = 0x01;

    constexpr std::size_t VEHICLE_ID_FIELD_LEN     = 8;
    constexpr std::size_t TELEMETRY_PAYLOAD_SIZE   = 28;
    constexpr std::size_t HEADER_SIZE              = 14; // 2+1+1+8+2
    constexpr std::size_t CHECKSUM_SIZE            = 2;
    constexpr std::size_t MIN_FRAME_SIZE           = HEADER_SIZE + CHECKSUM_SIZE;
    constexpr std::size_t FULL_TELEMETRY_FRAME_SIZE =
        HEADER_SIZE + TELEMETRY_PAYLOAD_SIZE + CHECKSUM_SIZE; // 44
}

// ── TelemetryFrame value object ───────────────────────────────────────────────
/**
 * A decoded, in-memory representation of one binary frame.
 * This struct is what FrameDecoder produces and FrameEncoder consumes.
 */
struct TelemetryFrame {
    uint8_t  protocolVersion = FrameConstants::PROTOCOL_VERSION;
    uint8_t  messageType     = FrameConstants::MSG_TELEMETRY;
    char     vehicleId[FrameConstants::VEHICLE_ID_FIELD_LEN] = {};

    uint64_t timestamp      = 0;
    uint16_t engineRPM      = 0;
    float    coolantTempC   = 0.0f;
    float    oilPressurePSI = 0.0f;
    float    speedKmh       = 0.0f;
    float    fuelLevelPct   = 0.0f;
    uint16_t batteryMV      = 0; // millivolts: 13800 → 13.8 V

    // Convenience: return vehicle ID as std::string (strips null padding)
    std::string vehicleIdStr() const {
        // Find length manually — strnlen is not universally available
        std::size_t len = 0;
        while (len < FrameConstants::VEHICLE_ID_FIELD_LEN && vehicleId[len] != '\0')
            ++len;
        return std::string(vehicleId, len);
    }

    float batteryVoltage() const {
        return static_cast<float>(batteryMV) / 1000.0f;
    }
};

} // namespace TruckPulse
