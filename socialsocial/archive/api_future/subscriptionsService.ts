import { api } from './apiClient';

export async function sendReceipt(
  input: { store: 'APPLE'|'GOOGLE'|'RC'; productId: string; token: string },
  opts: { idempotencyKey: string }
) {
  const res = await api.post('/v1/iap/receipt', input, {
    headers: { 'Idempotency-Key': opts.idempotencyKey },
  });
  return res.data as { status: 'ACCEPTED'|'DUPLICATE'|'REJECTED'; entitlementFlipped: boolean };
}

export async function getEntitlements() {
  const res = await api.get('/v1/entitlements');
  return res.data as { items: Array<{ key: string; active: boolean; source: string }> };
}


