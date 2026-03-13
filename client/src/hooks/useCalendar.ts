import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { api } from '../lib/api';
import { useWorkspace } from './useWorkspace';
import { extractErrorMessage } from '../lib/errorUtils';

export interface CalendarPost {
  id: string;
  captionPreview: string | null;
  type: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  igUsername: string;
  igAccountId: string;
  engagement?: {
    likeCount: number;
    commentCount: number;
    savedCount: number;
    engagementRate: number;
  } | null;
}

export interface CalendarData {
  byDate: Record<string, CalendarPost[]>;
  unscheduledDrafts: CalendarPost[];
}

interface UseCalendarOptions {
  month: Date; // any date in the desired month
  igAccountId?: string;
}

export function useCalendar({ month, igAccountId }: UseCalendarOptions) {
  const { currentWorkspace } = useWorkspace();
  const [data, setData] = useState<CalendarData>({ byDate: {}, unscheduledDrafts: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthParam = format(month, 'yyyy-MM');

  const refetch = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { month: monthParam };
      if (igAccountId) params.igAccountId = igAccountId;

      const { data: responseData } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/posts/calendar`,
        { params },
      );
      setData(responseData);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load calendar'));
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, monthParam, igAccountId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const reschedule = useCallback(
    async (postId: string, newDate: Date): Promise<void> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      await api.patch(
        `/api/workspaces/${currentWorkspace.id}/posts/${postId}/reschedule`,
        { scheduledAt: newDate.toISOString() },
      );
      await refetch();
    },
    [currentWorkspace, refetch],
  );

  return { data, loading, error, refetch, reschedule };
}
