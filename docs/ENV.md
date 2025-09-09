# Environment Setup

Create `backend/.env` with the following content for local development:

```ini
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me"
```

Notes:
- Keep `.env` uncommitted. If a template is desired, ensure ignore rules allow `*.example` while keeping `.env` ignored.
- For Expo mobile app, set `EXPO_PUBLIC_API_URL` to the backend URL (e.g., `http://localhost:3000`).
