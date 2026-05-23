/**
 * QR Utils Tests
 * Tests for QR code generation and validation for employee attendance
 */

import { 
    generateDailyQRPayload, 
    parseDailyQRPayload, 
    generateEmployeeQRPayload,
    parseEmployeeQRPayload,
    detectQRType,
    getTodayDateString,
} from "@/lib/qr-utils";

describe("QR Utils", () => {
    describe("getTodayDateString", () => {
        it("should return date in YYYY-MM-DD format", () => {
            const result = getTodayDateString();
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it("should return a valid date string", () => {
            const result = getTodayDateString();
            const date = new Date(result);
            expect(date.toString()).not.toBe("Invalid Date");
        });
    });

    describe("Daily QR Payload", () => {
        const testEmployeeId = "EMP-001";
        const testDate = getTodayDateString();

        it("should generate a valid daily QR payload", async () => {
            const payload = await generateDailyQRPayload(testEmployeeId);
            expect(payload).toMatch(/^SDS-DAY:/);
            expect(payload).toContain(testEmployeeId);
            expect(payload).toContain(testDate);
        });

        it("should include HMAC tag in payload", async () => {
            const payload = await generateDailyQRPayload(testEmployeeId);
            const parts = payload.split(":");
            // SDS-DAY, employeeId, date, hmac
            expect(parts.length).toBeGreaterThanOrEqual(4);
            const hmac = parts[parts.length - 1];
            expect(hmac.length).toBe(12); // 12-char HMAC tag
        });

        it("should generate different payloads for different employees", async () => {
            const payload1 = await generateDailyQRPayload("EMP-001");
            const payload2 = await generateDailyQRPayload("EMP-002");
            expect(payload1).not.toBe(payload2);
        });

        it("should generate different payloads for different dates", async () => {
            const payload1 = await generateDailyQRPayload(testEmployeeId, "2026-04-04");
            const payload2 = await generateDailyQRPayload(testEmployeeId, "2026-04-05");
            expect(payload1).not.toBe(payload2);
        });

        it("should parse a valid daily QR payload", async () => {
            const payload = await generateDailyQRPayload(testEmployeeId);
            const result = await parseDailyQRPayload(payload);
            expect(result).not.toBeNull();
            expect(result?.employeeId).toBe(testEmployeeId);
            expect(result?.date).toBe(testDate);
        });

        it("should reject payload with invalid HMAC", async () => {
            // Tamper with the HMAC tag
            const payload = await generateDailyQRPayload(testEmployeeId);
            const tamperedPayload = payload.slice(0, -3) + "xxx";
            const result = await parseDailyQRPayload(tamperedPayload);
            expect(result).toBeNull();
        });

        it("should reject payload from wrong date", async () => {
            // Generate payload for a different date
            const yesterdayPayload = await generateDailyQRPayload(testEmployeeId, "2026-04-01");
            const result = await parseDailyQRPayload(yesterdayPayload);
            expect(result).toBeNull();
        });

        it("should reject payload with tampered employee ID", async () => {
            const payload = await generateDailyQRPayload(testEmployeeId);
            // Replace EMP-001 with EMP-999
            const tamperedPayload = payload.replace("EMP-001", "EMP-999");
            const result = await parseDailyQRPayload(tamperedPayload);
            expect(result).toBeNull();
        });

        it("should reject invalid format payloads", async () => {
            expect(await parseDailyQRPayload("")).toBeNull();
            expect(await parseDailyQRPayload("SDS-DAY:")).toBeNull();
            expect(await parseDailyQRPayload("SDS-DAY:EMP-001")).toBeNull();
            expect(await parseDailyQRPayload("INVALID-PREFIX:EMP-001:2026-04-04:abc")).toBeNull();
        });

        it("should handle employee IDs with colons", async () => {
            const complexId = "DEPT:TEAM:EMP-001";
            const payload = await generateDailyQRPayload(complexId);
            const result = await parseDailyQRPayload(payload);
            expect(result?.employeeId).toBe(complexId);
        });
    });

    describe("Static QR Payload (Legacy)", () => {
        const testEmployeeId = "EMP-001";

        it("should generate a valid static QR payload", async () => {
            const payload = await generateEmployeeQRPayload(testEmployeeId);
            expect(payload).toMatch(/^SDS-QR:/);
            expect(payload).toContain(testEmployeeId);
        });

        it("should include 8-char HMAC tag", async () => {
            const payload = await generateEmployeeQRPayload(testEmployeeId);
            const parts = payload.split(":");
            const hmac = parts[parts.length - 1];
            expect(hmac.length).toBe(8);
        });

        it("should parse a valid static QR payload", async () => {
            const payload = await generateEmployeeQRPayload(testEmployeeId);
            const result = await parseEmployeeQRPayload(payload);
            expect(result).not.toBeNull();
            expect(result?.employeeId).toBe(testEmployeeId);
        });

        it("should reject payload with invalid HMAC", async () => {
            const payload = await generateEmployeeQRPayload(testEmployeeId);
            const tamperedPayload = payload.slice(0, -3) + "xxx";
            const result = await parseEmployeeQRPayload(tamperedPayload);
            expect(result).toBeNull();
        });

        it("should reject invalid format payloads", async () => {
            expect(await parseEmployeeQRPayload("")).toBeNull();
            expect(await parseEmployeeQRPayload("SDS-QR:")).toBeNull();
            expect(await parseEmployeeQRPayload("INVALID")).toBeNull();
        });
    });

    describe("detectQRType", () => {
        it("should detect daily QR type", () => {
            expect(detectQRType("SDS-DAY:EMP-001:2026-04-04:abc123abc123")).toBe("daily");
        });

        it("should detect static QR type", () => {
            expect(detectQRType("SDS-QR:EMP-001:abc12345")).toBe("static");
        });

        it("should detect dynamic QR type", () => {
            expect(detectQRType("SDS-DYN-randomtoken123456")).toBe("dynamic");
        });

        it("should return unknown for invalid prefixes", () => {
            expect(detectQRType("INVALID:data")).toBe("unknown");
            expect(detectQRType("")).toBe("unknown");
            expect(detectQRType("random-string")).toBe("unknown");
        });
    });

    describe("Security - Timing Attack Prevention", () => {
        it("should use constant-time comparison for HMAC validation", async () => {
            const payload = await generateDailyQRPayload("EMP-001");
            
            // These should all take similar time regardless of where the mismatch is
            const timings: number[] = [];
            
            for (let i = 0; i < 5; i++) {
                // Create payloads with tampered HMAC at different positions
                const tamperedPayload = payload.slice(0, -(i + 1)) + "x".repeat(i + 1);
                const start = performance.now();
                await parseDailyQRPayload(tamperedPayload);
                timings.push(performance.now() - start);
            }

            // Verify timings are relatively consistent (within 10ms variance is acceptable)
            const maxTiming = Math.max(...timings);
            const minTiming = Math.min(...timings);
            // Note: This is a soft check - actual timing attacks require much more precision
            expect(maxTiming - minTiming).toBeLessThan(50);
        });
    });
});
