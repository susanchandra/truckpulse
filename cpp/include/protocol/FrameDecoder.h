#pragma once
/**
 * FrameDecoder.h
 * Parses a byte vector back into a TelemetryFrame.
 *
 * Every validation step is explicit and returns a typed result with an
 * explanatory reason string rather than throwing.  Callers can then
 * decide whether to log and discard or to escalate the error.
 *
 * Validation sequence:
 *  1. Minimum frame length check         (guards all index accesses)
 *  2. Start marker check                 (0xAA 0x55)
 *  3. Protocol version check             (== 0x01)
 *  4. Message type check                 (must be known type)
 *  5. Payload length field check         (must equal TELEMETRY_PAYLOAD_SIZE)
 *  6. Full frame length check            (header + payload + checksum)
 *  7. CRC-16 checksum verification       (never silently accept corruption)
 *  8. Payload extraction
 */

#include <cstdint>
#include <vector>
#include <string>
#include <cstring>
#include "protocol/TelemetryFrame.h"
#include "protocol/FrameEncoder.h"   // reuses crc16 helper

namespace TruckPulse {

struct DecodeResult {
    bool           ok     = false;
    TelemetryFrame frame  = {};
    std::string    reason = {};   // populated only on failure
};

class FrameDecoder {
public:
    /**
     * Parse and validate the byte vector.
     * @return DecodeResult whose 'ok' field indicates success.
     *         On failure, 'reason' describes the first violated constraint.
     */
    static DecodeResult decode(const std::vector<uint8_t>& raw) {
        DecodeResult result;

        // ── 1. Minimum length ─────────────────────────────────────────────────
        if (raw.size() < FrameConstants::MIN_FRAME_SIZE) {
            result.reason = "Frame too short: "
                + std::to_string(raw.size()) + " bytes (minimum "
                + std::to_string(FrameConstants::MIN_FRAME_SIZE) + ").";
            return result;
        }

        // ── 2. Start marker ───────────────────────────────────────────────────
        if (raw[0] != FrameConstants::START_BYTE_0 ||
            raw[1] != FrameConstants::START_BYTE_1) {
            result.reason = "Invalid start marker: expected 0xAA 0x55.";
            return result;
        }

        // ── 3. Protocol version ───────────────────────────────────────────────
        if (raw[2] != FrameConstants::PROTOCOL_VERSION) {
            result.reason = "Unsupported protocol version: "
                + std::to_string(raw[2]) + " (expected "
                + std::to_string(FrameConstants::PROTOCOL_VERSION) + ").";
            return result;
        }

        // ── 4. Message type ───────────────────────────────────────────────────
        if (raw[3] != FrameConstants::MSG_TELEMETRY) {
            result.reason = "Unknown message type: 0x"
                + toHex(raw[3]) + ".";
            return result;
        }

        // ── 5. Payload length field ───────────────────────────────────────────
        uint16_t payloadLen = readU16LE(raw, 12); // bytes [12,13]
        if (payloadLen != FrameConstants::TELEMETRY_PAYLOAD_SIZE) {
            result.reason = "Unexpected payload length: "
                + std::to_string(payloadLen) + " (expected "
                + std::to_string(FrameConstants::TELEMETRY_PAYLOAD_SIZE) + ").";
            return result;
        }

        // ── 6. Full frame length ──────────────────────────────────────────────
        const std::size_t expectedLen =
            FrameConstants::HEADER_SIZE + payloadLen + FrameConstants::CHECKSUM_SIZE;
        if (raw.size() < expectedLen) {
            result.reason = "Truncated frame: expected "
                + std::to_string(expectedLen) + " bytes, got "
                + std::to_string(raw.size()) + ".";
            return result;
        }

        // ── 7. CRC-16 checksum ────────────────────────────────────────────────
        const std::size_t crcOffset = expectedLen - 2;
        uint16_t storedCRC  = readU16LE(raw, crcOffset);
        uint16_t computedCRC = FrameEncoder::crc16(raw.data(), crcOffset);
        if (storedCRC != computedCRC) {
            result.reason = "Checksum mismatch: stored 0x"
                + toHex16(storedCRC) + ", computed 0x" + toHex16(computedCRC) + ".";
            return result;
        }

        // ── 8. Extract payload ────────────────────────────────────────────────
        TelemetryFrame& f = result.frame;
        f.protocolVersion = raw[2];
        f.messageType     = raw[3];

        // Vehicle ID (8 bytes, bytes [4..11])
        std::memcpy(f.vehicleId, raw.data() + 4,
                    FrameConstants::VEHICLE_ID_FIELD_LEN);

        std::size_t pos = FrameConstants::HEADER_SIZE; // 14
        f.timestamp      = readU64LE(raw, pos); pos += 8;
        f.engineRPM      = readU16LE(raw, pos); pos += 2;
        f.coolantTempC   = readFloatLE(raw, pos); pos += 4;
        f.oilPressurePSI = readFloatLE(raw, pos); pos += 4;
        f.speedKmh       = readFloatLE(raw, pos); pos += 4;
        f.fuelLevelPct   = readFloatLE(raw, pos); pos += 4;
        f.batteryMV      = readU16LE(raw, pos);

        result.ok = true;
        return result;
    }

private:
    static uint16_t readU16LE(const std::vector<uint8_t>& buf, std::size_t offset) {
        return static_cast<uint16_t>(buf[offset])
             | static_cast<uint16_t>(buf[offset + 1] << 8);
    }

    static uint32_t readU32LE(const std::vector<uint8_t>& buf, std::size_t offset) {
        return static_cast<uint32_t>(buf[offset])
             | (static_cast<uint32_t>(buf[offset + 1]) <<  8)
             | (static_cast<uint32_t>(buf[offset + 2]) << 16)
             | (static_cast<uint32_t>(buf[offset + 3]) << 24);
    }

    static uint64_t readU64LE(const std::vector<uint8_t>& buf, std::size_t offset) {
        uint64_t lo = readU32LE(buf, offset);
        uint64_t hi = readU32LE(buf, offset + 4);
        return lo | (hi << 32);
    }

    static float readFloatLE(const std::vector<uint8_t>& buf, std::size_t offset) {
        uint32_t bits = readU32LE(buf, offset);
        float v;
        std::memcpy(&v, &bits, sizeof(v));
        return v;
    }

    static std::string toHex(uint8_t v) {
        char buf[3];
        std::snprintf(buf, sizeof(buf), "%02X", v);
        return std::string(buf);
    }

    static std::string toHex16(uint16_t v) {
        char buf[5];
        std::snprintf(buf, sizeof(buf), "%04X", v);
        return std::string(buf);
    }
};

} // namespace TruckPulse
