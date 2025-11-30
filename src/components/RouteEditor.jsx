import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getRoute, saveRoute } from '../utils/storage';
import { extractWaypointsWithRetry } from '../utils/anthropicService';
import { geocodeLocation, calculateRouteSegments, calculateRoute, DEFAULT_ROUTING_PROFILE } from '../utils/openRouteService';
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
  const [routePolyline, setRoutePolyline] = useState([]); // Keep for backward compatibility
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isNewRoute, setIsNewRoute] = useState(!routeId);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0, message: null });
  const [ambiguityState, setAmbiguityState] = useState(null); // { waypointIndex, waypointName, candidates, isEditing }
  const [searchError, setSearchError] = useState(null); // Error message from search

  // Load route data when routeId changes
  useEffect(() => {
    const loadRouteAsync = async () => {
      if (routeId) {
        const route = await getRoute(routeId);
        if (route) {
          setRouteName(route.name || '');
          setItineraryText(route.itineraryText || '');
          setWaypoints(route.waypoints || []);
          setRoutePolyline(route.routePolyline || []); // Backward compatibility
          setSegments(route.segments || []);
          setIsNewRoute(false);
        } else {
          setError('Route not found');
          setIsNewRoute(true);
        }
      } else {
        // New route - initialize with empty UUID
        setIsNewRoute(true);
      }
    };
    
    loadRouteAsync();
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
        id: uuidv4(), // Generate unique ID for each waypoint
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

  const handleGeocodeSingleWaypoint = async (waypointIndex) => {
    if (waypointIndex < 0 || waypointIndex >= waypoints.length) {
      return;
    }

    const waypoint = waypoints[waypointIndex];
    
    // Check if already geocoded
    if (waypoint.lat !== 0 && waypoint.lng !== 0) {
      setError('This waypoint is already geocoded');
      return;
    }

    setLoading(true);
    setError(null);
    setGeocodingProgress({ current: 1, total: 1, message: `Geocoding ${waypoint.name}...` });

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
        setGeocodingProgress({ current: 0, total: 0, message: null });
      } else if (result.candidates.length === 1) {
        // Single result - use it automatically
        const updatedWaypoints = [...waypoints];
        updatedWaypoints[waypointIndex] = {
          ...updatedWaypoints[waypointIndex],
          lat: result.candidates[0].lat,
          lng: result.candidates[0].lng,
          display_name: result.candidates[0].display_name
        };
        setWaypoints(updatedWaypoints);
        setLoading(false);
        setGeocodingProgress({ current: 0, total: 0, message: null });
      } else {
        // Multiple candidates - show ambiguity resolution UI
        setAmbiguityState({
          waypointIndex,
          waypointName: waypoint.name,
          candidates: result.candidates
        });
        setLoading(false);
        setGeocodingProgress({ current: 0, total: 0, message: null });
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
      setGeocodingProgress({ current: 0, total: 0, message: null });
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
    setGeocodingProgress({ current: 0, total: ungeocoded.length, message: null });

    // Geocode waypoints one by one to handle ambiguities
    const updatedWaypoints = [...waypoints];
    
    for (let i = 0; i < ungeocoded.length; i++) {
      const waypoint = ungeocoded[i];
      const waypointIndex = waypoints.findIndex(wp => wp.name === waypoint.name && wp.lat === 0 && wp.lng === 0);
      
      setGeocodingProgress({ current: i + 1, total: ungeocoded.length, message: null });
      
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
    setGeocodingProgress({ current: 0, total: 0, message: null });
  };

  const handleEditWaypoint = (waypointIndex) => {
    const waypoint = waypoints[waypointIndex];
    if (!waypoint) return;

    // When editing, start with search interface open (not candidates list)
    // This allows user to search for a completely different location
    setAmbiguityState({
      waypointIndex,
      waypointName: waypoint.name,
      candidates: [],
      isEditing: true,
      startInSearchMode: true
    });
  };

  const handleAmbiguityResolve = async (selectedCandidate) => {
    if (!ambiguityState) return;
    
    const wasEditing = ambiguityState.isEditing;
    const oldWaypoint = waypoints[ambiguityState.waypointIndex];
    const hadCoordinates = oldWaypoint && oldWaypoint.lat !== 0 && oldWaypoint.lng !== 0;
    
    const updatedWaypoints = [...waypoints];
    const currentWaypoint = updatedWaypoints[ambiguityState.waypointIndex];
    
    // If display_name starts with "Manual:", keep the original name
    // Otherwise, update name if display_name is different
    const shouldUpdateName = selectedCandidate.display_name && 
                             !selectedCandidate.display_name.startsWith('Manual:') &&
                             selectedCandidate.display_name !== currentWaypoint.name;
    
    updatedWaypoints[ambiguityState.waypointIndex] = {
      ...currentWaypoint,
      lat: selectedCandidate.lat,
      lng: selectedCandidate.lng,
      display_name: selectedCandidate.display_name,
      name: shouldUpdateName ? selectedCandidate.display_name : currentWaypoint.name
    };
    
    setWaypoints(updatedWaypoints);
    setAmbiguityState(null);
    
    // If editing and waypoint had coordinates, recalculate affected segments
    if (wasEditing && hadCoordinates && segments.length > 0) {
      await handleRecalculateAffectedSegments(ambiguityState.waypointIndex);
      return;
    }
    
    // Continue geocoding remaining waypoints using updated list
    const remaining = updatedWaypoints.filter(wp => wp.lat === 0 && wp.lng === 0);
    if (remaining.length > 0) {
      // Continue geocoding from the updated waypoints list
      setLoading(true);
      setError(null);
      setGeocodingProgress({ current: 0, total: remaining.length });
      
      // Use the updated waypoints list directly to avoid state timing issues
      for (let i = 0; i < remaining.length; i++) {
        const waypoint = remaining[i];
        const waypointIndex = updatedWaypoints.findIndex(wp => wp.id === waypoint.id && wp.lat === 0 && wp.lng === 0);
        
        // Skip if waypoint was already geocoded (shouldn't happen, but safety check)
        if (waypointIndex === -1) continue;
        
        setGeocodingProgress({ current: i + 1, total: remaining.length });
        
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
          if (i < remaining.length - 1) {
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
      
      // All remaining waypoints geocoded successfully
      setLoading(false);
      setGeocodingProgress({ current: 0, total: 0, message: null });
    } else {
      setLoading(false);
      setGeocodingProgress({ current: 0, total: 0, message: null });
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
      setGeocodingProgress({ current: 0, total: 0, message: null });
    }
  };

  const handleAmbiguityCancel = () => {
    setAmbiguityState(null);
    setLoading(false);
    setGeocodingProgress({ current: 0, total: 0, message: null });
  };

  const handleAmbiguitySearch = async (newName) => {
    if (!ambiguityState || !newName.trim()) return;
    
    const isEditing = ambiguityState.isEditing || false;
    const oldWaypoint = waypoints[ambiguityState.waypointIndex];
    const hadCoordinates = oldWaypoint && oldWaypoint.lat !== 0 && oldWaypoint.lng !== 0;
    
    setLoading(true);
    setSearchError(null);
    
    try {
      // Update the waypoint name with the new search term
      setWaypoints(prevWaypoints => {
        const updated = [...prevWaypoints];
        updated[ambiguityState.waypointIndex] = {
          ...updated[ambiguityState.waypointIndex],
          name: newName.trim()
        };
        return updated;
      });
      
      // Try geocoding with the new name
      const result = await geocodeLocation(newName.trim());
      
      // Check results and update ambiguity state
      if (result.candidates.length === 0) {
        // Still no results - show manual entry option
        setAmbiguityState({
          waypointIndex: ambiguityState.waypointIndex,
          waypointName: newName.trim(),
          candidates: [],
          isEditing: isEditing // Preserve edit flag
        });
        setLoading(false);
        setSearchError(null);
      } else if (result.candidates.length === 1) {
        // Single result - use it automatically
        let updatedWaypoints;
        setWaypoints(prevWaypoints => {
          updatedWaypoints = [...prevWaypoints];
          updatedWaypoints[ambiguityState.waypointIndex] = {
            ...updatedWaypoints[ambiguityState.waypointIndex],
            lat: result.candidates[0].lat,
            lng: result.candidates[0].lng,
            display_name: result.candidates[0].display_name
          };
          return updatedWaypoints;
        });
        setAmbiguityState(null);
        setSearchError(null);
        
        // If editing and waypoint had coordinates, recalculate affected segments
        if (isEditing && hadCoordinates && segments.length > 0) {
          await handleRecalculateAffectedSegments(ambiguityState.waypointIndex);
          return;
        }
        
        // Continue geocoding remaining waypoints using updated list (only if not editing)
        const remaining = updatedWaypoints.filter(wp => wp.lat === 0 && wp.lng === 0);
        if (remaining.length > 0 && !isEditing) {
          // Continue geocoding from the updated waypoints list
          setLoading(true);
          setError(null);
          setGeocodingProgress({ current: 0, total: remaining.length, message: null });
          
          for (let i = 0; i < remaining.length; i++) {
            const waypoint = remaining[i];
            const waypointIndex = updatedWaypoints.findIndex(wp => wp.id === waypoint.id && wp.lat === 0 && wp.lng === 0);
            
            if (waypointIndex === -1) continue;
            
            setGeocodingProgress({ current: i + 1, total: remaining.length, message: null });
            
            try {
              const geocodeResult = await geocodeLocation(waypoint.name);
              
              if (geocodeResult.candidates.length === 0) {
                setAmbiguityState({
                  waypointIndex,
                  waypointName: waypoint.name,
                  candidates: []
                });
                setLoading(false);
                return;
              } else if (geocodeResult.candidates.length === 1) {
                updatedWaypoints[waypointIndex] = {
                  ...updatedWaypoints[waypointIndex],
                  lat: geocodeResult.candidates[0].lat,
                  lng: geocodeResult.candidates[0].lng,
                  display_name: geocodeResult.candidates[0].display_name
                };
                setWaypoints([...updatedWaypoints]);
              } else {
                setAmbiguityState({
                  waypointIndex,
                  waypointName: waypoint.name,
                  candidates: geocodeResult.candidates
                });
                setLoading(false);
                return;
              }
              
              if (i < remaining.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } catch (err) {
              console.error(`Error geocoding ${waypoint.name}:`, err);
              setAmbiguityState({
                waypointIndex,
                waypointName: waypoint.name,
                candidates: []
              });
              setLoading(false);
              return;
            }
          }
          
          setLoading(false);
          setGeocodingProgress({ current: 0, total: 0, message: null });
        } else {
          setLoading(false);
          setGeocodingProgress({ current: 0, total: 0, message: null });
        }
      } else {
        // Multiple candidates - show them
        setAmbiguityState({
          waypointIndex: ambiguityState.waypointIndex,
          waypointName: newName.trim(),
          candidates: result.candidates,
          isEditing: isEditing // Preserve edit flag
        });
        setLoading(false);
        setSearchError(null);
      }
    } catch (err) {
      console.error(`Error geocoding "${newName}":`, err);
      // Show error message in the modal
      setSearchError(err.message || 'Failed to search for location. Please try again or enter coordinates manually.');
      setAmbiguityState({
        waypointIndex: ambiguityState.waypointIndex,
        waypointName: newName.trim(),
        candidates: [],
        isEditing: isEditing // Preserve edit flag
      });
      setLoading(false);
    }
  };

  /**
   * Recalculate only the segments affected by a waypoint change
   * @param {number} changedWaypointIndex - Index of the waypoint that was changed
   */
  const handleRecalculateAffectedSegments = async (changedWaypointIndex) => {
    const geocodedWaypoints = waypoints.filter(wp => wp.lat !== 0 && wp.lng !== 0);
    
    if (geocodedWaypoints.length < 2) {
      setError('At least 2 geocoded waypoints are required');
      return;
    }

    // Find the index of the changed waypoint in the geocoded waypoints array
    const geocodedIndex = geocodedWaypoints.findIndex((wp, idx) => {
      const originalWp = waypoints.find(w => w.id === wp.id || (w.order === wp.order && w.name === wp.name));
      return originalWp && waypoints.indexOf(originalWp) === changedWaypointIndex;
    });

    if (geocodedIndex === -1) {
      // Waypoint not found in geocoded list, recalculate all
      return handleCalculateRoute();
    }

    // Determine which segments are affected
    // If waypoint at index i changes, segments i-1 and i are affected
    const affectedSegmentStart = Math.max(0, geocodedIndex - 1);
    const affectedSegmentEnd = Math.min(geocodedWaypoints.length - 2, geocodedIndex);
    const affectedSegmentCount = affectedSegmentEnd - affectedSegmentStart + 1;

    if (affectedSegmentCount <= 0) {
      return; // No segments to recalculate
    }

    setLoading(true);
    setError(null);
    setGeocodingProgress({ 
      current: 0, 
      total: affectedSegmentCount, 
      message: `Recalculating ${affectedSegmentCount} affected segment(s)...` 
    });

    try {
      const updatedSegments = [...segments];
      let recalculatedCount = 0;

      // Recalculate each affected segment
      for (let i = affectedSegmentStart; i <= affectedSegmentEnd; i++) {
        const from = geocodedWaypoints[i];
        const to = geocodedWaypoints[i + 1];
        
        setGeocodingProgress({ 
          current: recalculatedCount + 1, 
          total: affectedSegmentCount,
          message: `Recalculating segment ${i + 1} → ${i + 2}...`
        });

        try {
          const segmentData = await calculateRoute(from, to, DEFAULT_ROUTING_PROFILE);
          
          // Find the segment in the existing segments array
          const fromId = from.id || (from.order !== undefined ? from.order.toString() : i.toString());
          const toId = to.id || (to.order !== undefined ? to.order.toString() : (i + 1).toString());
          
          const segmentIndex = updatedSegments.findIndex(s => 
            s.fromWaypointId === fromId && s.toWaypointId === toId
          );

          const newSegment = {
            fromWaypointId: fromId,
            toWaypointId: toId,
            polyline: segmentData.polyline,
            distance: segmentData.distance,
            duration: segmentData.duration
          };

          if (segmentIndex >= 0) {
            // Update existing segment
            updatedSegments[segmentIndex] = newSegment;
          } else {
            // Insert new segment at the correct position
            updatedSegments.splice(i, 0, newSegment);
          }

          recalculatedCount++;
        } catch (err) {
          console.error(`Error recalculating segment ${i} → ${i + 1}:`, err);
          // Continue with other segments even if one fails
        }
      }

      setSegments(updatedSegments);
      
      // Generate combined polyline for backward compatibility
      const combinedPolyline = updatedSegments.flatMap(segment => segment.polyline);
      setRoutePolyline(combinedPolyline);
      
      setLoading(false);
      setGeocodingProgress({ current: 0, total: 0, message: null });
      
      if (recalculatedCount === affectedSegmentCount) {
        setError(null); // Success
      } else {
        setError(`Warning: Only ${recalculatedCount} of ${affectedSegmentCount} segments recalculated successfully.`);
      }
    } catch (err) {
      console.error('Partial route recalculation error:', err);
      setError(`Error recalculating segments: ${err.message}`);
      setLoading(false);
      setGeocodingProgress({ current: 0, total: 0, message: null });
    }
  };

  const handleCalculateRoute = async () => {
    const geocodedWaypoints = waypoints.filter(wp => wp.lat !== 0 && wp.lng !== 0);
    
    if (geocodedWaypoints.length < 2) {
      setError('At least 2 geocoded waypoints are required to calculate a route');
      return;
    }

    setLoading(true);
    setError(null);
    setGeocodingProgress({ current: 0, total: geocodedWaypoints.length - 1, message: null });

    try {
      const result = await calculateRouteSegments(
        geocodedWaypoints,
        DEFAULT_ROUTING_PROFILE,
        (current, total, message) => {
          setGeocodingProgress({ 
            current, 
            total,
            message: message || `Calculating segment ${current} of ${total}`
          });
        }
      );
      
      const { segments: routeSegments, adjustedWaypoints: adjusted } = result;
      
      if (routeSegments.length === 0) {
        setError('Failed to calculate any route segments');
        setLoading(false);
        setGeocodingProgress({ current: 0, total: 0, message: null });
        return;
      }

      // Update waypoints with adjusted coordinates if any were adjusted
      if (adjusted && adjusted.length > 0) {
        setWaypoints(prevWaypoints => {
          const updated = prevWaypoints.map(wp => {
            // Match by ID first, then by order
            const adjustedWp = adjusted.find(aw => {
              if (wp.id && aw.waypointId === wp.id) return true;
              if (!wp.id && wp.order !== undefined && aw.waypointId === wp.order.toString()) return true;
              return false;
            });
            if (adjustedWp) {
              return {
                ...wp,
                lat: adjustedWp.adjusted.lat,
                lng: adjustedWp.adjusted.lng,
                adjusted: true,
                originalCoordinates: adjustedWp.original
              };
            }
            return wp;
          });
          return updated;
        });
        
        // Show info about adjusted waypoints
        const adjustedNames = adjusted.map(aw => {
          const wp = geocodedWaypoints.find(w => 
            (w.id || w.order?.toString()) === aw.waypointId
          );
          return wp?.name || `Waypoint ${aw.waypointId}`;
        }).join(', ');
        
        console.log(`Adjusted ${adjusted.length} waypoint(s) to find routable coordinates: ${adjustedNames}`);
      }

      setSegments(routeSegments);
      
      // Generate combined polyline for backward compatibility
      const combinedPolyline = routeSegments.flatMap(segment => segment.polyline);
      setRoutePolyline(combinedPolyline);
      
      setLoading(false);
      setGeocodingProgress({ current: 0, total: 0, message: null });
      
      if (routeSegments.length < geocodedWaypoints.length - 1) {
        setError(`Warning: Only ${routeSegments.length} of ${geocodedWaypoints.length - 1} segments calculated successfully. Some segments may be missing.`);
      } else {
        // Show success message, including info about adjusted waypoints if any
        if (adjusted && adjusted.length > 0) {
          setError(`Route calculated successfully. ${adjusted.length} waypoint(s) adjusted to find routable coordinates.`);
        } else {
          setError(null);
        }
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      setError(`Error calculating route: ${err.message}. Check browser console for details.`);
      setLoading(false);
      setGeocodingProgress({ current: 0, total: 0, message: null });
      setSegments([]); // Clear segments on error
      setRoutePolyline([]);
    }
  };

  const handleSave = async () => {
    if (!routeName.trim()) {
      setError('Route name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get existing route to preserve createdAt if updating
      const existingRoute = routeId ? await getRoute(routeId) : null;
      
      const routeToSave = {
        id: routeId || uuidv4(),
        name: routeName.trim(),
        itineraryText: itineraryText.trim(),
        waypoints: waypoints,
        routePolyline: routePolyline, // Keep for backward compatibility
        segments: segments,
        createdAt: existingRoute?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveRoute(routeToSave);
      setLoading(false);
      
      if (onSave) {
        onSave(routeToSave);
      }
    } catch (err) {
      setError(`Error saving route: ${err.message}`);
      setLoading(false);
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
          onGeocodeWaypoint={handleGeocodeSingleWaypoint}
          onEditWaypoint={handleEditWaypoint}
          isGeocoding={loading}
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
            {loading && geocodingProgress.total > 0
              ? (geocodingProgress.message || `Calculating... (${geocodingProgress.current}/${geocodingProgress.total} segments)`)
              : segments.length > 0
              ? `Recalculate Route (${segments.length} segments)`
              : 'Calculate Route'}
          </button>
          
          {segments.length > 0 && !loading && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#d1fae5',
              color: '#065f46',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              ✓ Route calculated: {segments.length} segment{segments.length !== 1 ? 's' : ''} displayed on map
            </div>
          )}

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
          segments={segments}
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
          onSearch={handleAmbiguitySearch}
          isSearching={loading && ambiguityState.waypointIndex !== undefined}
          searchError={searchError}
          startInSearchMode={ambiguityState.startInSearchMode || false}
        />
      )}
    </div>
  );
}

