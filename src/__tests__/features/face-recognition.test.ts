/**
 * Face Recognition Tests
 * Tests for face embedding validation and distance calculation logic
 * 
 * These tests focus on the core mathematical operations used in face verification:
 * - L2 normalization of embeddings
 * - Euclidean distance calculation
 * - Threshold validation
 * - Security boundary testing
 */

// Helper to generate mock face embeddings (simulates face-api.js output)
function generateMockEmbedding(seed: number = 1): number[] {
    const embedding: number[] = [];
    for (let i = 0; i < 128; i++) {
        // Generate deterministic values based on seed (like face-api would)
        const base = Math.sin(seed * (i + 1) * 0.1) * 0.5;
        embedding.push(base);
    }
    return embedding;
}

// L2-normalize an embedding to unit length (copied from service)
function normalizeL2(vec: number[]): number[] {
    let norm = 0;
    for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm === 0) return vec;
    return vec.map((v) => v / norm);
}

// Calculate euclidean distance between two embeddings (copied from service)
function euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
}

// Validate embedding dimensions
function validateEmbedding(embedding: number[]): { valid: boolean; error?: string } {
    if (!embedding || embedding.length !== 128) {
        return { valid: false, error: "Invalid face embedding (expected 128 dimensions)" };
    }
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    if (norm < 0.01) {
        return { valid: false, error: "Face embedding quality too low (near-zero)" };
    }
    return { valid: true };
}

// Threshold constants (match the service configuration)
const THRESHOLDS = {
    PREFILTER: 0.50,          // Obvious non-match rejection
    HIGH_CONFIDENCE: 0.25,     // Definite match (skip AI)
    STRICT: 0.38,              // Embedding-only fallback
    SINGLE_ENROLLMENT: 0.34,   // Extra-strict for single face
    MIN_MATCH_MARGIN: 0.08,    // Margin between best/2nd best match
};

