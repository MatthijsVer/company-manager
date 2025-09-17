import { useState, useEffect, useCallback } from 'react';

interface UseUserStatsOptions {
  userId?: string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: Date;
  endDate?: Date;
  includeTeamComparison?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useUserStats({
  userId = 'me',
  period = 'month',
  startDate,
  endDate,
  includeTeamComparison = false,
  autoRefresh = false,
  refreshInterval = 60000,
}: UseUserStatsOptions = {}) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const fetchStats = useCallback(async (isRefetch = false) => {
    try {
      if (!isRefetch) setLoading(true);
      else setIsRefetching(true);

      const queryParams = new URLSearchParams({
        period,
        includeTeamComparison: includeTeamComparison.toString(),
      });

      if (startDate) {
        queryParams.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        queryParams.append('endDate', endDate.toISOString());
      }

      const response = await fetch(
        `/api/analytics/users/${userId}/stats?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user stats: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setStats(null);
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  }, [userId, period, startDate, endDate, includeTeamComparison]);

  const refetch = useCallback(async () => {
    await fetchStats(true);
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetch]);

  return {
    stats,
    loading,
    error,
    refetch,
    isRefetching,
  };
}