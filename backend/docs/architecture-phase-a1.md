# Phase A.1 – Backend Architecture Decisions (SocialGym)



This document freezes the **backend architecture decisions** at the end of Phase A.1 (Backend Audit) on branch `phase-a-foundations`.



The goal is:

- To define **canonical modules**, **canonical endpoints**, and **single sources of truth**.

- To mark **legacy / experimental pieces** that will NOT be relied on for the MVP loop.

- To guide Phases A.2 and A.3 so they implement wiring and cleanup without guessing.



---



## 0. High-Level Summary



- The heart of the system is the **practice loop**:

  - User runs a practice session (text / voice / AB).

  - AI scoring + rewards are computed.

  - Session + messages are stored.

  - Wallet and stats are updated.

  - Dashboard is computed and returned.



- The backend already contains most of the right pieces, but:

  - There is **duplication of responsibilities** (wallet/stats init, dashboard endpoints).

  - Some modules are **partially implemented or legacy** (Chat, Powerups, mock endpoints).

  - A few tables have fields that are **future-oriented** but not consistently used yet (personaId, templateId, full streak logic, some charisma metrics).



Phase A.1 does **not** refactor code yet.  
It only defines **what is canonical**, **what is legacy**, and **who owns what** so that A.2/A.3 can safely reshape the code.



---



## 1. Canonical Modules vs Legacy / Future



### 1.1 Canonical Modules (Phase A MVP)



These modules are considered **core** for the MVP backend:



| Module        | Path                                        | Role                                                        | Status        |

|--------------|---------------------------------------------|-------------------------------------------------------------|--------------|

| AuthModule   | `backend/src/modules/auth`                  | Login / signup / logout / refresh / revoke; JWT handling    | CANONICAL    |

| ProfileModule| `backend/src/modules/profile`               | Gender / attraction preferences & preference path           | CANONICAL    |

| PracticeModule | `backend/src/modules/practice`            | HTTP entry for text / voice / AB practice sessions          | CANONICAL    |

| SessionsModule | `backend/src/modules/sessions`            | Session engine: rewards, persistence, wallet/stats updates  | CANONICAL    |

| AiModule     | `backend/src/modules/ai`                    | AI scoring: Option A (rarity-based) + Option B (charisma)   | CANONICAL    |

| StatsModule  | `backend/src/modules/stats`                 | Dashboard aggregation (wallet + stats + latest sessions)    | CANONICAL    |

| WalletModule | `backend/src/modules/wallet`                | Read(-later write) access to user wallet balances           | CANONICAL    |

| PersonasModule | `backend/src/modules/personas`            | Lists active personas                                       | CANONICAL/FUTURE |

| TemplatesModule | `backend/src/modules/templates`          | Lists mission templates                                     | CANONICAL/FUTURE |

| HealthModule | `backend/src/health`                        | Health check endpoints                                      | CANONICAL    |

| Common infra | `backend/src/common`                        | Idempotency, rate-limit, time, etc.                         | CANONICAL    |



Notes:

- **PersonasModule** and **TemplatesModule** are **MVP-ready for future missions**. They exist and are correct conceptually, but the frontend will only partially rely on them in early phases.

- **AiModule** will later be clarified into:

  - “Truth” metrics (charisma, filler words, etc.).

  - “Game” metrics (rarity-based XP, coins, gems).



### 1.2 Modules Marked as “On Hold / Future”



| Module       | Path                                   | Reason |

|-------------|----------------------------------------|--------|

| ChatModule  | `backend/src/modules/chat`             | Implementation incomplete; current practice flow is batch-based. Real-time/per-message flow is a Phase B+ concern. |

| PowerupsModule | `backend/src/modules/powerups`      | Power-ups are not part of MVP loop yet; endpoints are experimental and not wired into wallet deduction logic. |



Decisions:

- **ChatModule** is **NOT** part of the guaranteed MVP loop yet. It will either be:

  - integrated as the real-time per-message engine in Phase B, or

  - temporarily ignored in the frontend.

- **PowerupsModule** is backend-only for now. No promises in the UI until wallet/gem spending is fully defined.



---



## 2. HTTP API – Canonical vs Legacy Endpoints



### 2.1 Canonical MVP Endpoints



These are the endpoints the frontend is allowed to depend on for the MVP:



#### Auth & Profile



- `POST /v1/auth/signup`

