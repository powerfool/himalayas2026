# Himalayas Route Visualizer

A local web application for planning and visualizing motorbike routes in the Indian Himalayas. Input itineraries from tour operators, extract waypoints, and visualize routes on an interactive map using OpenStreetMap.

## Current Status

**Phases 0-9 Complete** - Full MVP with enhanced segment visualization and interaction!

**What works right now:**
- Route creation with Anthropic Claude LLM waypoint extraction
- **Location autocomplete** - Suggestions appear as you type in waypoint input and ambiguity resolution search
- **Smart geocoding** - Batch geocode all waypoints or geocode individual waypoints with one click
- Geocoding via Nominatim with ambiguity resolution UI
- Manual coordinate entry for failed/no-result geocoding
- Route segment calculation (individual segments between waypoint pairs)
- **Automatic waypoint fallback routing** - When routing fails within 350m, system automatically searches for closest routable coordinate (starts 1000m from problematic waypoint, increases by 1000m steps)
- Progress tracking during segment calculation and fallback routing attempts
- Map visualization with distinct colors per segment
- Numbered waypoint markers showing sequence
- **Segment length hover tooltips** - Hover over any segment to see its distance (e.g., "125.3 km" or "850 m")
- **Interactive segment highlighting** - Segments become thicker and more prominent when hovered
- **Coordinates preserved from autocomplete** - Selecting a location from autocomplete automatically includes coordinates (no geocoding needed)
- IndexedDB persistent storage (with automatic localStorage migration)

**Try it:** `npm run dev` → Create new route → Paste itinerary → Click "Extract Waypoints" → Type location names with autocomplete suggestions → Click "Geocode Waypoints" (or geocode individual waypoints) → Calculate Route → System automatically handles unreachable waypoints → Hover over colored segments to see distances!

## Setup

**Required API Keys:**
- **Anthropic API key**: Get from https://console.anthropic.com/
- **OpenRouteService API key**: Get free key from https://openrouteservice.org/dev/#/signup

Create `.env.local` file with:
```
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here
VITE_ORS_API_KEY=your_ors_key_here
```

**Note:** If you don't set `VITE_ORS_API_KEY`, the app will use a demo key (may have rate limits).

## Features

- **Route Management**: Create, edit, and save multiple routes with persistent storage
- **Itinerary Parsing**: Automatically extract location names from pasted itinerary text using Anthropic Claude LLM
- **Interactive Map**: Visualize routes on OpenStreetMap with waypoint markers and route polylines
- **Segment Visualization**: Each route segment displayed in distinct colors for easy identification
- **Segment Length Tooltips**: Hover over any segment line to see its distance (formatted as km or m)
- **Interactive Segment Highlighting**: Segments become thicker and more prominent when hovered for better visibility
- **Geocoding**: Convert location names to coordinates using OpenStreetMap Nominatim with ambiguity resolution
- **Location Autocomplete**: Get location suggestions as you type in waypoint editor and ambiguity resolution modal (debounced search, keyboard/mouse navigation)
- **Single Waypoint Geocoding**: Geocode individual waypoints without geocoding all (click "Geocode" link next to ungeocoded waypoints)
- **Route Calculation**: Calculate routes between waypoints using OpenRouteService API
- **Smart Waypoint Fallback Routing**: Automatically finds closest routable coordinate when waypoint is unreachable within 350m (searches along straight line, starts 1000m from problematic waypoint)
- **Coordinate Preservation**: Selecting a location from autocomplete automatically includes coordinates, avoiding unnecessary geocoding
- **Waypoint Editor**: Manually add, edit, reorder, and remove waypoints
- **Progress Tracking**: Visual progress indicators during waypoint extraction, geocoding, and route calculation

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

## Usage

1. **Create a New Route**: Click "New Route" from the main library view
2. **Enter Route Details**: 
   - Enter a route name
   - Paste your itinerary text in the text area
3. **Extract Waypoints**: Click "Extract Waypoints" to automatically extract location names using LLM
4. **Add Waypoints Manually** (optional):
   - Type location names in the waypoint input - autocomplete suggestions appear as you type
   - Select a suggestion to automatically include coordinates (no geocoding needed)
   - Or type a name and click "Add" to add it for later geocoding
5. **Geocode Waypoints**: 
   - Click "Geocode Waypoints" to batch geocode all ungeocoded waypoints
   - Or click "Geocode" link next to individual waypoints to geocode one at a time
   - Resolve ambiguities when multiple locations are found
   - Use autocomplete in the search field when searching with different names
6. **Calculate Route**: Click "Calculate Route" - system automatically handles unreachable waypoints by finding closest routable coordinates
7. **Save Route**: Click "Save Route" to persist your work

You can edit existing routes by clicking on them in the library view.

## Technology Stack

- **React + Vite**: Frontend framework
- **Leaflet + React-Leaflet**: Map visualization with OpenStreetMap
- **OpenRouteService API**: Route calculation
- **Nominatim (OpenStreetMap)**: Geocoding service
- **IndexedDB** (via idb package): Persistent data storage

## Data Storage

Routes are stored locally in your browser's IndexedDB. All data persists between sessions. If you have existing routes in localStorage, they will be automatically migrated to IndexedDB on first load.

## Future Enhancements

- Multiple route comparison
- Offline mode support
- Cloud hosting and sync
- More sophisticated itinerary parsing
- Village/stop information database
- Accommodation markers
- Route export/import
