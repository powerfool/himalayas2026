# Himalayas Route Visualizer - Implementation Plan

## Overview

This plan implements the MVP: paste itinerary → LLM extract waypoints → geocode with ambiguity handling → calculate route segments → visualize on map → save to IndexedDB.

Reference: See `SPEC.md` for detailed requirements and architecture.

## Phase 0: Prerequisites & Setup

**Goal:** Verify environment works, install dependencies, confirm existing code runs.

**Files:**
- Verify `package.json` dependencies
- Create `.env.local` template for API keys
- Verify Vite dev server runs

**Tasks:**
1. Check Node.js version (v16+)
2. Install dependencies: `npm install`
3. Verify existing app runs: `npm run dev`
4. Test existing route creation flow (regex parser) works
5. Create `.env.local.example` with Anthropic API key placeholder
6. Document required API keys in README

**Done means:**
- Dev server starts without errors
- Existing route creation flow works (even if using regex parser)
- `.env.local.example` exists with clear instructions

**Test it:**
1. Run `npm run dev`
2. Navigate to app URL
3. Create new route, paste sample text, click "Parse Locations"
4. Verify waypoints appear (may be incomplete, that's OK)
5. Verify map displays

---

## Phase 1: LLM Waypoint Extraction

**Goal:** Replace regex parser with Anthropic Claude API to extract structured waypoints from unstructured text.

**Files:**
- `src/utils/anthropicService.js` (new)
- `src/components/RouteEditor.jsx` (modify)
- `src/utils/routeParser.js` (deprecate, keep for fallback)

**Tasks:**
1. Install `@anthropic-ai/sdk` package
2. Create `src/utils/anthropicService.js`:
   - Function to call Anthropic API with itinerary text
   - Prompt engineering: extract waypoint names in sequence order
   - Return structured JSON: `{ waypoints: [{ name, sequence, context }] }`
   - Error handling and retry logic
3. Update `RouteEditor.jsx`:
   - Replace `extractLocationNames` call with Anthropic service
   - Handle loading state during LLM extraction
   - Display extracted waypoints for user review
   - Show error message if extraction fails
4. Load Anthropic API key from `VITE_ANTHROPIC_API_KEY` env variable
5. Add error boundary for API failures

**Done means:**
- User pastes itinerary text and clicks "Extract Waypoints"
- LLM extracts waypoint names in correct sequence
- Waypoints display in UI for review
- Error handling works if API fails

**Test it:**
1. Start dev server
2. Create new route
3. Paste sample itinerary (e.g., "Day 7: Hanle to Tsomoriri...")
4. Click "Extract Waypoints"
5. Verify waypoints extracted: ["Hanle", "Tsomoriri", "Tsokar", "Leh"] (or similar)
6. Verify waypoints appear in correct sequence
7. Test with invalid API key - verify error message shows

---

## Phase 2: Geocoding Ambiguity Resolution

**Goal:** Add UI to handle geocoding ambiguities - show multiple candidates, allow selection or manual entry.

**Files:**
- `src/components/AmbiguityResolution.jsx` (new)
- `src/utils/openRouteService.js` (modify geocoding functions)
- `src/components/RouteEditor.jsx` (modify)

**Tasks:**
1. Update `geocodeLocation` in `openRouteService.js`:
   - Return all candidates (not just first result)
   - Return structure: `{ candidates: [{ lat, lng, display_name, ... }] }`
   - Handle "no results" case
2. Create `AmbiguityResolution.jsx` component:
   - Modal/panel showing candidate locations
   - List each candidate with details (name, coordinates, region)
   - "Select" button for each candidate
   - "Manual Entry" button to input lat/lng directly
   - "Skip" option (with warning)
3. Update `RouteEditor.jsx`:
   - After LLM extraction, geocode each waypoint
   - If multiple candidates, show `AmbiguityResolution` component
   - Store selected coordinates
   - Handle manual coordinate entry
   - Show progress indicator during geocoding
4. Respect Nominatim rate limit (1 request/second)

**Done means:**
- When waypoint has multiple geocoding results, UI shows selection options
- User can select correct location from list
- User can manually enter coordinates if needed
- Geocoding progress visible during batch operations

**Test it:**
1. Extract waypoints from itinerary
2. For ambiguous location (e.g., "Leh" might have multiple results), verify selection UI appears
3. Select a candidate - verify coordinates stored
4. Test manual coordinate entry
5. Test "no results" case - verify manual entry option available
6. Verify rate limiting works (no errors from too many requests)

---

## Phase 3: Storage Migration to IndexedDB

**Goal:** Migrate from localStorage to IndexedDB for persistent, future-proof storage.

**Files:**
- `src/utils/storage.js` (rewrite)
- `src/utils/indexedDB.js` (new, helper functions)
- `package.json` (add `idb` dependency)

**Tasks:**
1. Install `idb` package for IndexedDB wrapper
2. Create `src/utils/indexedDB.js`:
   - Database initialization
   - Schema: `routes` store with indexes on `name`, `createdAt`, `updatedAt`
   - Helper functions for open/close database
3. Rewrite `src/utils/storage.js`:
   - Replace localStorage calls with IndexedDB operations
   - Keep same function signatures: `getAllRoutes()`, `getRoute(id)`, `saveRoute(route)`, `deleteRoute(id)`
   - Add migration: on first load, check localStorage, migrate data if exists
   - Handle IndexedDB errors gracefully
4. Update `RouteEditor.jsx` if needed (should work with same storage API)
5. Test data persistence across browser sessions

**Done means:**
- Routes save to IndexedDB instead of localStorage
- Existing localStorage data migrates automatically
- Routes persist across browser restarts
- Storage functions work identically to before

**Test it:**
1. Create and save a route
2. Close browser completely
3. Reopen browser, navigate to app
4. Verify route still exists in library
5. Verify route data intact (waypoints, polyline, etc.)
6. Check browser DevTools → Application → IndexedDB → verify data stored
7. Test migration: add data to localStorage manually, reload app, verify migrated

---

## Phase 4: Route Segments Calculation

**Goal:** Calculate route segments between consecutive waypoints, store segment data, handle segment-level errors.

**Files:**
- `src/utils/openRouteService.js` (modify)
- `src/components/RouteEditor.jsx` (modify)
- `src/utils/storage.js` (update data model)

**Tasks:**
1. Update route data model:
   - Add `segments` array to route: `[{ fromWaypointId, toWaypointId, polyline, distance, duration }]`
   - Keep `routePolyline` for backward compatibility (can be derived from segments)
2. Modify `calculateRoute` in `openRouteService.js`:
   - Accept single waypoint pair (from, to)
   - Return segment data: `{ polyline, distance, duration }`
3. Add `calculateRouteSegments` function:
   - Takes array of waypoints
   - For each consecutive pair, call `calculateRoute`
   - Return array of segments
   - Handle individual segment failures (continue with others)
4. Update `RouteEditor.jsx`:
   - Replace single `calculateRoute` call with `calculateRouteSegments`
   - Store segments in route data
   - Show progress for each segment calculation
   - Handle partial failures (some segments succeed, some fail)
5. Update save/load to include segments

**Done means:**
- Route calculation creates segments between each waypoint pair
- Segments stored with route data
- Individual segment failures don't break entire route
- Progress visible during segment calculation

**Test it:**
1. Create route with 3+ waypoints
2. Click "Calculate Route"
3. Verify segments calculated for each pair (waypoint 1→2, 2→3, etc.)
4. Verify route displays correctly on map
5. Save route, reload app, verify segments persist
6. Test with route that has routing failure - verify other segments still work

---

## Phase 5: Segment Visualization on Map

**Goal:** Display route segments distinctly on map (different colors/styles per segment), show waypoint sequence numbers.

**Files:**
- `src/components/MapView.jsx` (modify)
- `src/components/RouteEditor.jsx` (update data passed to MapView)

**Tasks:**
1. Update `MapView.jsx`:
   - Accept `segments` prop (array of segment objects)
   - Render each segment as separate `Polyline` with distinct color
   - Use color palette (e.g., blue, green, orange, purple) cycling through segments
   - Keep backward compatibility: if `routePolyline` exists but no segments, use single polyline
2. Update waypoint markers:
   - Show sequence number on marker (1, 2, 3, etc.)
   - Use numbered markers or add text labels
3. Update `RouteEditor.jsx`:
   - Pass `segments` array to `MapView` instead of/alongside `routePolyline`
4. Ensure map auto-fits bounds to show all waypoints and route

**Done means:**
- Each route segment displays in different color on map
- Waypoint markers show sequence numbers
- Map clearly shows route progression through segments
- Entire route visible without manual zooming

**Test it:**
1. Load route with multiple segments
2. Verify each segment has different color on map
3. Verify waypoint markers numbered correctly (1, 2, 3...)
4. Verify map auto-fits to show entire route
5. Test zoom/pan controls work
6. Verify route segments connect waypoints correctly

---

## Phase 6: Polish & Error Handling

**Goal:** Improve error messages, loading states, and user feedback throughout the flow.

**Files:**
- All component files (incremental improvements)

**Tasks:**
1. Add loading indicators for each phase:
   - LLM extraction: "Extracting waypoints..."
   - Geocoding: "Geocoding waypoints... (X of Y)"
   - Route calculation: "Calculating routes... (X of Y segments)"
2. Improve error messages:
   - Specific messages for each failure type
   - Actionable guidance (e.g., "Try manual coordinate entry")
   - Retry buttons where appropriate
3. Add success confirmations:
   - "Waypoints extracted successfully"
   - "Route calculated successfully"
4. Handle edge cases:
   - Empty itinerary text
   - No waypoints extracted
   - All geocoding failures
   - All route calculation failures
5. Add keyboard shortcuts (optional, nice-to-have)

**Done means:**
- User always knows what's happening (loading states)
- Errors are clear and actionable
- Success states confirmed
- Edge cases handled gracefully

**Test it:**
1. Test each error scenario:
   - Invalid API key
   - Network failure
   - No geocoding results
   - Route calculation failure
2. Verify loading states appear during each phase
3. Verify success messages appear
4. Test with empty/invalid inputs

---

## Success Criteria

MVP complete when:
1. ✅ User pastes itinerary → LLM extracts waypoints correctly
2. ✅ Ambiguous geocoding shows selection UI
3. ✅ Route segments calculate and display distinctly on map
4. ✅ Routes save to IndexedDB and persist across sessions
5. ✅ User can iterate on routes over multiple sessions
6. ✅ All error cases handled gracefully

## Notes

- Each phase is stoppable - app works after any phase completes
- Focus on MVP scope only - no extra features
- Test manually after each phase
- Keep code simple and maintainable
- Reference SPEC.md for detailed requirements

