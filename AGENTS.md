# Agent Instructions

## How to Work on This Project

This document provides timeless guidance on HOW to work on the Himalayas Route Visualizer. For WHAT to build, see `SPEC.md` and `PLAN.md`.

## Project Context

**Working Directory:** `/Users/dimitris/Dropbox (Personal)/Projects/himalayas2026`

**Source of Truth:** 
- Requirements: `SPEC.md` (in project root)
- Implementation plan: `PLAN.md` (in project root)
- Current status: `README.md` (in project root)

**Tech Stack:**
- React 19 + Vite
- Leaflet + React-Leaflet for maps
- IndexedDB for storage (via `idb` package)
- Anthropic Claude API for LLM extraction
- Nominatim (OpenStreetMap) for geocoding
- OpenRouteService for route calculation

## Framework-Specific Patterns

### React + Vite (CRITICAL)

**Hot Reload:**
- Component changes: Hot reload works ✅
- New files: May require manual refresh ⚠️
- Environment variables: Require dev server restart ⚠️

**Environment Variables:**
- Must be prefixed with `VITE_` to be accessible in client code
- Store in `.env.local` (never commit this file)
- Create `.env.local.example` with placeholders
- After adding new env vars, restart dev server: `npm run dev`

**Component Structure:**
- Keep components in `src/components/`
- Utilities in `src/utils/`
- Use functional components with hooks
- Prefer inline styles for MVP (minimal dependencies)

### Leaflet Maps (CRITICAL)

**Marker Icons:**
- Default Leaflet icons don't work in React-Leaflet without explicit setup
- Icon fix required in `MapView.jsx` (see existing code)
- Don't remove the icon URL fix - it's necessary

**Coordinate Systems:**
- Leaflet uses `[lat, lng]` format
- OpenRouteService returns `[lng, lat]` - must convert
- Nominatim returns `lat`/`lon` separately - combine into `[lat, lng]`

**Map Bounds:**
- Use `FitBounds` component pattern (see existing `MapView.jsx`)
- Auto-fit to waypoints on route load
- Add padding: `{ padding: [50, 50] }` for better UX

### IndexedDB (CRITICAL)

**Database Initialization:**
- Use `idb` package wrapper (simpler than raw IndexedDB API)
- Initialize on app start, not per-operation
- Handle version upgrades for schema changes

**Migration from localStorage:**
- Check for existing localStorage data on first load
- Migrate automatically to IndexedDB
- Clear localStorage after successful migration

**Error Handling:**
- IndexedDB can fail (quota exceeded, browser restrictions)
- Always provide fallback: show error, offer export option
- Never silently fail - user must know if save failed

## Development Workflow

### Before Starting Work

1. Read `README.md` for current status
2. Read relevant phase in `PLAN.md`
3. Review existing code patterns in similar components
4. Check if dependencies need installation

### Code Style

**Follow existing patterns:**
- Inline styles (no CSS files for MVP)
- Functional components with hooks
- Async/await for API calls
- Error boundaries for API failures

**Naming:**
- Components: PascalCase (`RouteEditor.jsx`)
- Utilities: camelCase (`anthropicService.js`)
- Functions: camelCase, descriptive (`extractWaypointsFromText`)
- Variables: camelCase, reveal intent

**Comments:**
- Explain "why" not "what"
- Document API integration gotchas
- Note coordinate system conversions
- Mark CRITICAL sections

### API Integration Patterns

**Anthropic API:**
- Store key in `VITE_ANTHROPIC_API_KEY` env variable
- Never expose key in client code (Vite handles this)
- Use structured prompts for consistent JSON output
- Handle rate limits and retries

**Nominatim Geocoding:**
- Rate limit: 1 request/second (CRITICAL)
- Add delays between requests: `await new Promise(resolve => setTimeout(resolve, 1000))`
- Always handle "no results" case
- Return all candidates, not just first result

**OpenRouteService:**
- API key required (free tier available)
- Calculate segments individually (not full route at once)
- Handle routing failures gracefully (fallback to straight line)
- Convert coordinates: ORS uses `[lng, lat]`, Leaflet uses `[lat, lng]`

### Error Handling

**Always handle:**
- API failures (network, rate limits, invalid keys)
- Geocoding ambiguities (multiple results)
- Geocoding failures (no results)
- Route calculation failures
- Storage failures (IndexedDB errors)

**User feedback:**
- Show loading states during async operations
- Display specific error messages (not generic "error occurred")
- Provide actionable next steps ("Try manual coordinate entry")
- Allow retry where appropriate

## Phase Wrap-Up Protocol

**CRITICAL: Before considering any phase complete, you MUST follow this protocol.**

### 1. Verification Checklist

**Run commands and show output:**
- `npm run dev` → verify server starts
- `npm run lint` → show "0 errors" (not "looks clean")
- Manual testing → follow steps in PLAN.md "Test it" section
- Code review → for major phases, request review (see code-review.md)

**Verify phase objectives:**
- Read PLAN.md phase objectives line by line
- Check each off with evidence
- If any incomplete, state what remains

### 2. Documentation Updates

