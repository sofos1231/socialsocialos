# SocialGym Dashboard Bundle

This directory contains all dashboard-related files for the SocialGym application, organized for better maintainability and clarity.

## Structure

```
dashboards_bundle/
├── README.md                           # This file
├── control-panel.html                  # Main dashboard launcher
├── frontend-dashboard.html             # Frontend smoke test dashboard
├── middleware-dashboard.html           # Middleware auto-wiring dashboard
├── backend-dashboard.html              # Backend API management dashboard
├── assets/                             # Supporting assets (CSS, JS, images)
└── [legacy files]                      # Original dashboard files for reference
```

## Dashboards

### 1. Control Panel (`control-panel.html`)
- **Purpose**: Main launcher for all dashboards
- **Features**: Dashboard registry, health status, quick launch buttons
- **URL**: `http://localhost:5173/control-panel.html`

### 2. Dev Dashboard (`dev-dashboard.html`)
- **Purpose**: Mission editor and admin interface
- **Features**: Mission CRUD, AI contract editing, engine config, login/JWT management
- **URL**: `http://localhost:5173/dev-dashboard.html`

### 3. Frontend Dashboard (`frontend-dashboard.html`)
- **Purpose**: Smoke testing frontend API integration
- **Features**: Test buttons for practice categories, user profile, stats
- **URL**: `http://localhost:5173/frontend-dashboard.html`

### 4. Middleware Dashboard (`middleware-dashboard.html`)
- **Purpose**: Auto-wiring between frontend components and backend endpoints
- **Features**: Scan, auto-wire, apply patch, export bundle
- **URL**: `http://localhost:5173/middleware-dashboard.html`

### 5. Backend Dashboard (`backend-dashboard.html`)
- **Purpose**: API management and monitoring
- **Features**: Real-time logs via SSE, contract management, wiring validation
- **URL**: `http://localhost:5173/backend-dashboard.html`

## Configuration

- **Vite Root**: Updated to serve from `dashboards_bundle/`
- **Port**: 5173 (dashboard server)
- **Backend**: 3000 (NestJS API)
- **CORS**: Configured for localhost:5173 ↔ localhost:3000

## Usage

1. **Start Backend**: `npm run dev:api` (runs NestJS on :3000)
2. **Start Dashboards**: `npm run dev:dash` (runs Vite on :5173)
3. **Start Both**: `npm run dev` (runs both concurrently)

## Development

- All dashboards are standalone HTML files
- SSE integration for real-time backend communication
- Local storage for persistence before backend integration
- Modular design for easy maintenance and updates

## Legacy Files

The following files are kept for reference but not actively used:
- `control_panel_dashboard_launcher_single_file_html.html`
- `frontend_dashboard_visual_editor_single_file_html.html`
- `middleware_auto_wiring_dashboard_v_2_must_dos.html`
- `backend_dashboard_v_2_with_database_logs.html`
- `dashboard.html`
- `cursor dashboard.html`
