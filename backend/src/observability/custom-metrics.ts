import { Counter } from 'prom-client';

export const idempotentReplaysTotal = new Counter({
  name: 'idempotent_replays_total',
  help: 'Total idempotent replays detected',
  labelNames: ['route'] as const,
});

export const rateLimitRejectionsTotal = new Counter({
  name: 'rate_limit_rejections_total',
  help: 'Total rate limit rejections',
  labelNames: ['route'] as const,
});

export const authAttemptsTotal = new Counter({
  name: 'auth_attempts_total',
  help: 'Authentication attempts',
  labelNames: ['route', 'outcome'] as const,
});