- `POST /v1/auth/login`

- `POST /v1/auth/logout`

- `POST /v1/auth/refresh`

- `POST /v1/auth/revoke` (admin/advanced; not required for basic MVP UI)

- `PATCH /v1/profile/preferences`



#### Practice & Sessions



- `POST /v1/practice/session`  

- `POST /v1/practice/voice-session`  

- `POST /v1/practice/ab-session`



These three are the **canonical ways** to run a practice session.  
All of them must ultimately delegate to the same session lifecycle (SessionsService) under the hood.



#### Dashboard & Stats



- `GET /v1/stats/dashboard` → **single canonical dashboard endpoint**



Any other dashboard-like endpoints are considered aliases/legacy and should not be used by the frontend.



#### Wallet



- `GET /v1/wallet/me` → canonical wallet read endpoint



#### Personas & Templates



- `GET /v1/personas`

- `GET /v1/templates`



These are used to power mission/persona selection for chapters and missions.



---



### 2.2 Legacy / Experimental Endpoints



These exist but are **NOT canonical** and should be treated as legacy/experimental:



| Endpoint                     | Owner              | Status   | Notes |

|------------------------------|--------------------|----------|-------|

| `POST /v1/sessions/mock`     | SessionsController | LEGACY   | Dev/test-only. Should not be exposed in production or used by the app. |

| `GET /v1/sessions/dashboard/summary` | SessionsController | LEGACY | Alias to StatsService dashboard – not canonical. |

| `GET /v1/dashboard/summary`  | DashboardController| LEGACY   | Another alias to StatsService dashboard – not canonical. |

| `POST /v1/chat/message`      | ChatController     | FUTURE   | Real-time chat; current MVP flow is batch-based practice. |

| `GET /v1/powerups/available` | PowerupsController | FUTURE   | Power-ups catalog without spending logic – not in MVP loop yet. |



Frontend rules:

- Use **only** `/v1/stats/dashboard` for dashboard data.

- Never rely on `/v1/sessions/mock`, `/v1/dashboard/summary` or `/v1/sessions/dashboard/summary` from the app.

- Chat and powerups endpoints are hidden behind a feature flag or simply unused until they are fully wired.



---



## 3. Data Models Used by the MVP Loop



This section focuses on the **models that directly matter** for the MVP practice loop, rewards, and dashboard.



### 3.1 User



Purpose: core account record storing auth info, streak seeds, and preference metadata.



Key fields (conceptual):

- `id` – unique user id.

- `email`, `passwordHash` – auth.

- `createdAt` – when user signed up.

- `sessionVersion` – used to invalidate JWTs on logout/revoke.

- `tier` – FREE vs future PREMIUM behavior.

- `streakCurrent`, `streakLastActiveAt` – **fields exist; real streak logic will be implemented in a later phase.**

- `gender`, `attractedTo`, `preferencePath` – used by persona/missions to tailor scenarios.



### 3.2 UserWallet



Purpose: single source of truth for:



- XP

- Level

- Coins

- Gems

- Lifetime XP



MVP rules:

- All XP/coins/gems changes must eventually go through a single abstraction (Wallet/Rewards service).

- `lifetimeXp` is used for analytics and potential lifetime-based unlocks.



### 3.3 UserStats



Purpose: aggregated performance counters for dashboards:



- `sessionsCount`

- `successCount`, `failCount`

- `averageScore`, `averageMessageScore`

- `lastSessionAt`



MVP rules:

- Stats must be updated in **one place** in code (a future StatsUpdater/SessionLifecycle service).

- Dashboards must read from this model; no ad-hoc aggregates in random modules.



### 3.4 PracticeSession



Purpose: the **central “mission run” record** for each practice session.



Key responsibilities:

- Store final score and outcome.

- Store rewards granted (xp/coins/gems).

- Link to persona/template (even if not yet fully wired).

- Store AI metrics and summaries for dashboards.



Important notes:

- `personaId` and `templateId` exist but are not consistently populated yet; this is a Phase A.4 / B concern.

- Many charisma-related fields exist; MVP will rely on a **stable subset** (charismaIndex, key traits) and expand later.

- `aiSummary`, `aiCorePayload` are JSON blobs capturing interpretable and raw AI results.



### 3.5 ChatMessage



Purpose: per-message scoring and rewards.



Current status:

- Messages are stored with **mock content** and used mainly as a structural placeholder.

