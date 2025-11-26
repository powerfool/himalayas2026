/**
 * OpenRouteService API integration for routing and geocoding
 */

const ORS_API_BASE = 'https://api.openrouteservice.org/v2';
// Using the public demo key - in production, you'd want to use your own API key
const ORS_API_KEY = '5b3ce3597851110001cf6248e77b1b7896f64ec9baa4675982c65e35';

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
 * Calculate route between waypoints using OpenRouteService
 * @param {Array<{lat: number, lng: number}>} waypoints - Array of waypoint coordinates
 * @param {string} profile - Route profile (default: 'driving-motorcycle')
 * @returns {Promise<Array<[number, number]>>} Array of [lng, lat] coordinate pairs
 */
export async function calculateRoute(waypoints, profile = 'driving-motorcycle') {
  if (!waypoints || waypoints.length < 2) {
    throw new Error('At least 2 waypoints are required');
  }

  try {
    // Convert waypoints to ORS format (coordinates as [lng, lat])
    const coordinates = waypoints.map(wp => [wp.lng, wp.lat]);

    const url = `${ORS_API_BASE}/directions/${profile}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ORS_API_KEY
      },
      body: JSON.stringify({
        coordinates,
        format: 'geojson'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Routing failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      throw new Error('No route found');
    }

    // Extract coordinates from GeoJSON LineString
    const coordinatesArray = data.features[0].geometry.coordinates;
    
    // Convert from [lng, lat] to [lat, lng] for Leaflet
    return coordinatesArray.map(coord => [coord[1], coord[0]]);
  } catch (error) {
    console.error('Routing error:', error);
    throw error;
  }
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


