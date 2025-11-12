import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adjust } from '../api/walletService';
import { claim } from '../api/missionsService';
import { sendReceipt } from '../api/subscriptionsService';
import { v4 as uuidv4 } from 'uuid';

export function useAdjustWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (delta: { coins?: number; gems?: number; xp?: number }) => {
      const idempotencyKey = uuidv4();
      return adjust({ idempotencyKey, delta });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wallet'] }); },
  });
}

export function useClaimMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; score?: number }) => {
      const idempotencyKey = uuidv4();
      return claim(args.id, { score: args.score }, { idempotencyKey });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wallet'] }); },
  });
}

export function useSendReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { store: 'APPLE'|'GOOGLE'|'RC'; productId: string; token: string }) => {
      const idempotencyKey = uuidv4();
      return sendReceipt(input, { idempotencyKey });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entitlements'] }); },
  });
}


