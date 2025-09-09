# SocialGym Contracts Catalog

This catalog defines cross-cutting semantics used across backend and mobile. It is implementation-agnostic and aligned with existing DTO patterns.

## Mission Status
- `status`: `available` | `in_progress` | `completed` | `locked`
- `lockedReason`: `'level' | 'premium' | 'prereq' | 'cooldown'`
- `availableAt`: optional ISO string when `lockedReason` is `cooldown`.

Examples:

Locked (level):
```json
{ "status": "locked", "lockedReason": "level" }
```

Locked (premium):
```json
{ "status": "locked", "lockedReason": "premium" }
```

Locked (prereq):
```json
{ "status": "locked", "lockedReason": "prereq" }
```

Locked (cooldown):
```json
{ "status": "locked", "lockedReason": "cooldown", "availableAt": "2025-09-08T18:30:00.000Z" }
```

Available:
```json
{ "status": "available" }
```

In progress:
```json
{ "status": "in_progress" }
```

Completed:
```json
{ "status": "completed" }
```

## Rewards Formula
- `finalXp = floor(baseXp * itemMultiplier * (streak>3 ? 1.10 : 1.00))`
- `baseXp`: mission `rewards.xp` or session-mode defaults (quick=5, shadow=0).
- `itemMultiplier`: product of active power-ups (e.g., 2.0 for XP booster). Source of truth: server-side inventory.
- Coins/diamonds may be awarded per mission; multipliers apply only to XP unless specified.

Example:
```json
{ "baseXp": 20, "itemMultiplier": 2.0, "streakBonus": 0.10, "finalXp": 44 }
```

## Streak Rule
- Increment on the first completion that crosses the Asia/Jerusalem local day boundary.
- Store timestamps in UTC. Compare local day via `Intl.DateTimeFormat(..., timeZone: 'Asia/Jerusalem')`.
- Store `lastActiveAt` UTC; compute local day at runtime.

## Error Semantics
- `400` validation error (DTO parse/constraints).
- `401` auth required/invalid; client must logout and clear token.
- `403` forbidden/lock: include structured lock payload when due to mission locks/cooldown.
- `404` resource missing.
- `409` true idempotency conflict (duplicate purchase/complete with mismatched body).

Examples:

401:
```json
{ "statusCode": 401, "message": "Unauthorized", "error": "Unauthorized" }
```

403 with lock reason:
```json
{ "statusCode": 403, "message": "locked", "error": "Forbidden", "payload": { "status": "locked", "lockedReason": "cooldown", "availableAt": "2025-09-08T18:30:00.000Z" } }
```

409 idempotency conflict:
```json
{ "statusCode": 409, "message": "Conflict", "error": "Conflict" }
```

## Idempotency
- Session completion and purchases must be idempotent.
- Replays of the same idempotency key return the same response body and do not duplicate side effects.

Idempotent completion replay example:
```json
{ "sessionId": "s_123", "baseXp": 25, "streakBonusXp": 0, "finalXp": 25, "idempotent": true }
```

Canonical completion response (first call):
```json
{ "ok": true, "id": "sessionId", "reward": { "xp": 12, "coins": 0, "diamonds": 0 }, "idempotent": false }
```

Purchases should include the receipt reference and resulting balances/inventory snapshot.
