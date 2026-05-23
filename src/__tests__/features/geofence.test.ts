/**
 * Geofence Tests
 * Tests for GPS location validation and distance calculation
 */

import { getDistanceMeters, isWithinGeofence } from "@/lib/geofence";

describe("Geofence Utilities", () => {
    // Test coordinates (Manila area for PH context)
    const MAKATI_CENTER = { lat: 14.5547, lng: 121.0244 }; // Ayala Center, Makati
    const BGC = { lat: 14.5515, lng: 121.0507 }; // BGC (about 2.8km from Ayala)
    const ORTIGAS = { lat: 14.5874, lng: 121.0615 }; // Ortigas Center (about 5.2km from Ayala)
    const QUEZON_CITY = { lat: 14.6760, lng: 121.0437 }; // Quezon City (about 13.5km from Ayala)

    describe("getDistanceMeters", () => {
        it("should return 0 for same coordinates", () => {
            const distance = getDistanceMeters(
                MAKATI_CENTER.lat, MAKATI_CENTER.lng,
                MAKATI_CENTER.lat, MAKATI_CENTER.lng
            );
            expect(distance).toBe(0);
        });

        it("should calculate distance between Makati and BGC (~2.8km)", () => {
            const distance = getDistanceMeters(
                MAKATI_CENTER.lat, MAKATI_CENTER.lng,
                BGC.lat, BGC.lng
            );
            // BGC is approximately 2.8km from Ayala Center
            expect(distance).toBeGreaterThan(2500);
            expect(distance).toBeLessThan(3200);
        });

        it("should calculate distance between Makati and Ortigas (~5.2km)", () => {
            const distance = getDistanceMeters(
                MAKATI_CENTER.lat, MAKATI_CENTER.lng,
                ORTIGAS.lat, ORTIGAS.lng
            );
            // Ortigas is approximately 5.2km from Ayala Center
            expect(distance).toBeGreaterThan(4800);
            expect(distance).toBeLessThan(5800);
        });

        it("should calculate distance between Makati and QC (~13.5km)", () => {
            const distance = getDistanceMeters(
                MAKATI_CENTER.lat, MAKATI_CENTER.lng,
                QUEZON_CITY.lat, QUEZON_CITY.lng
            );
            // QC is approximately 13.5km from Ayala Center
            expect(distance).toBeGreaterThan(13000);
            expect(distance).toBeLessThan(14500);
        });

        it("should be symmetric (A to B = B to A)", () => {
            const distanceAB = getDistanceMeters(
                MAKATI_CENTER.lat, MAKATI_CENTER.lng,
                BGC.lat, BGC.lng
            );
            const distanceBA = getDistanceMeters(
                BGC.lat, BGC.lng,
                MAKATI_CENTER.lat, MAKATI_CENTER.lng
            );
            expect(distanceAB).toBe(distanceBA);
        });

        it("should handle small distances accurately (<100m)", () => {
            // Two points ~50 meters apart
            const point1 = { lat: 14.5547, lng: 121.0244 };
            const point2 = { lat: 14.5551, lng: 121.0244 }; // ~45m north
            
            const distance = getDistanceMeters(
                point1.lat, point1.lng,
                point2.lat, point2.lng
            );
            expect(distance).toBeGreaterThan(30);
            expect(distance).toBeLessThan(70);
        });

        it("should handle negative coordinates (Southern/Western hemispheres)", () => {
            // Sydney, Australia
            const sydney = { lat: -33.8688, lng: 151.2093 };
            // Melbourne, Australia  
            const melbourne = { lat: -37.8136, lng: 144.9631 };
            
            const distance = getDistanceMeters(
                sydney.lat, sydney.lng,
                melbourne.lat, melbourne.lng
            );
            // Sydney to Melbourne is approximately 714km
            expect(distance).toBeGreaterThan(700000);
            expect(distance).toBeLessThan(720000);
        });

        it("should calculate trans-equatorial distances correctly", () => {
            // Singapore (just north of equator)
            const singapore = { lat: 1.3521, lng: 103.8198 };
            // Jakarta (just south of equator)
            const jakarta = { lat: -6.2088, lng: 106.8456 };
            
            const distance = getDistanceMeters(
                singapore.lat, singapore.lng,
                jakarta.lat, jakarta.lng
            );
            // Singapore to Jakarta is approximately 896km
            expect(distance).toBeGreaterThan(850000);
            expect(distance).toBeLessThan(950000);
        });
    });

    describe("isWithinGeofence", () => {
        const siteLocation = MAKATI_CENTER;
        
        it("should return within=true when at exact site location", () => {
            const result = isWithinGeofence(
                siteLocation.lat, siteLocation.lng,
                siteLocation.lat, siteLocation.lng,
                100 // 100m radius
            );
            expect(result.within).toBe(true);
            expect(result.distanceMeters).toBe(0);
        });

        it("should return within=true when inside geofence radius", () => {
            // Point ~50m from center
            const nearby = { lat: 14.5551, lng: 121.0244 };
            const result = isWithinGeofence(
                nearby.lat, nearby.lng,
                siteLocation.lat, siteLocation.lng,
                100 // 100m radius
            );
            expect(result.within).toBe(true);
            expect(result.distanceMeters).toBeLessThan(100);
        });

        it("should return within=false when outside geofence radius", () => {
            // BGC is ~2.8km away, outside 100m radius
            const result = isWithinGeofence(
                BGC.lat, BGC.lng,
                siteLocation.lat, siteLocation.lng,
                100 // 100m radius
            );
            expect(result.within).toBe(false);
            expect(result.distanceMeters).toBeGreaterThan(2500);
        });

        it("should handle boundary case (exactly at radius)", () => {
            // Create a point exactly at the edge
            // Using a known distance calculation
            const exactDistance = getDistanceMeters(
                siteLocation.lat, siteLocation.lng,
                14.556, 121.0244
            );
            
            const result = isWithinGeofence(
                14.556, 121.0244,
                siteLocation.lat, siteLocation.lng,
                exactDistance // Use exact distance as radius
            );
            expect(result.within).toBe(true); // Should be within (<=)
        });

        it("should round distance to nearest meter", () => {
            const result = isWithinGeofence(
                14.5551, 121.0244,
                siteLocation.lat, siteLocation.lng,
                1000
            );
            // Distance should be a whole number (rounded)
            expect(Number.isInteger(result.distanceMeters)).toBe(true);
        });

        it("should support large geofence radius (site perimeter)", () => {
            // 500m radius - BGC should still be outside
            const result = isWithinGeofence(
                BGC.lat, BGC.lng,
                siteLocation.lat, siteLocation.lng,
                500 // 500m radius
            );
            expect(result.within).toBe(false);
        });

        it("should support very small geofence radius (kiosk proximity)", () => {
            // 10m radius - very tight check
            const veryClose = { lat: 14.55475, lng: 121.0244 }; // ~5m away
            const slightlyFar = { lat: 14.5549, lng: 121.0244 }; // ~22m away
            
            const result1 = isWithinGeofence(
                veryClose.lat, veryClose.lng,
                siteLocation.lat, siteLocation.lng,
                10
            );
            
            const result2 = isWithinGeofence(
                slightlyFar.lat, slightlyFar.lng,
                siteLocation.lat, siteLocation.lng,
                10
            );
            
            expect(result1.within).toBe(true);
            expect(result2.within).toBe(false);
        });

        it("should return correct object structure", () => {
            const result = isWithinGeofence(
                BGC.lat, BGC.lng,
                siteLocation.lat, siteLocation.lng,
                100
            );
            
            expect(result).toHaveProperty("within");
            expect(result).toHaveProperty("distanceMeters");
            expect(typeof result.within).toBe("boolean");
            expect(typeof result.distanceMeters).toBe("number");
        });
    });

    describe("Real-world scenarios", () => {
        it("should validate check-in at office location", () => {
            const officeLocation = { lat: 14.5547, lng: 121.0244 };
            const employeeGPS = { lat: 14.5548, lng: 121.0245 }; // ~15m offset (GPS drift)
            const geofenceRadius = 50; // 50m allowed
            
            const result = isWithinGeofence(
                employeeGPS.lat, employeeGPS.lng,
                officeLocation.lat, officeLocation.lng,
                geofenceRadius
            );
            
            expect(result.within).toBe(true);
        });

        it("should reject check-in from nearby coffee shop", () => {
            const officeLocation = { lat: 14.5547, lng: 121.0244 };
            const coffeeShop = { lat: 14.5562, lng: 121.0252 }; // ~180m away
            const geofenceRadius = 50; // 50m allowed
            
            const result = isWithinGeofence(
                coffeeShop.lat, coffeeShop.lng,
                officeLocation.lat, officeLocation.lng,
                geofenceRadius
            );
            
            expect(result.within).toBe(false);
            expect(result.distanceMeters).toBeGreaterThan(150);
        });

        it("should handle WFH with no location constraint", () => {
            // When no geofence is required, pass a very large radius
            const employeeHome = { lat: 14.6760, lng: 121.0437 }; // QC
            const officeLocation = { lat: 14.5547, lng: 121.0244 }; // Makati
            const noConstraintRadius = 100000; // 100km - effectively no constraint
            
            const result = isWithinGeofence(
                employeeHome.lat, employeeHome.lng,
                officeLocation.lat, officeLocation.lng,
                noConstraintRadius
            );
            
            expect(result.within).toBe(true);
        });

        it("should validate construction site perimeter", () => {
            const siteCenter = { lat: 14.5547, lng: 121.0244 };
            const siteRadius = 200; // 200m site perimeter
            
            // Worker inside site
            const workerInside = { lat: 14.5555, lng: 121.025 }; // ~100m from center
            // Worker just outside site fence
            const workerOutside = { lat: 14.5570, lng: 121.0260 }; // ~300m from center
            
            const insideResult = isWithinGeofence(
                workerInside.lat, workerInside.lng,
                siteCenter.lat, siteCenter.lng,
                siteRadius
            );
            
            const outsideResult = isWithinGeofence(
                workerOutside.lat, workerOutside.lng,
                siteCenter.lat, siteCenter.lng,
                siteRadius
            );
            
            expect(insideResult.within).toBe(true);
            expect(outsideResult.within).toBe(false);
        });
    });

    describe("GPS Accuracy Considerations", () => {
        it("should account for typical GPS accuracy (10-50m)", () => {
            // With GPS accuracy of ~30m, a 50m geofence might reject valid users
            // This test documents the expected behavior
            const officeLocation = { lat: 14.5547, lng: 121.0244 };
            const geofenceRadius = 50;
            
            // User reports being at office but GPS drifted 40m
            const driftedGPS = { lat: 14.5551, lng: 121.0247 }; // ~50m drift
            
            const result = isWithinGeofence(
                driftedGPS.lat, driftedGPS.lng,
                officeLocation.lat, officeLocation.lng,
                geofenceRadius
            );
            
            // This shows why geofence should be larger than GPS accuracy
            // At exactly 50m drift against 50m radius, it's borderline
            expect(result.distanceMeters).toBeLessThan(60);
        });

        it("should recommend appropriate geofence for building entrances (30m+)", () => {
            // Document recommendation: geofence radius should be GPS accuracy + building size
            const entranceLocation = { lat: 14.5547, lng: 121.0244 };
            const recommendedRadius = 30; // 30m minimum for building entrance
            
            // Points at various distances (verified with Haversine calculation)
            const testPoints = [
                { lat: 14.55482, lng: 121.0244, expectedWithin: true },  // ~13m north
                { lat: 14.5549, lng: 121.0244, expectedWithin: true },   // ~22m north  
                { lat: 14.5551, lng: 121.0248, expectedWithin: false },  // ~55m away
            ];
            
            testPoints.forEach(point => {
                const result = isWithinGeofence(
                    point.lat, point.lng,
                    entranceLocation.lat, entranceLocation.lng,
                    recommendedRadius
                );
                expect(result.within).toBe(point.expectedWithin);
            });
        });
    });
});
