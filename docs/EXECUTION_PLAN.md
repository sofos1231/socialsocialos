# SocialGym Repo Execution Plan

This document captures the repo-wide audit, gaps, invariants, schema deltas, seeds, and the prioritized roadmap to MVP. It is implementation-agnostic and aligns with current code.

## Audit (Tech & Structure)
- Backend: NestJS + Fastify, Prisma (SQLite via `DATABASE_URL`), Swagger at `/api`.
- Modules discovered: practice (hub, sessions), missions, users, stats, shop, logs, contracts, wiring, scaffold.
- Auth: not wired yet; controllers use demo "first user" selection.
- Mobile: Expo React Native app (`socialsocial`), API client at `src/lib/api.ts` using `EXPO_PUBLIC_API_URL`.

## Capabilities vs Gaps
- Practice (Capabilities): list missions with server-side status; start resumes existing active session; completion uses DB transaction and returns an idempotent response when the same session is re-completed; streak boundary computed via Asia/Jerusalem; mission locks enforced server-side.
- Gaps: JWT guard on protected routes; DTO validation; explicit idempotency keys (purchases and completion); normalized error wrappers; IAP validation; settings/account/notifications endpoints.

## Cross-Cutting Invariants
- JWT on protected routes; 401 triggers client logout.
- Idempotency for completion/purchases; concurrency-safe via DB transaction.
- Single active session per user.
- Streak boundary: Asia/Jerusalem via Intl; store UTC; compare in that TZ.
- Mission locks: level|premium|prereq|cooldown (+availableAt) computed server-side.
- Economy: rewards computed server-side; defined multipliers order.
- DTO validation and normalized errors (400/401/403/404/409).
- Minimal deps.

## Data Model Delta (high-level)
- Add idempotency tables (e.g., `IdempotencyKey` with unique `(userId, key)`), purchase receipts, power-ups inventory, stats snapshots.
- Consider `PracticeSession` index on `(userId, state)`.
- Add `lastActiveLocalYMD` cache if needed for streak analytics; keep source of truth UTC.

## Seeds Strategy
- One demo user with varied state.
- Missions: include examples for each lock reason and one with cooldown.
- Shop: booster, streak protector, premium pass.
- Progress: mark some missions completed; set last completion timestamps to test cooldown.

## Roadmap (Prioritized with IDs and Acceptance Criteria)
- A01 Practice API v1 hardening [Status: Planned]: Protected routes with JWT; DTO validations; `POST /practice/complete/:sessionId` idempotent with key; single active session enforced; Swagger examples added.
- A02 Auth wiring [Status: Planned]: Login issuing JWT; global JWT guard on protected routes; client logs out on 401; sample curl.
- A03 Swagger polish [Status: Planned]: DTO classes/decorators; schemas and examples visible at `/api`.
- A04 FE infra [Status: Planned]: Use `EXPO_PUBLIC_API_URL`; centralized error handling (401 logout); simple auth store.
- A05 Shop/IAP [Status: Planned]: `POST /shop/purchase` validates receipt (mock); idempotent by key; returns updated balances/inventory.
- A06 Economy pipeline [Status: Planned]: Server computes XP with streak and item multipliers; tests verifying multiplier order.
- A07 Stats endpoints [Status: Planned]: `/stats/overview` returns computed KPIs; premium gating reflected.
- A08 Profile & Settings [Status: Planned]: `/users/profile` get/update with DTOs; membership flag enforced.
- A09 Account management [Status: Planned]: export job + poll; delete with grace; logout endpoint.
- A10 Notifications prefs [Status: Planned]: server endpoint to save preferences; client scheduling aligned.
- A11 Indexes & perf [Status: Planned]: Add necessary Prisma indexes; verify query perf for common filters.
- A12 E2E flows [Status: Planned]: Minimal e2e covering Practice/Shop/Auth pass locally/CI.

## Evidence Table (Asserted Capabilities)
- Idempotent completion (per-session) → Service: PracticeFlowService.completeSession (uses transaction, returns `{ idempotent: true }` if session already completed). Proof: method logic.
- Single active session enforced by resume → Service: PracticeFlowService.startSession (finds active/paused session and returns it instead of creating).
- Mission locks computed server-side → Service: PracticeFlowService.computeMissionStatus (reasons: level|premium|prereq|cooldown + availableAt).
- Streak boundary Asia/Jerusalem → Service: PracticeFlowService.toJerusalemDay + jerusalemYesterday used in completeSession.
- Purchases idempotency → TBD (A05).
- JWT/DTO/errors normalization → TBD (A01, A02, A03).

## Risks & Unknowns
- JWT/IAP secrets, push credentials, production DB URL.
- Merging with ongoing UI changes.

## Acceptance Criteria per task
- Each task adds DTOs, guards, tests/smoke curl, Swagger examples; zero new deps unless justified.
