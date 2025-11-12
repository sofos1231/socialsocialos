import { api } from './apiClient';

export type Wallet = { coins: number; gems: number; xp: number };

export async function getWallet(): Promise<Wallet> {
  const res = await api.get('/v1/wallet');
  return res.data as Wallet;
}

export async function adjust(input: { idempotencyKey: string; delta: { coins?: number; gems?: number; xp?: number } }): Promise<Wallet> {
  const res = await api.post('/v1/wallet/adjust', input);
  return res.data as Wallet;
}