**MUST update before completing:**
- **README.md Current Status** - what phase complete, what works, what's next
- **TESTING.md** - manual QA steps for new features (create if doesn't exist)
- **SPEC.md** - if implementation differed from spec, update source document
- **Code comments** - ensure new code explains "why"

**Common mistake to prevent:**
- Don't say "documentation updated" without actually doing it
- Be specific: "Updated README.md Current Status section with Phase 1 completion"

### 3. Proactive Wrap-Up

**When phase objectives are met:**
- Say explicitly: "Phase X is complete. Let's wrap up - I'll verify everything is working and update all documentation."
- Don't wait for user to say "let's wrap up"
- Signal clearly when natural stopping point reached

### 4. User Confirmation Required

**CRITICAL: Do not proceed to next phase until I confirm manual testing passed.**

**Walk me through testing:**
- "Click X, you should see Y" (not "test the feature")
- Provide exact steps from PLAN.md "Test it" section
- Wait for explicit confirmation

**After verification, ask:**
- "Please test [specific steps]. Once confirmed working, I'll commit and we can move to Phase X."
- "Is there anything else about this phase before we move on?"

### 5. Commit Readiness

**If committing at wrap-up:**
- Suggest clear commit message: `type: description` with bullet points
- Verify all changed files included
- Check no temporary/debug code remains
- Reference phase number/name in commit message

**Never commit:**
- API keys, `.env.local`, `node_modules`, built artifacts
- Agent instruction files (this file, spec, plan)

**Always commit:**
- `.env.local.example` (with placeholders)
- `package.json`, `package-lock.json`
- Code changes, documentation updates

### Red Flags - Never Say:
- "Should work now" (show evidence)
- "Tests passed" (without showing output)
- "Phase complete, moving to Phase X" (wait for confirmation)
- "Documentation updated" (without actually doing it)

## Spec/Plan Updates

**CRITICAL: If implementation decisions differ from spec/plan, update the source documents immediately.**

**When to update:**
- Architectural decisions that differ from spec
- Core flow changes
- Component additions/removals/changes
- "Done means" criteria need adjustment based on reality

**What to update:**
- `SPEC.md`: Core Flow, Components, Architecture sections
- `PLAN.md`: Phase "Done means" and "Test it" sections
- Add "Implementation Decisions Made During Development" section if needed

**Why this matters:**
- Spec/plan are source of truth for future agents
- Prevents building on outdated assumptions
- Makes spec trustworthy for future work

## Code Review

**Request review when:**
- Completing major phase (Phases 1, 3, 4, 5)
- Implementing complex architecture decisions
- Before marking significant feature complete

**Review process:**
- See `code-review.md` for full protocol
- For major phases, request sub-agent review or manual review
- Address all findings before marking complete

## Dependencies

**Default to stdlib/built-ins first.**

**For new packages:**
- Explain why needed
- What it does
- Alternatives considered
- Prefer well-maintained, widely-used packages

**Current key dependencies:**
- `@anthropic-ai/sdk` - Anthropic API client
- `idb` - IndexedDB wrapper
- `leaflet` + `react-leaflet` - Map visualization
- `uuid` - Generate route IDs

## Logging

**Structured logging with timestamps:**
- Format: `[HH:MM:SS] [PREFIX] message`
- Use for async operations, API calls, errors
- Helps track performance and debugging

**Console usage:**
- Use `console.error` for errors (not `console.log`)
- Use `console.warn` for warnings (geocoding failures, etc.)
- Remove debug `console.log` before committing

## Getting Started

### For New AI Agent

**First, read these files in order:**
1. **README.md** - Current status, what's built, what's next
2. This **AGENTS.md** file - How to work on this project
3. **SPEC.md** - Full specification and requirements
4. **PLAN.md** - Implementation plan with phases
5. **TESTING.md** - Manual QA procedures (if exists)

**Then:**
1. Run `npm install` to ensure dependencies installed
2. Create `.env.local` with `VITE_ANTHROPIC_API_KEY` (see `.env.local.example`)
3. Run `npm run dev` to verify app works
4. Test current features (see README.md "Try it" section)
5. Continue with next phase from PLAN.md
6. Update docs as you go
7. Follow wrap-up protocol after each phase

**Key files to understand:**
- `src/components/RouteEditor.jsx` - Main orchestration component
- `src/components/MapView.jsx` - Map visualization
- `src/utils/storage.js` - IndexedDB operations
- `src/utils/openRouteService.js` - API integrations

## Common Gotchas

**Coordinate conversions:**
- Always check: Leaflet `[lat, lng]` vs ORS `[lng, lat]`
- Nominatim returns separate `lat`/`lon` - combine correctly

**API rate limits:**
- Nominatim: 1 request/second (add delays)
- Anthropic: Check rate limits in docs
- OpenRouteService: Free tier has limits

**IndexedDB:**
- Async operations - use async/await
- Handle version upgrades
- Provide fallback for quota errors

**Environment variables:**
- Must restart dev server after adding new `VITE_*` vars
- Never commit `.env.local`
- Always update `.env.local.example`

