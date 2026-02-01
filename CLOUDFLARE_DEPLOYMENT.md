# Cloudflare Pages Deployment Guide

Quick guide to deploy your Himalayas Route Visualizer to Cloudflare Pages.

---

## Why Cloudflare Pages?

✅ **Free** - Unlimited bandwidth and requests  
✅ **No domain needed** - Get `yourproject.pages.dev` for free  
✅ **Fast** - Edge network, builds in ~1 minute  
✅ **Simple** - Auto-deploys on every push  

---

## Step-by-Step Deployment

### 1. Create Cloudflare Account (2 minutes)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up (email only, no credit card needed)
3. Verify your email
4. Click **Pages** in the left sidebar

### 2. Connect Your Repository (3 minutes)

**Option A: Connect to Git (Recommended)**

1. Click "Create a project" → "Connect to Git"
2. Choose GitHub/GitLab (authorize Cloudflare if first time)
3. Select your `himalayas2026` repository
4. Click "Begin setup"

**Option B: Direct Upload (Manual)**

1. Click "Create a project" → "Direct Upload"
2. Drag the `dist/` folder (or click to browse)
3. Give it a project name (e.g., `himalayas-routes`)

### 3. Configure Build Settings (Option A only)

If you connected to Git, configure these settings:

**Project name:** `himalayas-routes` (or your choice)  
**Production branch:** `main` (or `master`)  
**Framework preset:** Select **"Vite"** from dropdown  

Build settings (auto-filled if you selected Vite):
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (leave empty if repo root)

### 4. Add Environment Variables (CRITICAL)

**Before clicking "Save and Deploy":**

1. Scroll down to **Environment variables**
2. Click "+ Add variable" for each:

**Variable 1:**
- Name: `VITE_ANTHROPIC_API_KEY`
- Value: `[paste your Anthropic key here]`

**Variable 2:**
- Name: `VITE_ORS_API_KEY`
- Value: `[paste your OpenRouteService key here]`

3. Make sure "Production" is checked (and "Preview" if you want)

**Important:** These must start with `VITE_` to be accessible in the app.

### 5. Deploy

1. Click "Save and Deploy"
2. Cloudflare builds your app (~30-60 seconds)
3. You'll see a URL like `https://himalayas-routes.pages.dev`

---

## After Deployment

### Test Your Live App

1. Open the Cloudflare Pages URL
2. Create a test route:
   - Click "New Route"
   - Paste an itinerary
   - Click "Extract Waypoints" (tests Anthropic API)
   - Geocode and calculate route (tests ORS API)
   - Save the route
3. Refresh the page → verify route persists (IndexedDB works)
4. Test export/import → verify files download/upload

### Common Issues

**"Extract Waypoints" fails:**
- Check VITE_ANTHROPIC_API_KEY is set correctly
- Redeploy after fixing env vars: Settings → Environment variables → Edit → Retry deployment

**Route calculation fails:**
- Check VITE_ORS_API_KEY is set correctly
- Verify the key is valid at openrouteservice.org

**Build fails:**
- Check build logs in Cloudflare dashboard
- Run `npm run build` locally first to test
- Verify `package.json` and `vite.config.js` are committed

---

## Auto-Deploy on Every Push

**If you connected to Git:**
- Every push to `main` triggers automatic rebuild and deploy
- Pull requests get preview deployments (if enabled)
- No manual uploading needed

**If you used Direct Upload:**
- Run `npm run build` locally
- Upload new `dist/` folder manually in Cloudflare dashboard

---

## Custom Domain (Optional)

You don't need a domain - `yourproject.pages.dev` works great.

**If you want a custom domain later:**

1. Buy a domain (Cloudflare Registrar, Namecheap, Google Domains)
2. In Cloudflare Pages → Your Project → Custom domains
3. Click "Set up a custom domain"
4. Follow the DNS instructions

---

## Environment Variables Reference

Your `.env.local` (local development):
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_ORS_API_KEY=5b3ce3597851...
```

Cloudflare Pages (production):
- Same variable names
- Same values
- Set in dashboard under Environment variables

---

## Troubleshooting

**I can't find my repository:**
- Make sure you authorized Cloudflare to access it
- Check the repository is not private (or grant Cloudflare access to private repos)

**Build succeeds but app shows errors:**
- Open browser console (F12) to see error
- Usually missing environment variables
- Add/fix variables → Retry deployment (don't need to rebuild locally)

**Want to delete deployment:**
- Cloudflare Pages → Project → Settings → Delete project

---

## Next Steps

✅ **Your app is live!**
- Access from any device at `yourproject.pages.dev`
- Export routes from local IndexedDB → import on the live app
- Bookmark the URL on your phone/tablet
- Share URL with your friend (routes are per-device, but they can import your export)

**Future:** If you want shared routes across devices automatically, you'd need to add a cloud database (Supabase, Cloudflare D1, etc.) - but export/import works great for now!
