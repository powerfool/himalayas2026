import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * WaypointEditor component - Manual waypoint entry/editing
 * @param {Array} waypoints - Array of waypoint objects
 * @param {Function} onWaypointsChange - Callback when waypoints change
 * @param {Function} onGeocodeWaypoint - Optional callback to geocode a single waypoint: (index) => void
 * @param {boolean} isGeocoding - Whether geocoding is in progress
 */
export default function WaypointEditor({ waypoints = [], onWaypointsChange, onGeocodeWaypoint = null, isGeocoding = false }) {
  const [newLocationName, setNewLocationName] = useState('');

  const handleAddWaypoint = () => {
    if (!newLocationName.trim()) return;
    
    const newWaypoint = {
      id: uuidv4(),
      name: newLocationName.trim(),
      lat: 0,
      lng: 0,
      order: waypoints.length
    };
    
    onWaypointsChange([...waypoints, newWaypoint]);
    setNewLocationName('');
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
        <input
          type="text"
          value={newLocationName}
          onChange={(e) => setNewLocationName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddWaypoint();
            }
          }}
          placeholder="Enter location name"
          style={{
            flex: 1,
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
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
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}
                    {waypoint.display_name && (
                      <> • {waypoint.display_name}</>
                    )}
                  </div>
                ) : (
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
                )}
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
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


