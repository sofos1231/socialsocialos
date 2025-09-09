# SocialGym Backend & Dashboard System

## 🚀 Quick Start

**To launch the complete system, just say: "read startup"**

This will automatically:
- Navigate to the correct directory
- Install all dependencies
- Set up the database
- Launch both backend and dashboard servers
- Verify everything is working

## 📁 Project Structure

```
backend/
├── STARTUP_PROMPT.txt          # 🚀 Automatic startup instructions
├── QUICK_START.txt             # Quick reference guide
├── dashboards_bundle/          # All dashboard files
│   ├── control-panel.html      # Main launcher
│   ├── frontend-dashboard.html # API testing
│   ├── middleware-dashboard.html # Auto-wiring
│   ├── backend-dashboard.html  # Logs & management
│   └── README.md               # Dashboard documentation
├── src/                        # NestJS backend code
├── prisma/                     # Database schema & migrations
└── package.json                # Dependencies & scripts
```

## 🎯 What This System Does

- **Backend API**: NestJS + Fastify + Prisma (SQLite)
- **Dashboard Server**: Vite-served HTML dashboards
- **Real-time Logs**: SSE integration for live monitoring
- **Auto-wiring**: Middleware for connecting frontend to backend
- **API Testing**: Frontend dashboard for smoke testing

## 🌐 URLs (After Startup)

- **Backend API**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/api
- **Control Panel**: http://localhost:5173/control-panel.html
- **Frontend Dashboard**: http://localhost:5173/frontend-dashboard.html
- **Middleware Dashboard**: http://localhost:5173/middleware-dashboard.html
- **Backend Dashboard**: http://localhost:5173/backend-dashboard.html

## 📋 Manual Commands (if needed)

```bash
cd backend
npm install
npm run prisma:generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### Environment

- If `.env.example` is not present, create `.env` using the template in `../docs/ENV.md`. For local SQLite:

```ini
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me"
```

## 🎉 Ready to Launch!

Just say **"read startup"** and the complete SocialGym dashboard system will be launched automatically! 🚀
