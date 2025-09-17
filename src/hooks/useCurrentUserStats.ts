import { useUserStats } from "./useUserStats";

export function useCurrentUserStats(options?: Omit<UseUserStatsOptions, 'userId'>) {
    return useUserStats({ ...options, userId: 'me' });
  }