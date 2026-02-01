# Export/Import & Cloudflare Pages Deployment Plan

## Overview

Add export/import functionality so you can move routes between browsers/laptops, then deploy to Cloudflare Pages for access from any device.

---

## Part 1: Export/Import Functionality

### Goal
Enable backing up all routes to a JSON file and importing them on another device/browser with smart conflict handling.

### Implementation

#### 1. Export Feature (RouteLibrary.jsx)

Add an "Export All Routes" button that:
- Calls `getAllRoutes()` from storage
- Creates a JSON file with all route data
- Includes metadata: export timestamp, app version
- Downloads as `himalayas-routes-YYYY-MM-DD.json`

**JSON structure:**
```json
{
  "exportedAt": "2026-02-01T10:30:00.000Z",
  "appVersion": "1.0.0",
  "routes": [
    { "id": "uuid", "name": "Route 1", ... },
    { "id": "uuid", "name": "Route 2", ... }
  ]
}
```

#### 2. Import Feature (RouteLibrary.jsx)

Add an "Import Routes" button (file input) that:
- Reads uploaded JSON file
- Validates structure
- Detects conflicts (matching route IDs)
- **If NO conflicts** → Import directly, skip mode dialog
- **If conflicts exist** → Show mode selection dialog
- Applies conflict resolution strategy
- Shows import summary

#### 3. Conflict Resolution Strategy (Option 4: User Choice)

**When user clicks Import, show a dialog with 3 modes:**

**Mode 1: "Merge (keep newer)" (DEFAULT)**
- For each route in import file:
  - If route ID doesn't exist locally → Add it
  - If route ID exists locally → Compare `updatedAt`, keep the newer one
  - Tie (same timestamp) → Keep local
- **Use case**: You work on different devices and want the latest version of each route

**Mode 2: "Import only new"**
- Only add routes that don't exist locally (by ID)
- Skip all routes that have matching IDs
- **Use case**: You want to add routes from a backup without touching current work

**Mode 3: "Replace all"**
- Clear all local routes
- Import everything from file (fresh start)
- **Use case**: You want to restore from a backup and discard all local changes

**Safety feature:**
- Before any import (all modes), automatically export current routes to `backup-before-import-YYYY-MM-DD-HHmmss.json`
- Show message: "✓ Backup created before import"

**Show import summary after completion:**
```
✓ Import completed (Merge mode)
  Backup saved: backup-before-import-2026-02-01-143022.json
  5 new routes added
  3 routes updated (newer versions)
  2 routes skipped (local versions newer)
```

#### 4. Edge Cases

- **Invalid JSON**: Show error "Invalid file format"
- **Missing route IDs**: Generate new IDs for imported routes (treat as new)
- **Corrupted data**: Skip invalid routes, import valid ones, show warning
- **Empty export**: Allow, show "No routes to export"
- **Large files**: No size limit for now (IndexedDB can handle it)

---

## Part 2: Cloudflare Pages Deployment

### Why Cloudflare Pages?

✅ **Free tier**: Unlimited bandwidth, requests  
✅ **No domain needed**: Get `himalayas2026.pages.dev` (or your chosen name)  
✅ **Fast**: Edge network, builds in ~1 min  
✅ **Simple**: Connect repo, auto-deploy on push  
✅ **Environment variables**: Set `VITE_*` keys in dashboard  

### Setup Steps

#### Step 1: Prepare the Project

1. Ensure `.env.local` has your API keys (for local dev)
2. Verify build works: `npm run build` → check `dist/` folder
3. Test production build locally: `npm run preview`

#### Step 2: Create Cloudflare Account

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up (free, no credit card needed)
3. Navigate to **Pages** in the sidebar

#### Step 3: Connect Repository

Two options:

**Option A: Direct Git Connection (Recommended)**
1. Click "Create a project" → "Connect to Git"
2. Authorize Cloudflare to access your GitHub/GitLab
3. Select the `himalayas2026` repository
4. Cloudflare auto-deploys on every push to main

**Option B: Direct Upload**
1. Click "Create a project" → "Direct Upload"
2. Upload the `dist/` folder from `npm run build`
3. Manual: rebuild and re-upload when you make changes

#### Step 4: Configure Build Settings

**Framework preset**: Vite  
**Build command**: `npm run build`  
**Build output directory**: `dist`  
**Root directory**: `/` (or `/himalayas2026` if repo has multiple projects)  

**Environment variables** (Settings → Environment variables):
- `VITE_ANTHROPIC_API_KEY` = `your_anthropic_key`
- `VITE_ORS_API_KEY` = `your_ors_key`

