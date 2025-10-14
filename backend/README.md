# Backend (NestJS + Prisma + PostgreSQL)

## Local setup

1) Copy envs and fill values
```bash
cp .env.example .env
# set DATABASE_URL to your Postgres URL (include ?sslmode=require if RDS)
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
# Dev server uses NODE_EXTRA_CA_CERTS if not already set
```

## Endpoints

- GET /health → { ok: true, db: 'up'|'down', latencyMs, ts }

## SSL and RDS

- Prisma uses native SSL from the `DATABASE_URL`. For AWS RDS, append `?sslmode=require` to enforce SSL.
- Do not disable verification in code. If verification fails locally because the CA is missing, use one of:
  - Set environment: `NODE_EXTRA_CA_CERTS=./certs/rds-global-bundle.pem`
  - Download CA bundle via: `npm run certs:fetch`

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
