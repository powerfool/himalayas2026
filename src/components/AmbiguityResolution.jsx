import { useState } from 'react';

/**
 * AmbiguityResolution component - UI for resolving geocoding ambiguities
 * Shows multiple candidate locations and allows user to select or manually enter coordinates
 * 
 * @param {Object} props
 * @param {string} props.waypointName - Name of the waypoint being geocoded
 * @param {Array} props.candidates - Array of candidate locations from geocoding
 * @param {Function} props.onSelect - Callback when user selects a candidate: (candidate) => void
 * @param {Function} props.onSkip - Callback when user wants to skip: () => void
 * @param {Function} props.onCancel - Callback to cancel/close: () => void
 */
export default function AmbiguityResolution({
  waypointName,
  candidates = [],
  onSelect,
  onSkip,
  onCancel
}) {
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const [showManualEntry, setShowManualEntry] = useState(false);

  const handleManualSubmit = () => {
    const lat = parseFloat(manualCoords.lat);
    const lng = parseFloat(manualCoords.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid coordinates');
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Invalid coordinate range. Lat: -90 to 90, Lng: -180 to 180');
      return;
    }
    
    onSelect({
      lat,
      lng,
      display_name: `Manual: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
          Multiple locations found for "{waypointName}"
        </h3>
        
        {!showManualEntry ? (
          <>
            {candidates.length > 0 ? (
              <>
                <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                  Please select the correct location:
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {candidates.map((candidate, index) => (
                    <div
                      key={index}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.backgroundColor = '#f0f9ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                      onClick={() => onSelect(candidate)}
                    >
                      <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                        {candidate.display_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)}
                        {candidate.type && ` • ${candidate.type}`}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ marginBottom: '16px', color: '#ef4444' }}>
                No locations found for "{waypointName}"
              </p>
            )}
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowManualEntry(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Enter Coordinates Manually
              </button>
              
              {candidates.length > 0 && (
                <button
                  onClick={onSkip}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Skip (Not Geocoded)
                </button>
              )}
              
              <button
                onClick={onCancel}
                style={{
                  padding: '8px 16px',
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
          </>
        ) : (
          <div>
            <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Manual Coordinate Entry</h4>
            <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
              Enter latitude and longitude for "{waypointName}"
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Latitude (-90 to 90)
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualCoords.lat}
                  onChange={(e) => setManualCoords({ ...manualCoords, lat: e.target.value })}
                  placeholder="e.g., 34.1526"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Longitude (-180 to 180)
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualCoords.lng}
                  onChange={(e) => setManualCoords({ ...manualCoords, lng: e.target.value })}
                  placeholder="e.g., 77.5771"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleManualSubmit}
                disabled={!manualCoords.lat || !manualCoords.lng}
                style={{
                  padding: '8px 16px',
                  backgroundColor: !manualCoords.lat || !manualCoords.lng ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !manualCoords.lat || !manualCoords.lng ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Use These Coordinates
              </button>
              
              <button
                onClick={() => setShowManualEntry(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

