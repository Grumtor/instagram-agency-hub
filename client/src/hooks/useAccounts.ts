import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { InstagramAccount } from '../types';
import { useWorkspace } from './useWorkspace';

export function useAccounts() {
  const { currentWorkspace } = useWorkspace();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/accounts`
      );
      setAccounts(data.accounts ?? data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { accounts, loading, error, refetch };
}
