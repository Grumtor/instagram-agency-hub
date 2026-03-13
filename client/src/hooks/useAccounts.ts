import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { InstagramAccount } from '../types';
import { useWorkspace } from './useWorkspace';
import { extractErrorMessage } from '../lib/errorUtils';

export function useAccounts() {
  const { currentWorkspace } = useWorkspace();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const refetch = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/accounts`
      );
      setAccounts(data.accounts ?? data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load accounts'));
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const disconnect = useCallback(
    async (accountId: string): Promise<void> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      setMutating(true);
      try {
        await api.delete(
          `/api/workspaces/${currentWorkspace.id}/accounts/${accountId}`
        );
        await refetch();
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to disconnect account'));
      } finally {
        setMutating(false);
      }
    },
    [currentWorkspace, refetch]
  );

  const refreshToken = useCallback(
    async (accountId: string): Promise<void> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      setMutating(true);
      try {
        await api.post(
          `/api/workspaces/${currentWorkspace.id}/accounts/${accountId}/refresh-token`
        );
        await refetch();
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to refresh token'));
      } finally {
        setMutating(false);
      }
    },
    [currentWorkspace, refetch]
  );

  return { accounts, loading, error, refetch, disconnect, refreshToken, mutating };
}