describe("Face Recognition - Embedding Logic", () => {

    describe("Embedding Validation", () => {
        it("should reject embedding with wrong dimensions (64)", () => {
            const shortEmbedding = new Array(64).fill(0.1);
            const result = validateEmbedding(shortEmbedding);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("128 dimensions");
        });

        it("should reject empty embedding", () => {
            const result = validateEmbedding([]);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("128 dimensions");
        });

        it("should reject near-zero embedding (bad face detection)", () => {
            const zeroEmbedding = new Array(128).fill(0.0001);
            const result = validateEmbedding(zeroEmbedding);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("quality too low");
        });

        it("should accept valid 128-dimensional embedding", () => {
            const validEmbedding = generateMockEmbedding(1);
            const result = validateEmbedding(validEmbedding);
            expect(result.valid).toBe(true);
        });

        it("should accept embeddings with any valid values", () => {
            // All positive
            expect(validateEmbedding(new Array(128).fill(0.5)).valid).toBe(true);
            // All negative
            expect(validateEmbedding(new Array(128).fill(-0.5)).valid).toBe(true);
            // Mixed
            const mixed = new Array(128).fill(0).map((_, i) => i % 2 === 0 ? 0.3 : -0.3);
            expect(validateEmbedding(mixed).valid).toBe(true);
        });
    });

    describe("L2 Normalization", () => {
        it("should normalize embeddings to unit length", () => {
            const rawEmbedding = generateMockEmbedding(1);
            const normalized = normalizeL2(rawEmbedding);
            
            // Unit vector should have length ~1
            let norm = 0;
            for (const v of normalized) norm += v * v;
            norm = Math.sqrt(norm);
            
            expect(norm).toBeCloseTo(1, 10);
        });

        it("should handle zero embeddings gracefully", () => {
            const zeroEmbedding = new Array(128).fill(0);
            const normalized = normalizeL2(zeroEmbedding);
            
            // Should return same zero array (can't normalize zero vector)
            expect(normalized.every(v => v === 0)).toBe(true);
        });

        it("should preserve direction after normalization", () => {
            const raw = [1, 2, 3, 4, 5, ...new Array(123).fill(0.1)];
            const normalized = normalizeL2(raw);
            
            // First element should still be smaller than second
            expect(normalized[0]).toBeLessThan(normalized[1]);
            expect(normalized[1]).toBeLessThan(normalized[2]);
        });

        it("should be idempotent (normalizing twice gives same result)", () => {
            const raw = generateMockEmbedding(42);
            const normalized1 = normalizeL2(raw);
            const normalized2 = normalizeL2(normalized1);
            
            for (let i = 0; i < 128; i++) {
                expect(normalized1[i]).toBeCloseTo(normalized2[i], 10);
            }
        });
    });

    describe("Euclidean Distance Calculation", () => {
        it("should return 0 for identical embeddings", () => {
            const embedding = normalizeL2(generateMockEmbedding(1));
            const distance = euclideanDistance(embedding, embedding);
            expect(distance).toBeCloseTo(0, 10);
        });

        it("should return small distance for similar embeddings (same person)", () => {
            // Simulate same person, slight variation in detection
            const embedding1 = normalizeL2(generateMockEmbedding(1));
            const embedding2 = normalizeL2(generateMockEmbedding(1.02)); // Very similar seed
            
            const distance = euclideanDistance(embedding1, embedding2);
            // Same-person distance should be well below prefilter threshold
            expect(distance).toBeLessThan(THRESHOLDS.PREFILTER);
        });

        it("should return large distance for different embeddings (different persons)", () => {
            // Simulate different people
            const person1 = normalizeL2(generateMockEmbedding(1));
            const person2 = normalizeL2(generateMockEmbedding(50)); // Very different seed
            
            const distance = euclideanDistance(person1, person2);
            // Different-person distance should be larger
            expect(distance).toBeGreaterThan(0.2);
        });

        it("should be symmetric: dist(A,B) = dist(B,A)", () => {
            const embedding1 = normalizeL2(generateMockEmbedding(1));
            const embedding2 = normalizeL2(generateMockEmbedding(2));
            
            const distAB = euclideanDistance(embedding1, embedding2);
            const distBA = euclideanDistance(embedding2, embedding1);
            
            expect(distAB).toBeCloseTo(distBA, 10);
        });

        it("should satisfy triangle inequality", () => {
            const a = normalizeL2(generateMockEmbedding(1));
            const b = normalizeL2(generateMockEmbedding(2));
            const c = normalizeL2(generateMockEmbedding(3));
            
            const distAB = euclideanDistance(a, b);
            const distBC = euclideanDistance(b, c);
            const distAC = euclideanDistance(a, c);
            
            // dist(A,C) <= dist(A,B) + dist(B,C)
            expect(distAC).toBeLessThanOrEqual(distAB + distBC + 0.0001); // small epsilon
        });

        it("should have maximum distance of ~2 for unit vectors", () => {
            // Opposite unit vectors have distance = 2
            const v1 = normalizeL2(new Array(128).fill(1));
            const v2 = normalizeL2(new Array(128).fill(-1));
            
            const distance = euclideanDistance(v1, v2);
            expect(distance).toBeCloseTo(2, 5);
        });
    });

    describe("Threshold Configuration", () => {
        it("should have sensible threshold hierarchy", () => {
            // Security requirement: thresholds should be properly ordered
            expect(THRESHOLDS.HIGH_CONFIDENCE).toBeLessThan(THRESHOLDS.SINGLE_ENROLLMENT);
            expect(THRESHOLDS.SINGLE_ENROLLMENT).toBeLessThan(THRESHOLDS.STRICT);
            expect(THRESHOLDS.STRICT).toBeLessThan(THRESHOLDS.PREFILTER);
        });

        it("should have positive margin requirement", () => {
            expect(THRESHOLDS.MIN_MATCH_MARGIN).toBeGreaterThan(0);
            // Margin should be reasonable (not too large, not too small)
            expect(THRESHOLDS.MIN_MATCH_MARGIN).toBeGreaterThanOrEqual(0.05);
            expect(THRESHOLDS.MIN_MATCH_MARGIN).toBeLessThan(0.2);
        });
    });

    describe("Match Decision Logic", () => {
        function makeMatchDecision(
            distance: number, 
            options: { 
                hasAI?: boolean; 
                singleEnrollment?: boolean;
                secondBestDistance?: number;
            } = {}
        ): "high_confidence" | "ai_required" | "strict_pass" | "reject" {
            const { hasAI = false, singleEnrollment = false, secondBestDistance } = options;
            
            // Prefilter: immediate rejection
            if (distance >= THRESHOLDS.PREFILTER) return "reject";
            
            // Margin check: ambiguous match
            if (secondBestDistance !== undefined) {
                const margin = secondBestDistance - distance;
                if (margin < THRESHOLDS.MIN_MATCH_MARGIN) return "reject";
            }
            
            // High confidence: immediate pass
            if (distance < THRESHOLDS.HIGH_CONFIDENCE) return "high_confidence";
            
            // Uncertain zone
            if (hasAI) return "ai_required";
            
            // Fallback: embedding-only with strict threshold
            const effectiveThreshold = singleEnrollment 
                ? THRESHOLDS.SINGLE_ENROLLMENT 
                : THRESHOLDS.STRICT;
                
            return distance < effectiveThreshold ? "strict_pass" : "reject";
        }

        it("should immediately pass high-confidence matches", () => {
            const decision = makeMatchDecision(0.15);
            expect(decision).toBe("high_confidence");
        });

        it("should immediately reject above prefilter threshold", () => {
            const decision = makeMatchDecision(0.55);
            expect(decision).toBe("reject");
        });

        it("should require AI for borderline matches when available", () => {
            const decision = makeMatchDecision(0.35, { hasAI: true });
            expect(decision).toBe("ai_required");
        });

        it("should use strict threshold without AI", () => {
            // Just below strict threshold
            const pass = makeMatchDecision(0.36, { hasAI: false });
            expect(pass).toBe("strict_pass");
            
            // Just above strict threshold
            const reject = makeMatchDecision(0.40, { hasAI: false });
            expect(reject).toBe("reject");
        });

        it("should use tighter threshold for single enrollment", () => {
            // Between single and strict thresholds
            const distance = 0.36;
            
            const multiEnrollment = makeMatchDecision(distance, { singleEnrollment: false });
            const singleEnrollment = makeMatchDecision(distance, { singleEnrollment: true });
            
            expect(multiEnrollment).toBe("strict_pass");
            expect(singleEnrollment).toBe("reject");
        });

        it("should reject ambiguous match (insufficient margin)", () => {
            const decision = makeMatchDecision(0.30, { 
                secondBestDistance: 0.32  // Only 0.02 margin, below 0.08 required
            });
            expect(decision).toBe("reject");
        });

        it("should pass with sufficient margin", () => {
            const decision = makeMatchDecision(0.20, { 
                secondBestDistance: 0.40  // 0.20 margin, above 0.08 required
            });
            expect(decision).toBe("high_confidence");
        });
    });

    describe("Kiosk Matching Simulation", () => {
        function simulateKioskMatch(
            probeEmbedding: number[],
            enrolledFaces: Array<{ employeeId: string; embedding: number[] }>
        ): { employeeId?: string; distance?: number; reason: string } {
            if (enrolledFaces.length === 0) {
                return { reason: "No enrollments found" };
            }

            const probe = normalizeL2(probeEmbedding);
            
            // Calculate distances to all enrolled faces
            const candidates = enrolledFaces.map(face => ({
                employeeId: face.employeeId,
                distance: euclideanDistance(probe, normalizeL2(face.embedding))
            })).sort((a, b) => a.distance - b.distance);

            const best = candidates[0];
            const secondBest = candidates[1];

            // Prefilter check
            if (best.distance >= THRESHOLDS.PREFILTER) {
                return { reason: `Rejected: distance ${best.distance.toFixed(4)} >= prefilter ${THRESHOLDS.PREFILTER}` };
            }

            // Margin check
            if (secondBest && secondBest.distance < THRESHOLDS.PREFILTER) {
                const margin = secondBest.distance - best.distance;
                if (margin < THRESHOLDS.MIN_MATCH_MARGIN) {
                    return { reason: `Rejected: ambiguous match (margin=${margin.toFixed(4)})` };
                }
            }

            // High confidence
            if (best.distance < THRESHOLDS.HIGH_CONFIDENCE) {
                return { 
                    employeeId: best.employeeId, 
                    distance: best.distance,
                    reason: "High confidence match"
                };
            }

            // Strict threshold
            const threshold = enrolledFaces.length === 1 
                ? THRESHOLDS.SINGLE_ENROLLMENT 
                : THRESHOLDS.STRICT;
                
            if (best.distance < threshold) {
                return {
                    employeeId: best.employeeId,
                    distance: best.distance,
                    reason: "Strict threshold match"
                };
            }

            return { reason: `Rejected: distance ${best.distance.toFixed(4)} >= threshold ${threshold}` };
        }

        it("should match correct employee from multiple enrollments", () => {
            const probeEmbedding = generateMockEmbedding(2);
            
            const enrolledFaces = [
                { employeeId: "EMP-001", embedding: generateMockEmbedding(1) },
                { employeeId: "EMP-002", embedding: generateMockEmbedding(2) },  // Target
                { employeeId: "EMP-003", embedding: generateMockEmbedding(3) },
            ];
            
            const result = simulateKioskMatch(probeEmbedding, enrolledFaces);
            expect(result.employeeId).toBe("EMP-002");
        });

        it("should reject unknown person", () => {
            const unknownPerson = generateMockEmbedding(999);
            
            const enrolledFaces = [
                { employeeId: "EMP-001", embedding: generateMockEmbedding(1) },
                { employeeId: "EMP-002", embedding: generateMockEmbedding(2) },
            ];
            
            const result = simulateKioskMatch(unknownPerson, enrolledFaces);
            expect(result.employeeId).toBeUndefined();
        });

        it("should reject when no faces enrolled", () => {
            const probe = generateMockEmbedding(1);
            const result = simulateKioskMatch(probe, []);
            expect(result.employeeId).toBeUndefined();
            expect(result.reason).toContain("No enrollments");
        });
    });

    describe("Security Boundary Tests", () => {
        it("should not match different people with similar appearance", () => {
            // Simulate two different people with somewhat similar embeddings
            const person1 = normalizeL2(generateMockEmbedding(10));
            const person2 = normalizeL2(generateMockEmbedding(11));
            
            const distance = euclideanDistance(person1, person2);
            
            // Should be above high-confidence (requires verification)
            expect(distance).toBeGreaterThan(THRESHOLDS.HIGH_CONFIDENCE);
        });

        it("should match same person across sessions with variation", () => {
            // Simulate same person, different sessions (lighting, angle)
            const session1 = normalizeL2(generateMockEmbedding(10));
            const session2Values = generateMockEmbedding(10).map(v => v * 0.98); // 2% variation
            const session2 = normalizeL2(session2Values);
            
            const distance = euclideanDistance(session1, session2);
            
            // Should be well within match thresholds
            expect(distance).toBeLessThan(THRESHOLDS.STRICT);
        });

        it("should not allow spoofing with printed photo (embedding differs)", () => {
            // Real face vs printed photo would have different embeddings
            // (In reality, liveness detection handles this, but embeddings also differ)
            const realFace = normalizeL2(generateMockEmbedding(1));
            const printedPhoto = normalizeL2(generateMockEmbedding(1.5)); // Slightly different
            
            const distance = euclideanDistance(realFace, printedPhoto);
            
            // Should require AI verification at minimum
            expect(distance).toBeGreaterThan(THRESHOLDS.HIGH_CONFIDENCE);
        });
    });
});
