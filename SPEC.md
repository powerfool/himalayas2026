# Himalayas Route Visualizer - Technical Specification

## Overview

A local web application for visualizing motorbike routes in the Indian Himalayas. Users paste unstructured itinerary text from tour operators, extract waypoints using LLM, geocode locations, and visualize routes on an interactive map with OpenRouteService routing.

## Goals

- Enable research and understanding of different Himalayan routes
- Visualize itineraries on a map to understand route structure
- Build intelligence about routes, villages, stops, and accommodations over time
- Foundation for future cloud deployment and offline mobile use

## Scope

### In Scope (MVP)

**Core Flow:**
1. User inputs route name and pastes unstructured itinerary text
2. LLM (Anthropic Claude) extracts structured waypoint data from text
3. System geocodes waypoint names to coordinates (with ambiguity handling)
4. OpenRouteService calculates route segments between waypoints
5. Map displays route with waypoint markers and route polylines
6. Route saves to persistent storage (IndexedDB)
7. User can load saved routes for viewing/editing

**Key Features:**
- Route name input
- Itinerary text paste area
- LLM-based waypoint extraction (Anthropic API)
- Geocoding with ambiguity resolution UI
- Route calculation via OpenRouteService
- Interactive map (OpenStreetMap via Leaflet)
- Route segments visually distinct on map
- Zoom and pan controls
- Persistent storage (IndexedDB)
- Save/load routes

**Data Structure:**
- Route: `{ id, name, itineraryText, waypoints[], segments[], createdAt, updatedAt }`
- Waypoint: `{ id, name, coordinates: { lat, lng }, originalText, sequence }`
- Segment: `{ fromWaypointId, toWaypointId, polyline, distance, duration }`

### Out of Scope (Parking Lot)

- Multiple route comparison (future)
- Route editing after creation (future)
- Waypoint notes/descriptions UI (future)
- Village/stop information database (future)
- Accommodation markers (future)
- Distance/duration calculations display (future)
- Route export/import (future)
- Cloud sync (future)
- Offline mode (future)
- Mobile optimization (future)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React App (Vite)                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────┐ │
│  │ RouteForm    │───▶│ RouteEditor  │───▶│ MapView  │ │
│  │              │    │              │    │          │ │
│  │ - Name input │    │ - LLM extract│    │ - Leaflet│ │
│  │ - Text paste │    │ - Geocode    │    │ - Markers│ │
│  └──────────────┘    │ - Calculate  │    │ - Routes │ │
│                      │ - Save       │    └──────────┘ │
│                      └──────────────┘                  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Service Layer                        │  │
│  │  - Anthropic API (waypoint extraction)           │  │
│  │  - Nominatim (geocoding)                         │  │
│  │  - OpenRouteService (route calculation)          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Storage Layer                        │  │
│  │  - IndexedDB (persistent storage)                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Main User Flow: Create and Visualize Route

1. **Input Phase**
   - User enters route name
   - User pastes itinerary text
   - User clicks "Extract Waypoints"

2. **LLM Extraction Phase**
   - App sends itinerary text to Anthropic API
   - LLM returns structured JSON: `{ waypoints: [{ name, sequence, context }] }`
   - App displays extracted waypoints for review

3. **Geocoding Phase**
   - For each waypoint, app queries Nominatim API
   - If ambiguous (multiple results), show selection UI
   - User selects correct location or manually enters coordinates
   - Waypoint coordinates stored

4. **Route Calculation Phase**
   - For each consecutive waypoint pair, query OpenRouteService
   - Store route segment with polyline coordinates
   - Calculate segment distance/duration if available

5. **Visualization Phase**
   - Map renders waypoint markers
   - Map renders route polylines between waypoints
   - Segments visually distinct (different colors or styles)
   - Map centers on route bounds

6. **Save Phase**
   - User clicks "Save Route"
   - Route data stored in IndexedDB
   - User returns to library view

## Components

### RouteForm
- Route name input field
- Large textarea for itinerary paste
- "Extract Waypoints" button (triggers LLM)
- Loading state during extraction

### RouteEditor
- Orchestrates extraction → geocoding → routing → visualization
- Manages waypoint ambiguity resolution UI
- Save/Cancel buttons
- Progress indicators for each phase

