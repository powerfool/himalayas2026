import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { searchLocations } from '../utils/openRouteService';
import AutocompleteInput from './AutocompleteInput';

/**
 * WaypointEditor component - Manual waypoint entry/editing
 * @param {Array} waypoints - Array of waypoint objects
 * @param {Function} onWaypointsChange - Callback when waypoints change
 * @param {Function} onGeocodeWaypoint - Optional callback to geocode a single waypoint: (index) => void
 * @param {Function} onEditWaypoint - Optional callback to edit a waypoint: (index) => void
 * @param {boolean} isGeocoding - Whether geocoding is in progress
 */
export default function WaypointEditor({ waypoints = [], onWaypointsChange, onGeocodeWaypoint = null, onEditWaypoint = null, isGeocoding = false }) {
  const [newLocationName, setNewLocationName] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null); // Store selected candidate with coordinates

  const handleAddWaypoint = () => {
    if (!newLocationName.trim()) return;
    
    // If a candidate was selected, use its coordinates and display_name
    // Otherwise, use the input value as name and set coordinates to 0 (needs geocoding)
    const newWaypoint = {
      id: uuidv4(),
      name: selectedCandidate ? selectedCandidate.display_name : newLocationName.trim(),
      lat: selectedCandidate?.lat || 0,
      lng: selectedCandidate?.lng || 0,
      order: waypoints.length,
      display_name: selectedCandidate?.display_name || null
    };
    
    onWaypointsChange([...waypoints, newWaypoint]);
    setNewLocationName('');
    setSelectedCandidate(null); // Clear selected candidate
  };

  const handleSuggestionSelect = (candidate) => {
    // When user selects a suggestion, store the candidate with coordinates
    // Use the display_name as the input value to ensure exact match
    setNewLocationName(candidate.display_name);
    setSelectedCandidate(candidate);
  };

  const handleInputChange = (value) => {
    setNewLocationName(value);
    // Only clear selected candidate if user manually edits the input to something different
    // This allows user to see the full display_name but still use coordinates if they don't change it
    if (selectedCandidate && value.trim() !== selectedCandidate.display_name.trim()) {
      setSelectedCandidate(null);
    }
  };

  const handleSearch = async (query) => {
    // Use global search (null country code) to allow searching anywhere
    return await searchLocations(query, null, 5);
  };

  const handleRemoveWaypoint = (index) => {
    const updated = waypoints.filter((_, i) => i !== index);
    // Reorder remaining waypoints
    updated.forEach((wp, i) => {
      wp.order = i;
    });
    onWaypointsChange(updated);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...waypoints];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((wp, i) => {
      wp.order = i;
    });
    onWaypointsChange(updated);
  };

  const handleMoveDown = (index) => {
    if (index === waypoints.length - 1) return;
    const updated = [...waypoints];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((wp, i) => {
      wp.order = i;
    });
    onWaypointsChange(updated);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <h3 style={{ marginBottom: '12px' }}>Waypoints</h3>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <AutocompleteInput
            value={newLocationName}
            onChange={handleInputChange}
            onSelect={handleSuggestionSelect}
            onSearch={handleSearch}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddWaypoint();
              }
            }}
            placeholder="Enter location name"
            debounceMs={400}
          />
          {selectedCandidate && (
            <div style={{
              marginTop: '4px',
              fontSize: '12px',
              color: '#10b981',
              fontStyle: 'italic'
            }}>
              ✓ Coordinates available from selection
            </div>
          )}
        </div>
        <button
          onClick={handleAddWaypoint}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Add
        </button>
      </div>

      {waypoints.length === 0 ? (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '4px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          No waypoints yet. Add locations manually or parse from itinerary text.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {waypoints.map((waypoint, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
            >
              <div style={{ 
                minWidth: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                backgroundColor: '#3b82f6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {index + 1}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500' }}>{waypoint.name}</div>
                {waypoint.lat !== 0 && waypoint.lng !== 0 ? (
                  <>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}
                      {waypoint.display_name && (
                        <> • {waypoint.display_name}</>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps/place/?q=${encodeURIComponent(waypoint.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '4px',
                        fontSize: '12px',
                        color: '#4285f4',
                        textDecoration: 'none',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                      title="Open in Google Maps"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ display: 'inline-block', verticalAlign: 'middle' }}
                      >
                        <path
                          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                          fill="#4285f4"
                        />
                      </svg>
                      Google Maps
                    </a>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '12px', color: '#ef4444' }}>
                      Not geocoded yet
                      {onGeocodeWaypoint && (
                        <span
                          onClick={() => !isGeocoding && onGeocodeWaypoint(index)}
                          style={{
                            marginLeft: '8px',
                            color: '#3b82f6',
                            cursor: isGeocoding ? 'not-allowed' : 'pointer',
                            textDecoration: 'underline',
                            opacity: isGeocoding ? 0.5 : 1
                          }}
                          title="Click to geocode this waypoint"
                        >
                          Geocode
                        </span>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps/place/?q=${encodeURIComponent(waypoint.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '4px',
                        fontSize: '12px',
                        color: '#4285f4',
                        textDecoration: 'none',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                      title="Open in Google Maps"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ display: 'inline-block', verticalAlign: 'middle' }}
                      >
                        <path
                          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                          fill="#4285f4"
                        />
                      </svg>
                      Google Maps
                    </a>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                {onEditWaypoint && (
                  <button
                    onClick={() => onEditWaypoint(index)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title="Edit waypoint"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: index === 0 ? '#e5e7eb' : '#f3f4f6',
                    color: index === 0 ? '#9ca3af' : '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === waypoints.length - 1}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: index === waypoints.length - 1 ? '#e5e7eb' : '#f3f4f6',
                    color: index === waypoints.length - 1 ? '#9ca3af' : '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: index === waypoints.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ↓
                </button>
                <button
                  onClick={() => handleRemoveWaypoint(index)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