**Important:** Add these to **both** Production and Preview environments.

#### Step 5: Deploy

1. Click "Save and Deploy"
2. Cloudflare builds (~30-60 seconds)
3. You get a URL: `https://himalayas2026.pages.dev` (or custom subdomain)

#### Step 6: Test Deployed App

1. Open the URL
2. Create a new route → paste itinerary → extract waypoints
3. Verify API calls work (Anthropic, Nominatim, OpenRouteService)
4. Save route → refresh page → verify route persists (IndexedDB works in hosted app)

### Domain (Optional)

**You do NOT need a domain.** Cloudflare gives you `yourproject.pages.dev` for free.

**If you want a custom domain later:**
1. Buy domain (Cloudflare Registrar, Namecheap, Google Domains)
2. Add domain in Cloudflare Pages → Custom domains
3. Update DNS (automatic if domain is on Cloudflare, manual otherwise)

---

## Implementation Order

### Phase 1: Export/Import (30 min)
1. Add export button and `handleExport` function → test download
2. Add import button (file input) and `handleImport` function
3. Implement conflict resolution (compare `updatedAt`)
4. Show import summary in UI
5. Test: Export on one browser → import on another → verify merge works

### Phase 2: Local Build Test (5 min)
1. `npm run build` → verify no errors
2. `npm run preview` → open preview URL, test app works

### Phase 3: Cloudflare Setup (10 min)
1. Create Cloudflare account
2. Connect repo (or prepare for direct upload)
3. Configure build settings
4. Add environment variables

### Phase 4: Deploy & Test (5 min)
1. Trigger deploy
2. Open live URL
3. Test full flow: create route → save → refresh → still there
4. Test export/import on live app

**Total time: ~50 minutes**

---

## Code Changes Summary

### Files to Modify

**`src/components/RouteLibrary.jsx`**
- Add "Export All Routes" button → `handleExport()`
- Add "Import Routes" file input → `handleImport(file)`
- Add import summary modal/message
- Import utility functions from storage.js

**`src/utils/storage.js`** (optional helper)
- Add `exportRoutesToJSON(routes)` → formats + creates download
- Add `importRoutesFromJSON(jsonString)` → parses + validates

### UI Placement

**RouteLibrary header:**
```
[Himalayas Routes]            [Export All] [Import] [New Route]
```

**Import mode dialog (before processing file):**
```
┌────────────────────────────────────────┐
│ Import Routes                          │
├────────────────────────────────────────┤
│ Choose import mode:                    │
│                                        │
│ ○ Merge (keep newer) [DEFAULT]        │
│   Updates routes with newer versions  │
│                                        │
│ ○ Import only new                     │
│   Only add routes that don't exist    │
│                                        │
│ ○ Replace all                         │
│   Clear local routes and import all   │
│                                        │
│         [Cancel]    [Import]          │
└────────────────────────────────────────┘
```

**Import summary (toast/modal after import):**
```
✓ Import completed (Merge mode)
  Backup saved: backup-before-import-2026-02-01-143022.json
  5 new routes added
  3 routes updated
  2 routes skipped
```

---

## Testing Checklist

### Export/Import
- [ ] Export with 0 routes → shows message
- [ ] Export with routes → downloads JSON file
- [ ] Import valid JSON → routes appear in library
- [ ] Import with conflicts → newer route wins
- [ ] Import with conflicts → older route skipped
- [ ] Import invalid JSON → shows error
- [ ] Export from browser A → import to browser B → routes appear

### Deployment
- [ ] Build succeeds: `npm run build`
- [ ] Preview works: `npm run preview`
- [ ] Cloudflare build succeeds
- [ ] Live app loads
- [ ] Can create route on live app
- [ ] Route persists after refresh
- [ ] Export/import works on live app

---

## Rollback Plan

**If deployment has issues:**
1. Check Cloudflare build logs for errors
2. Verify environment variables are set correctly
3. Test build locally first: `npm run build && npm run preview`
4. If broken, revert last commit and redeploy

**If export/import has issues:**
1. Export/import features are additive (don't break existing functionality)
2. Can be disabled by removing buttons from UI
3. Core app still works without them

---

## Next Steps

1. Implement export/import (I can do this now)
2. Test locally across browsers
3. Deploy to Cloudflare Pages (you'll create account, I'll guide)
4. Test live app
5. You're done! App accessible from any device at `yourproject.pages.dev`

Ready to implement export/import now?