### MapView
- Leaflet map with OpenStreetMap tiles
- Waypoint markers (numbered by sequence)
- Route polylines (colored by segment)
- Zoom/pan controls
- Auto-fit bounds to show entire route

### AmbiguityResolution
- Modal/panel showing geocoding results
- List of candidate locations with details
- "Select" button for each candidate
- "Manual Entry" option for coordinates

### WaypointInputAutocomplete (New Component)
- Text input with autocomplete dropdown
- Debounced search as user types
- Suggestions list with location names and types
- Keyboard navigation (arrow keys, Enter, Escape)
- Mouse interaction for selection
- Loading state during search
- Error handling for API failures

## API Integrations

### Anthropic Claude API
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Purpose**: Extract waypoints from unstructured text
- **Input**: Itinerary text string
- **Output**: Structured JSON with waypoint names and sequence
- **Error Handling**: Retry logic, fallback to manual entry
- **Security**: API key stored in environment variable, never exposed to client

### Nominatim (OpenStreetMap Geocoding)
- **Endpoint**: `https://nominatim.openstreetmap.org/search`
- **Purpose**: Convert place names to coordinates, provide location search suggestions
- **Input**: Place name string (for geocoding) or partial search query (for autocomplete)
- **Output**: Array of candidate locations with coordinates
- **Rate Limiting**: Respect 1 request/second limit (critical for autocomplete - use debouncing and request queuing)
- **Error Handling**: Handle no results, show manual entry option
- **Autocomplete Usage**: Same endpoint, called with debouncing as user types, limit results to 5 suggestions

### OpenRouteService
- **Endpoint**: `https://api.openrouteservice.org/v2/directions/driving-car`
- **Purpose**: Calculate route between waypoints
- **Input**: Start/end coordinates
- **Output**: Route polyline, distance, duration
- **API Key**: Required (free tier available)
- **Error Handling**: Handle routing failures, show straight line fallback

## Storage

### IndexedDB Schema

**Routes Store:**
- Key: `id` (UUID)
- Value: Route object with all waypoints and segments
- Indexes: `name`, `createdAt`, `updatedAt`

**Migration Path:**
- Current localStorage implementation can be migrated
- Export/import JSON functionality for backup
- Structure data models to easily swap to backend API later

## Error Handling

### LLM Extraction Failures
- Show error message
- Allow manual waypoint entry as fallback
- Retry button available

### Geocoding Ambiguities
- Always show selection UI when multiple results
- Clear indication of ambiguity
- Manual coordinate entry option always available

### Geocoding Failures
- Show "Location not found" message
- Provide manual coordinate entry
- Allow skipping waypoint (with warning)

### Route Calculation Failures
- Show warning message
- Fallback to straight line between waypoints
- Allow retry

### Waypoint Fallback Routing (New Feature)
When OpenRouteService cannot find a route within 350 meters of a waypoint (waypoint B), the system should automatically attempt to find the closest routable coordinate on the straight line between the previous waypoint (A) and the problematic waypoint (B).

**Algorithm:**
1. Detect routing failure for segment A→B (when OpenRouteService returns error indicating no route found within 350m)
2. Calculate straight line between waypoint A and waypoint B
3. Start at a point 100 meters away from B (toward A) on this line
4. Attempt to route from A to this test coordinate
5. If routing succeeds, use this coordinate as the adjusted waypoint B
6. If routing fails, increase distance by 100 meters (200m, 300m, 400m, etc.) and retry
7. Continue until a routable coordinate is found or maximum distance is reached (e.g., halfway between A and B)
8. If successful, replace waypoint B coordinates with the adjusted coordinates
9. Store original waypoint B coordinates for reference (optional: mark as adjusted)

**Implementation Details:**
- Add utility function to calculate coordinate on line at specific distance: `calculatePointOnLine(from, to, distanceFromTo)`
- Add utility function to calculate distance between two coordinates (Haversine formula)
- Modify `calculateRouteSegments` to catch routing failures and trigger fallback logic
- Add new function `findRoutableCoordinate(from, to, stepSize = 100, maxDistance = null)` that implements the search algorithm
- Update waypoint data structure to optionally track if coordinates were adjusted (for future UI indication)

