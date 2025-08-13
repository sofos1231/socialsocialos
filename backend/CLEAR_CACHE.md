# Clear Browser Cache for Dashboards

If you're seeing old versions of the dashboards after restarting your PC, follow these steps to clear your browser cache:

## Method 1: Hard Refresh (Recommended)
1. **Chrome/Edge**: Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Firefox**: Press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
3. **Safari**: Press `Cmd + Option + R` (Mac)

## Method 2: Clear Browser Cache
1. **Chrome/Edge**: 
   - Press `F12` to open DevTools
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

2. **Firefox**:
   - Press `F12` to open DevTools
   - Go to Network tab
   - Check "Disable cache"
   - Refresh the page

## Method 3: Incognito/Private Mode
1. Open the dashboard URL in an incognito/private window
2. This bypasses all cached content

## Method 4: Force Clear localStorage
1. Open DevTools (`F12`)
2. Go to Application/Storage tab
3. Find "Local Storage" → `localhost:5173`
4. Right-click and "Clear"
5. Refresh the page

## Method 5: Add Cache-Busting Parameter
Add `?v=1` to the end of any dashboard URL:
- `http://localhost:5173/frontend_dashboard_visual_editor_single_file_html.html?v=1`
- `http://localhost:5173/control-panel.html?v=2`
- `http://localhost:5173/backend-dashboard.html?v=3`

## Why This Happens
- Browsers cache HTML, CSS, and JavaScript files
- After PC restart, browsers may serve old cached versions
- The dashboards now include cache-busting mechanisms to prevent this

## Prevention
The dashboards now include:
- Cache-control meta tags
- Automatic version checking
- Force reload mechanisms
- Server-side cache headers

If you still see old versions, try the hard refresh method above.
