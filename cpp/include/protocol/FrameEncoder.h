#pragma once
/**
 * FrameEncoder.h
 * Serialises a TelemetryFrame (or a Telemetry snapshot) into a byte vector
 * following the TruckPulse binary frame specification.
 *
 * Key design points:
 *  - Fields are written one-by-one in explicit byte order (little-endian).
 *    We never use reinterpret_cast on structs because we cannot control the
 *    compiler padding inserted into aggregate types.
 *  - The CRC-16/CCITT-FALSE polynomial (0x1021, init 0xFFFF) is calculated
 *    over all bytes except the final two checksum bytes.
 *  - Throws std::invalid_argument if the vehicle ID is too long or the
 *    telemetry is in a physically impossible state.
 */

#include <cstdint>
#include <vector>
#include <string>
#include <cstring>
#include <stdexcept>
#include "protocol/TelemetryFrame.h"
#include "models/Telemetry.h"

namespace TruckPulse {

class FrameEncoder {
public:
    /**
     * Encode a Telemetry snapshot into a byte vector.
     * @throws std::invalid_argument on invalid input.
     * @throws std::runtime_error    if payload size calculation is wrong.
     */
    static std::vector<uint8_t> encode(const Telemetry& tel) {
        // ── Validate before touching bytes ───────────────────────────────────
        std::string reason;
        if (!tel.isValid(reason))
            throw std::invalid_argument("Cannot encode invalid telemetry: " + reason);

        if (tel.vehicleId.size() >= FrameConstants::VEHICLE_ID_FIELD_LEN)
            throw std::invalid_argument(
                "Vehicle ID too long for frame field (max "
                + std::to_string(FrameConstants::VEHICLE_ID_FIELD_LEN - 1)
                + " chars).");

        // ── Build buffer ─────────────────────────────────────────────────────
        std::vector<uint8_t> frame;
        frame.reserve(FrameConstants::FULL_TELEMETRY_FRAME_SIZE);

        // START marker
        frame.push_back(FrameConstants::START_BYTE_0);
        frame.push_back(FrameConstants::START_BYTE_1);

        // Protocol version
        frame.push_back(FrameConstants::PROTOCOL_VERSION);

        // Message type
        frame.push_back(FrameConstants::MSG_TELEMETRY);

        // Vehicle ID: 8-byte field, null-padded
        uint8_t vidField[FrameConstants::VEHICLE_ID_FIELD_LEN] = {};
        std::memcpy(vidField, tel.vehicleId.c_str(), tel.vehicleId.size());
        for (std::size_t i = 0; i < FrameConstants::VEHICLE_ID_FIELD_LEN; ++i)
            frame.push_back(vidField[i]);

        // Payload length (little-endian uint16_t)
        uint16_t payLen = static_cast<uint16_t>(FrameConstants::TELEMETRY_PAYLOAD_SIZE);
        pushU16LE(frame, payLen);

        // ── Payload ───────────────────────────────────────────────────────────
        const std::size_t payloadStart = frame.size();

        pushU64LE(frame, tel.timestampEpoch);                 // 8 bytes
        pushU16LE(frame, tel.engineRPM);                      // 2 bytes
        pushFloatLE(frame, tel.coolantTempC);                  // 4 bytes
        pushFloatLE(frame, tel.oilPressurePSI);                // 4 bytes
        pushFloatLE(frame, tel.speedKmh);                      // 4 bytes
        pushFloatLE(frame, tel.fuelLevelPct);                  // 4 bytes

        // Battery stored as millivolts (uint16_t) for compact encoding
        uint16_t battMV = static_cast<uint16_t>(tel.batteryVoltage * 1000.0f);
        pushU16LE(frame, battMV);                              // 2 bytes

        const std::size_t payloadBytes = frame.size() - payloadStart;
        if (payloadBytes != FrameConstants::TELEMETRY_PAYLOAD_SIZE)
            throw std::runtime_error("Internal encoder error: payload size mismatch.");

        // ── CRC-16 checksum ───────────────────────────────────────────────────
        uint16_t crc = crc16(frame.data(), frame.size());
        pushU16LE(frame, crc);

        return frame;
    }

    // ── CRC-16/CCITT-FALSE ────────────────────────────────────────────────────
    /**
     * CRC-16 with polynomial 0x1021, initial value 0xFFFF, no input/output
     * reflection (CCITT-FALSE variant).  This is a well-known and easily
     * verifiable algorithm suitable for educational embedded communication.
     */
    static uint16_t crc16(const uint8_t* data, std::size_t length) {
        uint16_t crc = 0xFFFF;
        for (std::size_t i = 0; i < length; ++i) {
            crc ^= (static_cast<uint16_t>(data[i]) << 8);
            for (int b = 0; b < 8; ++b) {
                if (crc & 0x8000)
                    crc = static_cast<uint16_t>((crc << 1) ^ 0x1021);
                else
                    crc = static_cast<uint16_t>(crc << 1);
            }
        }
        return crc;
    }

private:
    // ── Little-endian serialisation helpers ───────────────────────────────────
    static void pushU16LE(std::vector<uint8_t>& buf, uint16_t v) {
        buf.push_back(static_cast<uint8_t>(v & 0xFF));
        buf.push_back(static_cast<uint8_t>((v >> 8) & 0xFF));
    }

    static void pushU32LE(std::vector<uint8_t>& buf, uint32_t v) {
        buf.push_back(static_cast<uint8_t>(v        & 0xFF));
        buf.push_back(static_cast<uint8_t>((v >>  8) & 0xFF));
        buf.push_back(static_cast<uint8_t>((v >> 16) & 0xFF));
        buf.push_back(static_cast<uint8_t>((v >> 24) & 0xFF));
    }

    static void pushU64LE(std::vector<uint8_t>& buf, uint64_t v) {
        pushU32LE(buf, static_cast<uint32_t>(v & 0xFFFFFFFF));
        pushU32LE(buf, static_cast<uint32_t>((v >> 32) & 0xFFFFFFFF));
    }

    static void pushFloatLE(std::vector<uint8_t>& buf, float v) {
        // Reinterpret float as uint32_t for byte extraction without UB
        uint32_t bits;
        std::memcpy(&bits, &v, sizeof(bits));
        pushU32LE(buf, bits);
    }
};

} // namespace TruckPulse
