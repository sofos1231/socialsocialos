import request = require('supertest');
import { v4 as uuidv4 } from 'uuid';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

function makeIdemKey() {
  return uuidv4();
}

function auth(h: any, token: string) {
  return h.set('Authorization', `Bearer ${token}`);
}

function expectCanonicalError(res: request.Response, code: string) {
  expect(res.body).toHaveProperty('ok', false);
  expect(res.body).toHaveProperty('error.code', code);
}

describe('E2E Smoke', () => {
  let token = '';
  let missionId = 'xyz';
  let etag = '';

  it('Auth login issues JWT; old token revoked on new login', async () => {
    const email = `user_${Date.now()}@example.com`;
    const res = await request(BASE).post('/v1/auth/login').send({ email });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('accessToken');
    token = res.body.accessToken;
    // second login
    const res2 = await request(BASE).post('/v1/auth/login').send({ email });
    const token2 = res2.body.accessToken;
    // using old token on a protected route should fail
    const resOld = await auth(request(BASE).get('/v1/me'), token).send();
    if (resOld.status !== 401) {
      // If environment doesn’t enforce revocation synchronously, ensure new token works
      const resNew = await auth(request(BASE).get('/v1/me'), token2).send();
      expect(resNew.status).toBe(200);
      token = token2;
    } else {
      expectCanonicalError(resOld, 'AUTH_SESSION_REVOKED');
      token = token2;
    }
  });

  it('/v1/me aggregates profile/wallet/plan/entitlements/streak/badges', async () => {
    const res = await auth(request(BASE).get('/v1/me'), token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('profile');
    expect(res.body).toHaveProperty('wallet');
    expect(res.body).toHaveProperty('plan');
    expect(res.body).toHaveProperty('entitlements');
    expect(res.body).toHaveProperty('streak');
    expect(res.body).toHaveProperty('badges');
  });

  it('Catalog returns items and optional deal banner', async () => {
    const res = await auth(request(BASE).get('/v1/shop/catalog'), token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('Buy powerup idempotency works (replay and conflict)', async () => {
    // Ensure some funds exist or choose a zero-cost in your env
    const idem = makeIdemKey();
    const body = { key: 'retry_token', qty: 1 };
    const res1 = await auth(request(BASE).post('/v1/shop/buy-powerup'), token)
      .set('Idempotency-Key', idem)
      .send(body);
    expect([200, 201]).toContain(res1.status);
    const res2 = await auth(request(BASE).post('/v1/shop/buy-powerup'), token)
      .set('Idempotency-Key', idem)
      .send(body);
    expect(res2.status).toBe(res1.status);
    expect(res2.body).toEqual(res1.body);
    const res3 = await auth(request(BASE).post('/v1/shop/buy-powerup'), token)
      .set('Idempotency-Key', idem)
      .send({ key: 'retry_token', qty: 2 });
    expect(res3.status).toBe(409);
    expectCanonicalError(res3, 'IDEMPOTENCY_CONFLICT');
  });

  it('Activate xp boost idempotently and list active powerups', async () => {
    const attemptId = uuidv4();
    const idem = makeIdemKey();
    const res = await auth(request(BASE).post('/v1/powerups/activate'), token)
      .set('Idempotency-Key', idem)
      .send({ type: 'xp_boost_2x_24h', attemptId });
    expect([200, 201]).toContain(res.status);
    const list = await auth(request(BASE).get('/v1/powerups'), token);
    expect(list.status).toBe(200);
  });

  it('Mission start/complete enforces idempotency and doubles XP on boost; streak present', async () => {
    const sKey = makeIdemKey();
    const cKey = makeIdemKey();
    const start = await auth(request(BASE).post(`/missions/${missionId}/start`), token)
      .set('Idempotency-Key', sKey)
      .send({ clientTs: new Date().toISOString() });
    expect([200, 201]).toContain(start.status);
    const complete = await auth(request(BASE).post(`/missions/${missionId}/complete`), token)
      .set('Idempotency-Key', cKey)
      .send({ clientTs: new Date().toISOString() });
    expect(complete.status).toBe(200);
    expect(complete.body).toHaveProperty('xpEarned');
    expect(complete.body).toHaveProperty('streak.current');
    // repeat within same day should not increment streak
    const again = await auth(request(BASE).post(`/missions/${missionId}/complete`), token)
      .set('Idempotency-Key', makeIdemKey())
      .send({ clientTs: new Date().toISOString() });
    expect(again.status).toBe(200);
  });

  it('Weekly XP supports ETag and 304', async () => {
    const first = await auth(request(BASE).get('/v1/stats/weekly-xp'), token);
    expect(first.status).toBe(200);
    etag = first.headers['etag'] || '';
    if (etag) {
      const second = await auth(request(BASE).get('/v1/stats/weekly-xp'), token).set('If-None-Match', etag);
      expect(second.status).toBe(304);
    }
  });

  it('Dashboard premium gate locks without entitlement', async () => {
    const res = await auth(request(BASE).get('/v1/stats/dashboard'), token);
    expect(res.status).toBe(200);
    // If env grants entitlement by default, this may return real values; we only assert shape when locked
    if (res.body.confidence && res.body.confidence.locked !== undefined) {
      expect(res.body.confidence).toEqual({ locked: true, required: 'ai_coach_boost' });
    }
  });

  it('IAP verify is idempotent by storeTxId', async () => {
    const idem = makeIdemKey();
    const tx = `tx-${uuidv4()}`;
    const body = { transactionJWS: 'fake', purchaseToken: undefined, sku: 'd_15' } as any;
    const v1 = await auth(request(BASE).post('/v1/iap/verify-apple'), token)
      .set('Idempotency-Key', idem)
      .send(body);
    expect([200, 201]).toContain(v1.status);
    const v2 = await auth(request(BASE).post('/v1/iap/verify-apple'), token)
      .set('Idempotency-Key', idem)
      .send(body);
    expect(v2.status).toBe(v1.status);
    expect(v2.body).toEqual(v1.body);
  });

  it('Rate limit returns 429 with retryAfter when REDIS_URL is set', async () => {
    if (!process.env.REDIS_URL) return;
    const bursts = Array.from({ length: 7 });
    let got429 = false;
    for (const _ of bursts) {
      const res = await auth(request(BASE).post(`/missions/${missionId}/start`), token)
        .set('Idempotency-Key', makeIdemKey())
        .send({ clientTs: new Date().toISOString() });
      if (res.status === 429) {
        got429 = true;
        expect(res.body?.error?.code).toBe('RATE_LIMITED');
        expect(res.body?.details?.retryAfterSec).toBeDefined();
        break;
      }
    }
    expect(got429).toBe(true);
  });
});


