import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { useWorkspace } from './useWorkspace';
import { extractErrorMessage } from '../lib/errorUtils';
import type { Notification, NotificationPreference } from '../types';

interface UseNotificationsOptions {
  page?: number;
  limit?: number;
  type?: string;
  pollInterval?: number; // ms, 0 = no polling
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { currentWorkspace } = useWorkspace();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/notifications/unread-count`,
      );
      setUnreadCount(data.count ?? 0);
    } catch {
      // Silently fail — unread count is non-critical
    }
  }, [currentWorkspace]);

  const refetch = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;
      if (options.type) params.type = options.type;

      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/notifications`,
        { params },
      );
      setNotifications(data.notifications ?? []);
      setPagination(data.pagination ?? null);
      setUnreadCount((data.notifications ?? []).filter((n: Notification) => !n.read).length);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, options.page, options.limit, options.type]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Polling for unread count
  useEffect(() => {
    const interval = options.pollInterval ?? 0;
    if (interval > 0 && currentWorkspace) {
      pollTimerRef.current = setInterval(fetchUnreadCount, interval);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [options.pollInterval, currentWorkspace, fetchUnreadCount]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!currentWorkspace) return;
      await api.post(
        `/api/workspaces/${currentWorkspace.id}/notifications/${notificationId}/read`,
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [currentWorkspace],
  );

  const markAllAsRead = useCallback(async () => {
    if (!currentWorkspace) return;
    await api.post(`/api/workspaces/${currentWorkspace.id}/notifications/mark-all-read`);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [currentWorkspace]);

  return {
    notifications,
    pagination,
    unreadCount,
    loading,
    error,
    refetch,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
}

export function useNotificationPreferences() {
  const { currentWorkspace } = useWorkspace();
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/notification-preferences`,
      );
      setPreferences(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load notification preferences'));
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(
    async (data: { tokenExpiring?: boolean; engagementSpike?: boolean }) => {
      if (!currentWorkspace) return;
      setSaving(true);
      try {
        const { data: updated } = await api.patch(
          `/api/workspaces/${currentWorkspace.id}/notification-preferences`,
          data,
        );
        setPreferences(updated);
      } finally {
        setSaving(false);
      }
    },
    [currentWorkspace],
  );

  return { preferences, loading, saving, error, fetchPreferences, updatePreferences };
}
