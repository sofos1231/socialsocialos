# Backend (NestJS + Prisma + PostgreSQL)

## Local setup

1) Create `.env`
```bash
echo "DATABASE_URL=postgresql://app:app@localhost:5433/appdb?schema=public" > .env
```

2) Fetch AWS RDS CA bundle (optional but recommended for RDS)
```bash
npm run certs:fetch
# If local TLS verification fails, set NODE_EXTRA_CA_CERTS=./certs/rds-global-bundle.pem
```

3) Install and generate Prisma client
```bash
npm install
npm run postinstall
```

4) Create DB schema and seed
```bash
npm run db:migrate
npm run db:seed
```

5) Start dev API
```bash
npm run dev
```

## Endpoints

- GET /health → { ok: true, db: 'up'|'down', latencyMs, ts }

## SSL and RDS

- Local development uses Docker Postgres on 5433; no RDS required.

## Scripts

- postinstall: prisma generate
- dev: starts Nest in watch mode and honors NODE_EXTRA_CA_CERTS
- db:migrate: prisma migrate dev --name init
- db:deploy: prisma migrate deploy
- db:seed: inserts a single test user if none exists
- prisma:studio: open Prisma Studio
- certs:fetch: downloads AWS RDS global CA bundle to `./certs/rds-global-bundle.pem`

## .gitignore important

- `.env`, `prisma/.env`, and `certs/*.pem` are ignored by git.
