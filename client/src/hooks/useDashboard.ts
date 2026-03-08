import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { DashboardStats } from '../types';
import { useWorkspace } from './useWorkspace';

const defaultStats: DashboardStats = {
  totalAccounts: 0,
  activeAccounts: 0,
  totalPosts: 0,
  scheduledCount: 0,
  publishedCount: 0,
  failedCount: 0,
  draftCount: 0,
  recentPosts: [],
};

export function useDashboard() {
  const { currentWorkspace } = useWorkspace();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/dashboard/stats`
      );
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stats, loading, error, refetch };
}
