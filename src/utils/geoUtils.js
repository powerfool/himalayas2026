/**
 * Geographic utility functions for coordinate calculations
 */

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Calculate a point on the straight line between two coordinates at a specific distance from the 'to' point
 * @param {Object} from - Starting point {lat, lng}
 * @param {Object} to - Ending point {lat, lng}
 * @param {number} distanceFromTo - Distance in meters from 'to' point (toward 'from')
 * @returns {Object} Coordinate {lat, lng} on the line
 */
export function calculatePointOnLine(from, to, distanceFromTo) {
  // Calculate bearing from 'to' to 'from'
  const lat1 = toRadians(to.lat);
  const lng1 = toRadians(to.lng);
  const lat2 = toRadians(from.lat);
  const lng2 = toRadians(from.lng);
  
  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  
  const bearing = Math.atan2(y, x);
  
  // Calculate destination point using bearing and distance
  const R = 6371000; // Earth's radius in meters
  const angularDistance = distanceFromTo / R;
  
  const newLat = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  
  const newLng = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(newLat)
  );
  
  return {
    lat: toDegrees(newLat),
    lng: toDegrees(newLng)
  };
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {number} radians
 * @returns {number} Degrees
 */
function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

