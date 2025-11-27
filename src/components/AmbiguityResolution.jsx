import { useState, useEffect } from 'react';
import { searchLocations } from '../utils/openRouteService';
import AutocompleteInput from './AutocompleteInput';

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
 * @param {Function} props.onSearch - Callback to search with a different name: (newName) => Promise<void>
 * @param {boolean} props.isSearching - Whether a search is currently in progress
 * @param {string} props.searchError - Error message if search failed
 */
export default function AmbiguityResolution({
  waypointName,
  candidates = [],
  onSelect,
  onSkip,
  onCancel,
  onSearch,
  isSearching = false,
  searchError = null
}) {
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchName, setSearchName] = useState('');
  
  // Reset search view when candidates change (new search completed)
  // This ensures we show results view, not search view, after successful search
  useEffect(() => {
    if (showSearch && candidates.length > 0 && !isSearching) {
      // Search completed with results - show them instead of search view
      setShowSearch(false);
      setSearchName(''); // Clear search input
    }
  }, [candidates.length, showSearch, isSearching]);

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

  const handleSearch = async () => {
    if (!searchName.trim() || isSearching) return;
    
    try {
      await onSearch(searchName.trim());
      // Note: We don't reset showSearch here - let the candidates change trigger it
      // This allows the component to show loading state during search
    } catch (error) {
      // Error handling is done in parent component
      // Component will show searchError prop if provided
    }
  };

  const handleAutocompleteSearch = async (query) => {
    return await searchLocations(query, 'IN', 5);
  };

  const handleSuggestionSelect = (candidate) => {
    // When user selects a suggestion, fill the input and optionally trigger search
    setSearchName(candidate.display_name);
    // Optionally auto-trigger search when suggestion is selected
    // For now, user can still click "Search" button or press Enter
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
          {candidates.length > 0 
            ? `Multiple locations found for "${waypointName}"`
            : `No locations found for "${waypointName}"`}
        </h3>
        
        {isSearching && (
          <div style={{
            padding: '12px',
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            Searching for "{searchName || waypointName}"...
          </div>
        )}
        
        {searchError && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            Search failed: {searchError}
          </div>
        )}
        
        {!showManualEntry && !showSearch ? (
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
              <>
                <p style={{ marginBottom: '16px', color: '#ef4444' }}>
                  No locations found for "{waypointName}"
                </p>
                <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
                  Try searching with a different name, or enter coordinates manually.
                </p>
              </>
            )}
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {candidates.length === 0 && onSearch && !isSearching && (
                <button
                  onClick={() => {
                    setShowSearch(true);
                    setSearchName(''); // Start with empty search
                  }}
                  disabled={isSearching}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: isSearching ? '#d1d5db' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isSearching ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Search with Different Name
                </button>
              )}
              
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
        ) : showManualEntry ? (
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
        ) : (
          <div>
            <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Search with Different Name</h4>
            <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
              Original name: "{waypointName}". Enter an alternative name to search:
            </p>
            
            {searchError && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {searchError}
              </div>
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Location Name
              </label>
              <AutocompleteInput
                value={searchName}
                onChange={setSearchName}
                onSelect={handleSuggestionSelect}
                onSearch={handleAutocompleteSearch}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && searchName.trim() && !isSearching) {
                    handleSearch();
                  }
                }}
                placeholder="e.g., Leh, Ladakh, India"
                disabled={isSearching}
                debounceMs={400}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSearch}
                disabled={!searchName.trim() || isSearching}
                style={{
                  padding: '8px 16px',
                  backgroundColor: (!searchName.trim() || isSearching) ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (!searchName.trim() || isSearching) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
              
              <button
                onClick={() => {
                  setShowSearch(false);
                  // Don't clear searchName - user might want to edit it
                }}
                disabled={isSearching}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isSearching ? '#d1d5db' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSearching ? 'not-allowed' : 'pointer',
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

