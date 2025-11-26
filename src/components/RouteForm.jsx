/**
 * RouteForm component - Input form for route name and itinerary
 */
export default function RouteForm({ 
  routeName, 
  itineraryText, 
  onRouteNameChange, 
  onItineraryTextChange,
  onParseItinerary,
  loading = false
}) {
  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Route Name *
        </label>
        <input
          type="text"
          value={routeName}
          onChange={(e) => onRouteNameChange(e.target.value)}
          placeholder="e.g., Manali to Leh"
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

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Itinerary Text
        </label>
        <textarea
          value={itineraryText}
          onChange={(e) => onItineraryTextChange(e.target.value)}
          placeholder="Paste your itinerary here...&#10;&#10;Example:&#10;Day 1: Delhi to Manali, 550km&#10;Day 2: Manali to Keylong via Rohtang Pass&#10;Day 3: Keylong to Leh, 350km"
          rows={8}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
        <button
          onClick={onParseItinerary}
          disabled={loading || !itineraryText.trim()}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            backgroundColor: !itineraryText.trim() ? '#d1d5db' : '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !itineraryText.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {loading ? 'Extracting waypoints...' : 'Extract Waypoints'}
        </button>
        <div style={{ 
          marginTop: '8px', 
          fontSize: '12px', 
          color: '#6b7280' 
        }}>
          Uses AI to extract waypoint names from your itinerary text. You'll geocode them separately.
        </div>
      </div>
    </div>
  );
}


