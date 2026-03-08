import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Post, PostStatus } from '../types';
import { useWorkspace } from './useWorkspace';

interface UsePostsOptions {
  status?: PostStatus | '';
  igAccountId?: string;
  page?: number;
  limit?: number;
}

export function usePosts(options: UsePostsOptions = {}) {
  const { currentWorkspace } = useWorkspace();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (options.status) params.status = options.status;
      if (options.igAccountId) params.igAccountId = options.igAccountId;
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;

      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/posts`,
        { params }
      );
      setPosts(data.posts ?? data);
      setTotal(data.total ?? (data.posts ?? data).length);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, options.status, options.igAccountId, options.page, options.limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { posts, total, loading, error, refetch };
}
