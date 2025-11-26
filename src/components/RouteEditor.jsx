import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getRoute, saveRoute } from '../utils/storage';
import { extractWaypointsWithRetry } from '../utils/anthropicService';
import { geocodeLocation, calculateRoute } from '../utils/openRouteService';
import RouteForm from './RouteForm';
import WaypointEditor from './WaypointEditor';
import MapView from './MapView';
import AmbiguityResolution from './AmbiguityResolution';

/**
 * RouteEditor component - Edit existing route or create new one
 */
export default function RouteEditor({ routeId, onSave, onCancel }) {
  const [routeName, setRouteName] = useState('');
  const [itineraryText, setItineraryText] = useState('');
  const [waypoints, setWaypoints] = useState([]);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isNewRoute, setIsNewRoute] = useState(!routeId);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 });
  const [ambiguityState, setAmbiguityState] = useState(null); // { waypointIndex, waypointName, candidates }

  // Load route data when routeId changes
  useEffect(() => {
    if (routeId) {
      const route = getRoute(routeId);
      if (route) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRouteName(route.name || '');
         
        setItineraryText(route.itineraryText || '');
         
        setWaypoints(route.waypoints || []);
         
        setRoutePolyline(route.routePolyline || []);
         
        setIsNewRoute(false);
      } else {
         
        setError('Route not found');
         
        setIsNewRoute(true);
      }
    } else {
      // New route - initialize with empty UUID
       
      setIsNewRoute(true);
    }
  }, [routeId]);

  const handleParseItinerary = async () => {
    if (!itineraryText.trim()) {
      setError('Please enter itinerary text first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extract waypoints using Anthropic LLM
      const extractedWaypoints = await extractWaypointsWithRetry(itineraryText);
      
      if (extractedWaypoints.length === 0) {
        setError('No waypoints found in the itinerary text. Try adding waypoints manually.');
        setLoading(false);
        return;
      }

      // Convert to waypoint format (without coordinates yet - geocoding happens separately)
      const newWaypoints = extractedWaypoints.map((wp) => ({
        name: wp.name,
        lat: 0,
        lng: 0,
        order: wp.sequence - 1, // Convert 1-based sequence to 0-based order
        context: wp.context || null
      }));
      
      setWaypoints(newWaypoints);
      setLoading(false);
    } catch (err) {
      setError(`Error extracting waypoints: ${err.message}`);
      setLoading(false);
    }
  };

  const handleGeocodeWaypoints = async () => {
    const ungeocoded = waypoints.filter(wp => wp.lat === 0 && wp.lng === 0);
    if (ungeocoded.length === 0) {
      setError('All waypoints are already geocoded');
      return;
    }

    setLoading(true);
    setError(null);
    setGeocodingProgress({ current: 0, total: ungeocoded.length });

    // Geocode waypoints one by one to handle ambiguities
    const updatedWaypoints = [...waypoints];
    
    for (let i = 0; i < ungeocoded.length; i++) {
      const waypoint = ungeocoded[i];
      const waypointIndex = waypoints.findIndex(wp => wp.name === waypoint.name && wp.lat === 0 && wp.lng === 0);
      
      setGeocodingProgress({ current: i + 1, total: ungeocoded.length });
      
      try {
        const result = await geocodeLocation(waypoint.name);
        
        // Check if there are multiple candidates or no candidates
        if (result.candidates.length === 0) {
          // No results - show manual entry option
          setAmbiguityState({
            waypointIndex,
            waypointName: waypoint.name,
            candidates: []
          });
          setLoading(false);
          return; // Wait for user to resolve
        } else if (result.candidates.length === 1) {
          // Single result - use it automatically
          updatedWaypoints[waypointIndex] = {
            ...updatedWaypoints[waypointIndex],
            lat: result.candidates[0].lat,
            lng: result.candidates[0].lng,
            display_name: result.candidates[0].display_name
          };
          setWaypoints([...updatedWaypoints]);
        } else {
          // Multiple candidates - show ambiguity resolution UI
          setAmbiguityState({
            waypointIndex,
            waypointName: waypoint.name,
            candidates: result.candidates
          });
          setLoading(false);
          return; // Wait for user to resolve
        }
        
        // Rate limit: 1 request per second
        if (i < ungeocoded.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error(`Error geocoding ${waypoint.name}:`, err);
        // Show manual entry for failed geocoding
        setAmbiguityState({
          waypointIndex,
          waypointName: waypoint.name,
          candidates: []
        });
        setLoading(false);
        return;
      }
    }

    // All waypoints geocoded successfully
    setLoading(false);
    setGeocodingProgress({ current: 0, total: 0 });
  };

  const handleAmbiguityResolve = (selectedCandidate) => {
    if (!ambiguityState) return;
    
    const updatedWaypoints = [...waypoints];
    updatedWaypoints[ambiguityState.waypointIndex] = {
      ...updatedWaypoints[ambiguityState.waypointIndex],
      lat: selectedCandidate.lat,
      lng: selectedCandidate.lng,
      display_name: selectedCandidate.display_name
    };
    
    setWaypoints(updatedWaypoints);
    setAmbiguityState(null);
    
    // Continue geocoding remaining waypoints using updated list
    const remaining = updatedWaypoints.filter(wp => wp.lat === 0 && wp.lng === 0);
    if (remaining.length > 0) {
      // Use setTimeout to ensure state update is processed
      setTimeout(() => {
        handleGeocodeWaypoints();
      }, 100);
    } else {
      setLoading(false);
      setGeocodingProgress({ current: 0, total: 0 });
    }
  };

  const handleAmbiguitySkip = () => {
    setAmbiguityState(null);
    
    // Continue geocoding remaining waypoints
    const remaining = waypoints.filter(wp => wp.lat === 0 && wp.lng === 0);
    if (remaining.length > 0) {
      // Use setTimeout to ensure state is ready
      setTimeout(() => {
        handleGeocodeWaypoints();
      }, 100);
    } else {
      setLoading(false);
      setGeocodingProgress({ current: 0, total: 0 });
    }
  };

  const handleAmbiguityCancel = () => {
    setAmbiguityState(null);
    setLoading(false);
    setGeocodingProgress({ current: 0, total: 0 });
  };

  const handleCalculateRoute = async () => {
    const geocodedWaypoints = waypoints.filter(wp => wp.lat !== 0 && wp.lng !== 0);
    
    if (geocodedWaypoints.length < 2) {
      setError('At least 2 geocoded waypoints are required to calculate a route');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const polyline = await calculateRoute(geocodedWaypoints);
      setRoutePolyline(polyline);
      setLoading(false);
    } catch (err) {
      setError(`Error calculating route: ${err.message}`);
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!routeName.trim()) {
      setError('Route name is required');
      return;
    }

    const routeToSave = {
      id: routeId || uuidv4(),
      name: routeName.trim(),
      itineraryText: itineraryText.trim(),
      waypoints: waypoints,
      routePolyline: routePolyline,
      createdAt: isNewRoute ? new Date().toISOString() : getRoute(routeId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      saveRoute(routeToSave);
      if (onSave) {
        onSave(routeToSave);
      }
    } catch (err) {
      setError(`Error saving route: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left Panel - Editor */}
      <div style={{ 
        width: '400px', 
        overflowY: 'auto', 
        padding: '20px',
        borderRight: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>{isNewRoute ? 'New Route' : 'Edit Route'}</h2>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <RouteForm
          routeName={routeName}
          itineraryText={itineraryText}
          onRouteNameChange={setRouteName}
          onItineraryTextChange={setItineraryText}
          onParseItinerary={handleParseItinerary}
          loading={loading}
        />

        <WaypointEditor
          waypoints={waypoints}
          onWaypointsChange={setWaypoints}
        />

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleGeocodeWaypoints}
            disabled={loading || waypoints.filter(wp => wp.lat === 0 && wp.lng === 0).length === 0}
            style={{
              padding: '10px',
              backgroundColor: waypoints.filter(wp => wp.lat === 0 && wp.lng === 0).length === 0 ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: waypoints.filter(wp => wp.lat === 0 && wp.lng === 0).length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {loading && geocodingProgress.total > 0 
              ? `Geocoding... (${geocodingProgress.current}/${geocodingProgress.total})`
              : 'Geocode Waypoints'}
          </button>

          <button
            onClick={handleCalculateRoute}
            disabled={loading || waypoints.filter(wp => wp.lat !== 0 && wp.lng !== 0).length < 2}
            style={{
              padding: '10px',
              backgroundColor: waypoints.filter(wp => wp.lat !== 0 && wp.lng !== 0).length < 2 ? '#d1d5db' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: waypoints.filter(wp => wp.lat !== 0 && wp.lng !== 0).length < 2 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Calculate Route
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginTop: '8px'
            }}
          >
            {loading ? 'Processing...' : 'Save Route'}
          </button>
        </div>
      </div>

      {/* Right Panel - Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapView
          waypoints={waypoints}
          routePolyline={routePolyline}
        />
      </div>

      {/* Ambiguity Resolution Modal */}
      {ambiguityState && (
        <AmbiguityResolution
          waypointName={ambiguityState.waypointName}
          candidates={ambiguityState.candidates}
          onSelect={handleAmbiguityResolve}
          onSkip={handleAmbiguitySkip}
          onCancel={handleAmbiguityCancel}
        />
      )}
    </div>
  );
}

