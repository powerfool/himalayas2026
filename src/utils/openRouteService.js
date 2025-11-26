/**
 * OpenRouteService API integration for routing and geocoding
 */

const ORS_API_BASE = 'https://api.openrouteservice.org/v2';

// Default routing profile for Himalayan routes
// Valid profiles: 'driving-car', 'driving-hgv', 'cycling-regular', 'cycling-road', 
// 'cycling-mountain', 'cycling-electric', 'foot-walking', 'foot-hiking', 'wheelchair'
export const DEFAULT_ROUTING_PROFILE = 'driving-car';

/**
 * Get OpenRouteService API key from environment variable
 * Get your free API key from: https://openrouteservice.org/dev/#/signup
 */
function getORSAPIKey() {
  const apiKey = import.meta.env.VITE_ORS_API_KEY;
  
  if (!apiKey) {
    // Fallback to demo key (may have rate limits)
    console.warn('VITE_ORS_API_KEY not set. Using demo key (may have rate limits). Get your free key at https://openrouteservice.org/dev/#/signup');
    return '5b3ce3597851110001cf6248e77b1b7896f64ec9baa4675982c65e35';
  }
  
  return apiKey;
}

/**
 * Geocode a location name to coordinates using Nominatim (OpenStreetMap)
 * Returns all candidates for ambiguity resolution
 * @param {string} locationName - Name of the location
 * @param {string} countryCode - Optional country code (e.g., 'IN' for India)
 * @param {number} limit - Maximum number of candidates to return (default: 5)
 * @returns {Promise<{candidates: Array<{lat: number, lng: number, display_name: string, importance: number}>}>}
 */
export async function geocodeLocation(locationName, countryCode = 'IN', limit = 5) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName + ', ' + countryCode)}&limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HimalayasRouteVisualizer/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      return { candidates: [] };
    }

    // Return all candidates with their details
    const candidates = data.map(result => ({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      display_name: result.display_name,
      importance: result.importance || 0,
      type: result.type || '',
      class: result.class || ''
    }));

    return { candidates };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * Calculate route between two waypoints using OpenRouteService
 * @param {Object} from - Starting waypoint {lat, lng}
 * @param {Object} to - Ending waypoint {lat, lng}
 * @param {string} profile - Route profile (default: 'driving-car')
 *   Valid profiles: 'driving-car', 'driving-hgv', 'cycling-regular', 'cycling-road', 
 *   'cycling-mountain', 'cycling-electric', 'foot-walking', 'foot-hiking', 'wheelchair'
 * @returns {Promise<{polyline: Array<[number, number]>, distance: number, duration: number}>} Segment data
 */
export async function calculateRoute(from, to, profile = DEFAULT_ROUTING_PROFILE) {
  if (!from || !to) {
    throw new Error('Both from and to waypoints are required');
  }

  try {
    // Convert waypoints to ORS format (coordinates as [lng, lat])
    const coordinates = [[from.lng, from.lat], [to.lng, to.lat]];

    const url = `${ORS_API_BASE}/directions/${profile}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getORSAPIKey()
      },
      body: JSON.stringify({
        coordinates,
        format: 'geojson'
      })
    });
    
    console.log('OpenRouteService request:', { url, coordinates, profile });
    console.log('OpenRouteService response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouteService API error:', response.status, errorText);
      throw new Error(`Routing failed (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      console.error('No route features in response:', data);
      throw new Error('No route found between these waypoints');
    }

    // Extract coordinates from GeoJSON LineString
    const coordinatesArray = data.features[0].geometry.coordinates;
    
    // Convert from [lng, lat] to [lat, lng] for Leaflet
    const polyline = coordinatesArray.map(coord => [coord[1], coord[0]]);
    
    // Extract distance and duration from route properties
    const properties = data.features[0].properties || {};
    const distance = properties.segments?.[0]?.distance || 0; // meters
    const duration = properties.segments?.[0]?.duration || 0; // seconds
    
    return {
      polyline,
      distance,
      duration
    };
  } catch (error) {
    console.error('Routing error:', error);
    throw error;
  }
}

/**
 * Calculate route segments between consecutive waypoints
 * @param {Array<{id: string, lat: number, lng: number}>} waypoints - Array of waypoints with IDs
 * @param {string} profile - Route profile (default: 'driving-motorcycle')
 * @param {Function} onProgress - Optional progress callback: (current, total) => void
 * @returns {Promise<Array<{fromWaypointId: string, toWaypointId: string, polyline: Array, distance: number, duration: number}>>} Array of segments
 */
export async function calculateRouteSegments(waypoints, profile = DEFAULT_ROUTING_PROFILE, onProgress = null) {
  if (!waypoints || waypoints.length < 2) {
    throw new Error('At least 2 waypoints are required');
  }

  const segments = [];
  const errors = [];
  const totalSegments = waypoints.length - 1;

  for (let i = 0; i < totalSegments; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    
    // Update progress
    if (onProgress) {
      onProgress(i + 1, totalSegments);
    }
    
    try {
      const segmentData = await calculateRoute(from, to, profile);
      segments.push({
        fromWaypointId: from.id || from.order?.toString() || i.toString(),
        toWaypointId: to.id || to.order?.toString() || (i + 1).toString(),
        polyline: segmentData.polyline,
        distance: segmentData.distance,
        duration: segmentData.duration
      });
    } catch (error) {
      console.warn(`Failed to calculate route segment ${i} → ${i + 1}:`, error);
      errors.push({
        from: from.name || `Waypoint ${i + 1}`,
        to: to.name || `Waypoint ${i + 2}`,
        error: error.message
      });
      // Continue with other segments even if one fails
    }
  }

  if (segments.length === 0 && errors.length > 0) {
    throw new Error(`All route segments failed. First error: ${errors[0].error}`);
  }

  return segments;
}

/**
 * Geocode multiple locations
 * Returns candidates for each location (for ambiguity resolution)
 * @param {Array<string>} locationNames - Array of location names
 * @returns {Promise<Array<{name: string, candidates: Array}>>}
 */
export async function geocodeMultipleLocations(locationNames) {
  const results = [];
  
  for (const name of locationNames) {
    try {
      const geocoded = await geocodeLocation(name);
      results.push({
        name,
        candidates: geocoded.candidates || []
      });
      // Add delay to respect Nominatim rate limits (1 request/second)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn(`Failed to geocode ${name}:`, error);
      // Continue with other locations even if one fails
      results.push({
        name,
        candidates: []
      });
    }
  }
  
  return results;
}


