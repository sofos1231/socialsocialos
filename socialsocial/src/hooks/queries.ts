import { useQuery } from '@tanstack/react-query';
import { getWallet } from '../api/walletService';
import { list as listMissions } from '../api/missionsService';
import { getEntitlements } from '../api/subscriptionsService';
import { getUser as getStatsUser } from '../api/statsService';
import { getProfile } from '../api/profileService';

export function useWallet() { return useQuery({ queryKey: ['wallet'], queryFn: getWallet }); }
export function useMissions() { return useQuery({ queryKey: ['missions'], queryFn: listMissions }); }
export function useEntitlements() { return useQuery({ queryKey: ['entitlements'], queryFn: getEntitlements }); }
export function useStatsUser(userId: string) { return useQuery({ queryKey: ['statsUser', userId], queryFn: () => getStatsUser(userId), enabled: !!userId }); }
export function useProfile() { return useQuery({ queryKey: ['profile'], queryFn: getProfile }); }


