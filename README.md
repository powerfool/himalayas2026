# Himalayas Route Visualizer

A local web application for planning and visualizing motorbike routes in the Indian Himalayas. Input itineraries from tour operators, extract waypoints, and visualize routes on an interactive map using OpenStreetMap.

![Himalayas Route Visualizer 2025-12-01 at 8 18 07 PM](https://github.com/user-attachments/assets/d6c88ae8-a97e-4f4e-acaa-c5d2bcb67fd8)


## Current Status

**Phases 0-9 Complete** - Full MVP with enhanced segment visualization and interaction!

**What works right now:**
- Route creation with Anthropic Claude LLM waypoint extraction
- **Global location search** - Search for locations anywhere in the world, not just India
- **Smart location prioritization** - Cities and towns appear before specific POIs (ATMs, schools, etc.) in search results
- **Location autocomplete** - Suggestions appear as you type in waypoint input and ambiguity resolution search
- **Smart geocoding** - Batch geocode all waypoints or geocode individual waypoints with one click
- Geocoding via Nominatim with ambiguity resolution UI and 15-second timeout handling
- Manual coordinate entry for failed/no-result geocoding
- **Waypoint editing** - Edit any waypoint to change its location, with search interface for finding new locations
- **Partial route recalculation** - When editing a waypoint, only affected route segments are recalculated (not the entire route)
- Route segment calculation (individual segments between waypoint pairs)
- **Automatic waypoint fallback routing** - When routing fails within 350m, system automatically searches for closest routable coordinate (starts 1000m from problematic waypoint, increases by 1000m steps)
- Progress tracking during segment calculation and fallback routing attempts
- **Map/Satellite view toggle** - Switch between OpenStreetMap and satellite imagery views
- Map visualization with distinct colors per segment
- Numbered waypoint markers showing sequence
- **Google Maps links** - Quick access to Google Maps for each waypoint to get more context
- **Segment length hover tooltips** - Hover over any segment to see its distance (e.g., "125.3 km" or "850 m"); segments store distance only (no duration)
- **Interactive segment highlighting** - Segments become thicker and more prominent when hovered
- **Trip calendar** - Map | Calendar tabs; in Calendar tab: assign each segment to a day (with cascade), set trip start date, see duration; list and grid views; gap/rest days supported; first segment can be Day 2+ so Day 1 can be a rest day; segment labels use short place names (e.g. Leh → Lamayuru)
- **Day notes** - Add notes per trip day in the calendar; popover editor, truncated preview on cards, persisted with the route
- **Coordinates preserved from autocomplete** - Selecting a location from autocomplete automatically includes coordinates (no geocoding needed)
- IndexedDB persistent storage (with automatic localStorage migration)

**Try it:** `npm run dev` → Create new route → Paste itinerary → Click "Extract Waypoints" → Geocode waypoints → Calculate Route → Open the **Calendar** tab to assign segments to days and set trip start date → Switch between List and Calendar views → Toggle Map tab for route editing and Save → Hover over segments on the map to see distances.

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

### Route Management
- **Create, Edit, and Save Routes**: Manage multiple routes with persistent storage
- **Route Library**: View and manage all your saved routes
- **Itinerary Parsing**: Automatically extract location names from pasted itinerary text using Anthropic Claude LLM

### Location Search & Geocoding
- **Global Location Search**: Search for locations anywhere in the world (not limited to India)
- **Smart Prioritization**: Search results prioritize cities and towns over specific POIs (ATMs, schools, etc.)
- **Location Autocomplete**: Get location suggestions as you type in waypoint editor and ambiguity resolution modal (debounced search, keyboard/mouse navigation)
- **Geocoding**: Convert location names to coordinates using OpenStreetMap Nominatim with ambiguity resolution
- **Timeout Handling**: 15-second timeout with proper error handling for geocoding requests
- **Single Waypoint Geocoding**: Geocode individual waypoints without geocoding all (click "Geocode" link next to ungeocoded waypoints)
- **Coordinate Preservation**: Selecting a location from autocomplete automatically includes coordinates, avoiding unnecessary geocoding
- **Manual Coordinate Entry**: Enter coordinates manually when geocoding fails or no results found

### Waypoint Management
- **Waypoint Editor**: Manually add, reorder, and remove waypoints
- **Waypoint Editing**: Edit any waypoint to change its location with search interface for finding new locations
- **Google Maps Integration**: Quick access to Google Maps for each waypoint to get more context about locations

### Route Calculation
- **Route Calculation**: Calculate routes between waypoints using OpenRouteService API
- **Partial Route Recalculation**: When editing a waypoint, only affected route segments are recalculated (not the entire route) - saves time and API calls
- **Smart Waypoint Fallback Routing**: Automatically finds closest routable coordinate when waypoint is unreachable within 350m (searches along straight line, starts 1000m from problematic waypoint)
- **Segment Visualization**: Each route segment displayed in distinct colors for easy identification; segments store distance only (no duration)
- **Segment Length Tooltips**: Hover over any segment line to see its distance (formatted as km or m)
- **Interactive Segment Highlighting**: Segments become thicker and more prominent when hovered for better visibility

### Trip Calendar & Day Notes
- **Map | Calendar tabs**: Map tab shows route editor (name, itinerary, waypoints, Geocode/Calculate, Save). Calendar tab shows only Trip days (start date, segment-day assignment, duration) and the calendar; no route settings or Save in calendar view.
- **Trip days**: Assign each segment to a day (min = previous segment’s day; first segment can be Day 1 or later so Day 1 can be a rest day). New routes get sequential days (1, 2, 3…). Changing a segment’s day cascades to later segments. Duration shown as Day 1 – Day N.
- **Calendar views**: List view (vertical day cards) and Calendar view (grid); buffer days before/after trip when start date is set; segments shown as short place names (e.g. Leh → Lamayuru).
- **Day notes**: Add notes per trip day (keyed by day number); "Add note" or note preview on each day card opens a popover to edit; notes persisted with the route and auto-saved.

### Map Visualization
- **Interactive Map**: Visualize routes on OpenStreetMap with waypoint markers and route polylines
- **Map/Satellite Toggle**: Switch between OpenStreetMap street view and satellite imagery views
- **Numbered Waypoint Markers**: Waypoints displayed with sequence numbers for easy identification

### User Experience
- **Progress Tracking**: Visual progress indicators during waypoint extraction, geocoding, and route calculation
- **Always-Visible Search**: Search button always available in ambiguity resolution modal, even when candidates are shown

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
   - Search works globally - try locations from anywhere in the world!
6. **Edit Waypoints** (optional):
   - Click "Edit" button next to any waypoint to change its location
   - Search interface opens directly for finding a new location
   - Select from search results or enter coordinates manually
   - Only affected route segments will be recalculated when you recalculate the route
7. **Calculate Route**: Click "Calculate Route" - system automatically handles unreachable waypoints by finding closest routable coordinates
8. **Trip calendar**: Open the **Calendar** tab. Set "Trip start (Day 1)" and assign each segment to a day (first segment can be Day 2+ for a rest day on Day 1; changing a segment’s day cascades to later segments). Use List or Calendar view; add day notes if needed.
9. **View routes**: On the **Map** tab, toggle map/satellite, hover over segments to see distances, click waypoints for details. **Save Route** is only shown on the Map tab; click it to persist your work (trip days and notes are included and auto-saved with other changes).

You can edit existing routes by clicking on them in the library view. When you edit a waypoint in an existing route and recalculate, only the affected segments are recalculated, making route refinement much faster.

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
