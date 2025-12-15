import request = require('supertest');
import { v4 as uuidv4 } from 'uuid';
import { createTestApp } from './utils/http';
import { resetDb } from './utils/prisma';
import { createTestUserAndToken } from './utils/auth';

describe('E2E wallet.adjust', () => {
  const BASE = 'http://localhost:3000';
  let appClose: (() => Promise<void>) | null = null;

  beforeAll(async () => {
    const app = await createTestApp();
    const fastify = app.getHttpAdapter().getInstance();
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    appClose = () => app.close();
  });

  afterAll(async () => { if (appClose) await appClose(); });
  beforeEach(async () => { await resetDb(); });

  it('adjust is idempotent and replays 409 IDEMPOTENT_REPLAY', async () => {
    const { accessToken } = await createTestUserAndToken(BASE);
    const auth = (h: request.Test) => h.set('Authorization', `Bearer ${accessToken}`);

    const baseline = await auth(request(BASE).get('/v1/wallet'));
    expect(baseline.status).toBe(200);
    const startCoins = baseline.body.coins;

    const k1 = uuidv4();
    const body = { idempotencyKey: k1, delta: { coins: 10 } };
    const first = await auth(request(BASE).post('/v1/wallet/adjust')).send(body);
    expect(first.status).toBe(200);
    expect(first.body).toHaveProperty('coins');
    expect(first.body).not.toHaveProperty('tickets');

    const replay = await auth(request(BASE).post('/v1/wallet/adjust')).send(body);
    expect(replay.status).toBe(409);
    expect(replay.body?.error?.code).toBe('IDEMPOTENT_REPLAY');

    const after = await auth(request(BASE).get('/v1/wallet'));
    expect(after.status).toBe(200);
    expect(after.body.coins).toBe(startCoins + 10);
  });
});


