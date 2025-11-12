# SocialGym Backend (Sessions Ingest + Dashboard Stats)

Minimal Node.js (ESM) API that ingests completed practice sessions (JSON or XML) into PostgreSQL (AWS RDS) and exposes a dashboard stats endpoint (sessions count + average score).

## What it does
- POST `/v1/sessions`: Accepts `application/json` or `application/xml`, validates/coerces fields, inserts into `practice_sessions`.
- GET `/v1/dashboard/{userId}`: Returns total sessions and average score % for the user.

## Setup
1. Node.js 18+
2. Install deps:
   ```bash
   npm i
   ```
3. Create `.env` with your RDS credentials (see sample below). If your environment blocks adding `.env.example`, copy this snippet:
   ```bash
   PG_HOST=your-rds-endpoint.rds.amazonaws.com
   PG_PORT=5432
   PG_USER=shalio
   PG_PASS=REPLACE_ME
   PG_DATABASE=postgres
   PORT=3000
   ```
4. Ensure your RDS security group allows inbound from your IP. SSL is enforced.

## Run
```bash
npm run dev   # dev with nodemon
# or
npm start     # node app.js
```

## Test with curl

Create session (JSON):
```bash
curl -X POST http://localhost:3000/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "11111111-1111-1111-1111-111111111111",
    "category": "dating",
    "score": 82,
    "durationMinutes": 30,
    "feedback": "Solid confidence"
  }'
```

Create session (XML):
```bash
curl -X POST http://localhost:3000/v1/sessions \
  -H "Content-Type: application/xml" \
  -d '<PracticeSession>
        <userId>11111111-1111-1111-1111-111111111111</userId>
        <category>dating</category>
        <score>87</score>
        <durationMinutes>25</durationMinutes>
        <feedback>Showed good confidence and humor.</feedback>
      </PracticeSession>'
```

Get dashboard:
```bash
curl http://localhost:3000/v1/dashboard/11111111-1111-1111-1111-111111111111
```

## DBeaver verification
1. Connect to your RDS PostgreSQL with SSL enabled.
2. Check `practice_sessions` table rows.
3. Verify `score_max = 100`, `score` stored, and `created_at` populated.

## Notes / Common errors
- 400 FK violation: Unknown `userId` (ensure user exists in `users` table).
- 400 validation: Malformed UUID, missing required fields, score outside 0–100, or non-numeric duration.
- RDS networking: Ensure inbound allows your IP and SSL certs are trusted (`ssl: { rejectUnauthorized: true }`).