**Edge Cases:**
- If no routable coordinate found within reasonable distance, fall back to original error handling
- Maximum search distance should be half the straight-line distance between A and B (not configurable)
- Rate limiting: each fallback attempt is a new API call, so respect API limits
- Progress indication: show user that fallback routing is in progress

**Data Structure Changes:**
- Waypoint: Add optional `adjusted: boolean` flag and `originalCoordinates: {lat, lng}` if adjusted

### Waypoint Input Autocomplete (New Feature)
Add autocomplete suggestions to location input fields to help users quickly find and select locations as they type. Available in two places: the waypoint input field in WaypointEditor (for manually adding waypoints) and the search input field in AmbiguityResolution modal (for searching with different names when geocoding fails).

**User Flow:**
1. User starts typing in the waypoint input field
2. After a short delay (debounce), system queries Nominatim search API
3. Suggestions dropdown appears below input showing matching locations
4. User can navigate suggestions with keyboard (arrow keys, Enter) or mouse
5. Selecting a suggestion fills the input and optionally auto-adds the waypoint with coordinates
6. User can continue typing to refine search or ignore suggestions

**Implementation Details:**
- Add debounced search function that queries Nominatim search endpoint as user types
- Debounce delay: 300-500ms to balance responsiveness with API rate limits
- Show suggestions dropdown below input field when results available
- Display up to 5 suggestions (limit to respect API and keep UI clean)
- Each suggestion shows: location name (display_name), type/class if available
- Suggestions sorted by importance (Nominatim provides importance score)
- Handle keyboard navigation: Arrow Up/Down to navigate, Enter to select, Escape to close
- Handle mouse interaction: Click to select suggestion
- Close dropdown when: suggestion selected, user clicks outside, Escape pressed, input loses focus
- Respect Nominatim rate limit: 1 request/second (debouncing helps, but may need request queuing)
- Show loading indicator in dropdown while fetching suggestions
- Handle errors gracefully: show "No suggestions found" or hide dropdown on error

**UI/UX Requirements:**
- Dropdown positioned directly below input field
- Dropdown styled consistently with existing UI (white background, border, shadow)
- Highlighted suggestion on hover/keyboard navigation
- Selected suggestion visually distinct (background color change)
- Input field remains functional - user can continue typing even with dropdown open
- Option to auto-add waypoint on selection (with coordinates pre-filled) OR just fill input
- Show location type/class in suggestion if available (e.g., "city", "village", "pass")

**Integration Points:**
- Create reusable `AutocompleteInput` component for both locations
- Extend `WaypointEditor` component to use `AutocompleteInput` for waypoint input field
- Extend `AmbiguityResolution` component to use `AutocompleteInput` for search input field
- Create new `searchLocations` function in `openRouteService.js` (or extend `geocodeLocation`)
- New function should return same candidate format for consistency
- Optionally pre-fill coordinates when suggestion selected in WaypointEditor (skip geocoding step)
- In AmbiguityResolution, selecting suggestion fills input and can trigger search automatically

**Edge Cases:**
- User types very fast - debouncing prevents excessive API calls
- No results found - show "No suggestions" message or hide dropdown
- Network error - hide dropdown gracefully, don't block input
- Rate limit exceeded - queue requests or show message, don't break input
- User selects suggestion then continues typing - clear selection, show new suggestions
- Very long location names - truncate in dropdown with ellipsis, show full name on hover
- Special characters in search - properly encode for URL

**Out of Scope (Parking Lot):**
- Recent searches/history (future enhancement)
- Favorite locations (future enhancement)
- Search by coordinates (already supported via manual entry)
- Multi-language support (future enhancement)
- Search filters (country, type, etc.) - keep simple for MVP

### Segment Length Hover Tooltip (New Feature)
Display segment distance information when user hovers over route segment lines on the map. This helps users quickly understand the length of each segment without needing to inspect waypoint details or calculate manually.

**User Flow:**
1. User views route on map with multiple colored segment lines
2. User hovers mouse cursor over any segment line
3. Tooltip appears near cursor showing segment distance (e.g., "125.3 km" or "78.2 mi")
4. Tooltip follows cursor movement while hovering over segment
5. Tooltip disappears when cursor moves away from segment