- MVP batch flow does not rely on real ChatMessage content yet.



Future:

- In Phase B, real messages and their scores will be stored here to support:

  - Per-message insights.

  - “Brilliant line” detection.

  - Richer history views.



---



## 4. Ownership Rules (Single Sources of Truth)



To avoid the current duplication, the following **ownership rules** are defined:



1. **User primitives (UserWallet + UserStats creation)**

   - Long-term owner: a dedicated `UserBootstrapService` (or similar).

   - `AuthService.signup`, `StatsService.ensureUserProfilePrimitives`, and `SessionsService.ensureUserProfilePrimitives` must all delegate to this single service in future phases.

   - Phase A.1 only defines this; Phase A.3 will implement it.



2. **Wallet mutations (XP / coins / gems / lifetimeXP)**

   - Long-term owner: a dedicated `Wallet/RewardsService` inside `WalletModule` or a cross-module `RewardsModule`.

   - Sessions logic should **not write directly** to Prisma for wallet in the long run; it should call a wallet/rewards abstraction.



3. **Stats updates (UserStats)**

   - Long-term owner: a `StatsUpdater` or `SessionLifecycleService`.

   - Only one place is allowed to:

     - increment `sessionsCount`, `successCount`, `failCount`

     - update `averageScore`, `averageMessageScore`

     - set `lastSessionAt`.



4. **Dashboard payload**

   - Single canonical source: `StatsService.getDashboardForUser`.

   - All controllers that need "dashboard-like" data should call this method instead of re-implementing the logic.

   - Canonical HTTP endpoint: `GET /v1/stats/dashboard`.



5. **Streak**

   - Fields exist in `User` but there is **no real logic yet**.

   - A future `StreakService` will own:

     - incrementing streak,

     - resetting on inactivity,

     - exposing streak-related info to the dashboard.

   - Until then, streak is considered light-weight / cosmetic and should not be used as a strict product promise.



6. **AI Scoring**

   - AiCore (Option B) is the source of "truth" metrics (charisma, traits, filler words).

   - AiScoring (Option A) is the gamification layer (rarities → XP/coins/gems).

   - Practice/Sessions must not reimplement scoring logic; they should always call the AI services.



---



## 5. Red Flags & Cleanup TODOs (for A.2 / A.3)



These are known issues that upcoming phases must fix:



1. **Duplicate wallet/stats initialization**

   - Present in `AuthService`, `StatsService`, and `SessionsService`.

   - A.3 TODO: Introduce `UserBootstrapService` and route all calls through it.



2. **Multiple dashboard endpoints**

   - `/v1/stats/dashboard`, `/v1/dashboard/summary`, `/v1/sessions/dashboard/summary`.

   - A.2/A.3 TODO:

     - Frontend: use only `/v1/stats/dashboard`.

     - Backend: mark the others as deprecated, later remove or proxy.



3. **Mock ChatMessage content**

   - Stored content is currently “Mock message #n”.

   - A.3/B TODO: either

     - store real user messages, or

     - clearly mark ChatMessage as unused and remove code that relies on it.



4. **Streak fields without logic**

   - A later phase (C or D) will implement actual streak logic; until then, minimal or no usage in UI.



5. **Powerups without wallet spend**

   - PowerupsModule exposes availability but no gem deduction logic.

   - Future TODO: integrate with wallet and rewards; until then, consider it experimental.



---



## 6. Impact on Phases A.2 and A.3



### 6.1 Phase A.2 – Frontend Cleanup & Navigation Rebuild



- Frontend will only call **canonical endpoints** defined above.

- Navigation will assume:

  - Stable Auth: signup/login/logout/refresh.

  - Stable Practice entry: `/v1/practice/session` (+ voice/AB as variations).

  - Stable Dashboard: `/v1/stats/dashboard`.

  - Stable Wallet: `/v1/wallet/me`.

- Legacy endpoints will **not** be wired to the UI.



### 6.2 Phase A.3 – Core API Wiring & Backend Cleanup



- Implement `UserBootstrapService` or equivalent.

- Start routing all wallet/stats creation through a single service.

- Begin consolidating session lifecycle into a clearer abstraction (SessionLifecycle/PracticeEngine).

- Leave Chat and Powerups as future features until the core loop is rock-solid.



---



_End of Phase A.1 Architecture Decisions._
