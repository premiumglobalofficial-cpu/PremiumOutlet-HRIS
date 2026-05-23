/**
 * Haversine formula — calculates the great-circle distance between two points on Earth.
 * Returns distance in meters.
 */
function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

export function getDistanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Checks if a position is within a geofence.
 */
export function isWithinGeofence(
    userLat: number,
    userLng: number,
    fenceLat: number,
    fenceLng: number,
    radiusMeters: number
): { within: boolean; distanceMeters: number } {
    const d = getDistanceMeters(userLat, userLng, fenceLat, fenceLng);
    return { within: d <= radiusMeters, distanceMeters: Math.round(d) };
}
