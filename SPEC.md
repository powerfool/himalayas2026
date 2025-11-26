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
- **Purpose**: Convert place names to coordinates
- **Input**: Place name string
- **Output**: Array of candidate locations with coordinates
- **Rate Limiting**: Respect 1 request/second limit
- **Error Handling**: Handle no results, show manual entry option

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
- `MapView.jsx`: Add segment visualization
- Add ambiguity resolution UI component

## Success Criteria

MVP is successful when:
1. User can paste itinerary text and see waypoints extracted
2. Waypoints geocode correctly (with ambiguity handling)
3. Route displays on map with proper routing (not straight lines)
4. Route segments are visually distinct
5. Route saves and loads from IndexedDB
6. User can iterate on routes over multiple sessions

