# Himalayas Route Visualizer

A local web application for planning and visualizing motorbike routes in the Indian Himalayas. Input itineraries from tour operators, extract waypoints, and visualize routes on an interactive map using OpenStreetMap.

## Current Status

**Phases 0-1 Complete** - LLM waypoint extraction working!

**What works right now:**
- Route creation with Anthropic Claude LLM waypoint extraction
- Geocoding via Nominatim (separate step after extraction)
- Route calculation via OpenRouteService
- Map visualization with Leaflet
- localStorage persistence

**Try it:** `npm run dev` → Create new route → Paste itinerary → Click "Extract Waypoints" → Geocode → Calculate Route

**Next:** Phase 2 - Add geocoding ambiguity resolution UI

## Setup

**Required API Keys:**
- Anthropic API key (for Phase 1): Get from https://console.anthropic.com/
- Create `.env.local` file with: `VITE_ANTHROPIC_API_KEY=your_key_here`

## Features

- **Route Management**: Create, edit, and save multiple routes with persistent storage
- **Itinerary Parsing**: Automatically extract location names from pasted itinerary text
- **Interactive Map**: Visualize routes on OpenStreetMap with waypoint markers and route polylines
- **Geocoding**: Convert location names to coordinates using OpenStreetMap Nominatim
- **Route Calculation**: Calculate routes between waypoints using OpenRouteService API
- **Waypoint Editor**: Manually add, edit, reorder, and remove waypoints

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
3. **Parse Locations**: Click "Parse Locations from Text" to extract location names
4. **Geocode Waypoints**: Click "Geocode Waypoints" to convert location names to coordinates
5. **Calculate Route**: Click "Calculate Route" to generate the route polyline
6. **Save Route**: Click "Save Route" to persist your work

You can also manually add waypoints using the waypoint editor, and edit existing routes by clicking on them in the library view.

## Technology Stack

- **React + Vite**: Frontend framework
- **Leaflet + React-Leaflet**: Map visualization with OpenStreetMap
- **OpenRouteService API**: Route calculation
- **Nominatim (OpenStreetMap)**: Geocoding service
- **localStorage**: Persistent data storage

## Data Storage

Routes are stored locally in your browser's localStorage. All data persists between sessions.

## Future Enhancements

- Multiple route comparison
- Offline mode support
- Cloud hosting and sync
- More sophisticated itinerary parsing
- Village/stop information database
- Accommodation markers
- Route export/import