**Implementation Details:**
- Use Leaflet's `Tooltip` component from react-leaflet for each Polyline
- Attach tooltip to segment polylines using `eventHandlers` prop
- Format distance from meters to user-friendly units (km for >1km, m for <1km)
- Display distance with 1 decimal place precision
- Use segment's existing `distance` property (already available in segment data structure)
- Tooltip should appear with minimal delay (50-100ms) for responsive feel
- Position tooltip near cursor but offset to avoid obscuring segment line
- Handle segments without distance data gracefully (show "Distance unknown" or hide tooltip)

**UI/UX Requirements:**
- Tooltip styled consistently with Leaflet default tooltips (white background, dark text, shadow)
- Font size: 12-14px for readability
- Show distance in kilometers (km) for values >= 1km, meters (m) for values < 1km
- Format: "125.3 km" or "850 m" (no trailing zeros, 1 decimal place max)
- Tooltip appears on hover, disappears on mouseout
- Tooltip positioned dynamically to stay visible within map bounds
- Optional: Show duration if available (e.g., "125.3 km (2h 15m)") - only if duration data exists
- Tooltip should not interfere with map interactions (panning, zooming)

**Integration Points:**
- Extend `MapView.jsx` component to add Tooltip to each Polyline segment
- Use react-leaflet's `Tooltip` component (already available via react-leaflet)
- Access segment distance from `segment.distance` property (already in data structure)
- Create utility function `formatDistance(meters)` in `geoUtils.js` for consistent formatting
- Tooltip content: format distance using utility function
- Handle edge case: segments without distance property (calculated routes should always have distance, but handle gracefully)

**Edge Cases:**
- Segment has no distance data - show "Distance not available"
- Distance is 0 or invalid - don't show tooltip
- Multiple segments overlap at same point - show length of both segments in the same tooltip
- User hovers very quickly - tooltip should appear/disappear smoothly without flickering
- Map is zoomed out with many segments - tooltip still works but may be harder to target specific segments
- Segment polyline is very short - tooltip still appears but may be harder to hover

**Out of Scope (Parking Lot):**
- Click interaction to show permanent segment info panel
- Segment duration display (unless already in data structure)
- Segment elevation profile on hover
- Segment statistics (average speed, etc.)
- Custom tooltip styling beyond Leaflet defaults
- Tooltip animations/transitions
- Selecting between metric and imperial

### Storage Failures
- Show error message
- Provide export option to save data manually
- Graceful degradation

## Security Considerations

- Anthropic API key in environment variable (`.env.local`)
- Never expose API keys in client-side code
- Rate limiting for external APIs
- Input sanitization for user text
- CORS handling for API calls

## Technology Stack

- **Frontend**: React 19 + Vite
- **Maps**: Leaflet + React-Leaflet
- **Storage**: IndexedDB (via idb library)
- **LLM**: Anthropic Claude API
- **Geocoding**: Nominatim (OpenStreetMap)
- **Routing**: OpenRouteService API
- **Styling**: Inline styles (minimal, focus on functionality)

## Existing Codebase Integration

### Reuse
- React component structure
- Vite build setup
- Leaflet map integration pattern
- Route data models (extend as needed)

### Replace
- `routeParser.js`: Replace regex parser with LLM service
- `storage.js`: Migrate from localStorage to IndexedDB
- Waypoint extraction logic: Use Anthropic API

### Extend
- `RouteEditor.jsx`: Add LLM extraction flow
- `MapView.jsx`: Add segment visualization, add hover tooltips for segment distances
- Add ambiguity resolution UI component
- `WaypointEditor.jsx`: Add autocomplete functionality to waypoint input
- `openRouteService.js`: Add location search function for autocomplete (or extend geocodeLocation)
- `geoUtils.js`: Add distance formatting utility function

## Success Criteria

MVP is successful when:
1. User can paste itinerary text and see waypoints extracted
2. Waypoints geocode correctly (with ambiguity handling)
3. Route displays on map with proper routing (not straight lines)
4. Route segments are visually distinct
5. Route saves and loads from IndexedDB
6. User can iterate on routes over multiple sessions

