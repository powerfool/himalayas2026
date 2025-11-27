import { useState, useEffect, useRef } from 'react';

/**
 * AutocompleteInput component - Reusable autocomplete input with suggestions dropdown
 * @param {string} value - Current input value
 * @param {Function} onChange - Callback when input value changes: (value) => void
 * @param {Function} onSelect - Callback when suggestion is selected: (candidate) => void
 * @param {Function} onSearch - Async callback to search for suggestions: (query) => Promise<{candidates: Array}>
 * @param {string} placeholder - Input placeholder text
 * @param {boolean} disabled - Whether input is disabled
 * @param {Function} onKeyPress - Optional callback for Enter key: (e) => void
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 400)
 * @param {string} className - Optional CSS class name
 * @param {Object} style - Optional inline styles for input
 */
export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  onSearch,
  placeholder = '',
  disabled = false,
  onKeyPress = null,
  debounceMs = 400,
  className = '',
  style = {}
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState(null);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const lastSearchRef = useRef('');

  // Debounced search function
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search if input is too short or same as last search
    if (!value || value.trim().length < 2 || value.trim() === lastSearchRef.current) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsLoading(false);
      return;
    }

    // Don't search if input hasn't changed
    if (value.trim() === lastSearchRef.current) {
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    setShowDropdown(true);

    // Debounce the search
    debounceTimerRef.current = setTimeout(async () => {
      try {
        lastSearchRef.current = value.trim();
        const result = await onSearch(value.trim());
        setSuggestions(result.candidates || []);
        setSelectedIndex(-1);
        setSearchError(null);
        setShowDropdown((result.candidates || []).length > 0);
      } catch (error) {
        console.error('Autocomplete search error:', error);
        setSuggestions([]);
        setSearchError(error.message);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, onSearch, debounceMs]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    onChange(e.target.value);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    // Handle navigation keys when dropdown is open
    if (showDropdown && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          return;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          return;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSelectSuggestion(suggestions[selectedIndex]);
          } else {
            // Close dropdown if Enter pressed without selection
            setShowDropdown(false);
            setSelectedIndex(-1);
          }
          return;
        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          setSelectedIndex(-1);
          return;
      }
    }
    
    // If Enter pressed and no dropdown or no selection, let parent handle it
    if (e.key === 'Enter' && onKeyPress) {
      // Don't prevent default - let parent's onKeyPress handle it
    }
  };

  const handleSelectSuggestion = (candidate) => {
    onChange(candidate.display_name);
    onSelect(candidate);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setSuggestions([]);
    lastSearchRef.current = '';
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow click on suggestion to register
    setTimeout(() => {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onKeyPress={(e) => {
          // Only handle Enter if dropdown is closed or no suggestion selected
          if (e.key === 'Enter' && (!showDropdown || selectedIndex < 0) && onKeyPress) {
            onKeyPress(e);
          }
        }}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '14px',
          boxSizing: 'border-box',
          backgroundColor: disabled ? '#f3f4f6' : 'white',
          cursor: disabled ? 'not-allowed' : 'text',
          ...style
        }}
      />
      
      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {isLoading ? (
            <div style={{
              padding: '12px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              Searching...
            </div>
          ) : searchError ? (
            <div style={{
              padding: '12px',
              color: '#ef4444',
              fontSize: '14px'
            }}>
              {searchError}
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{
              padding: '12px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              No suggestions found
            </div>
          ) : (
            suggestions.map((candidate, index) => (
              <div
                key={index}
                onClick={() => handleSelectSuggestion(candidate)}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: selectedIndex === index ? '#f0f9ff' : 'white',
                  borderBottom: index < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                  transition: 'background-color 0.15s'
                }}
              >
                <div style={{
                  fontWeight: '500',
                  fontSize: '14px',
                  color: '#111827',
                  marginBottom: '2px'
                }}>
                  {candidate.display_name.length > 60 
                    ? candidate.display_name.substring(0, 60) + '...'
                    : candidate.display_name}
                </div>
                {candidate.type && (
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    {candidate.type}
                    {candidate.class && ` • ${candidate.class}`}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

