import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Post, PostStatus } from '../types';
import { useWorkspace } from './useWorkspace';
import { extractErrorMessage } from '../lib/errorUtils';

interface UsePostsOptions {
  status?: PostStatus | '';
  igAccountId?: string;
  page?: number;
  limit?: number;
}

interface UpdatePostBody {
  type?: string;
  caption?: string;
  mediaUrls?: string[];
  scheduledAt?: string | null;
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
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load posts'));
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, options.status, options.igAccountId, options.page, options.limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updatePost = useCallback(
    async (postId: string, data: Partial<UpdatePostBody>): Promise<void> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      await api.patch(`/api/workspaces/${currentWorkspace.id}/posts/${postId}`, data);
      await refetch();
    },
    [currentWorkspace, refetch]
  );

  const deletePost = useCallback(
    async (postId: string): Promise<void> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      await api.delete(`/api/workspaces/${currentWorkspace.id}/posts/${postId}`);
      await refetch();
    },
    [currentWorkspace, refetch]
  );

  const publishNow = useCallback(
    async (postId: string): Promise<void> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      await api.post(`/api/workspaces/${currentWorkspace.id}/posts/${postId}/publish`);
      await refetch();
    },
    [currentWorkspace, refetch]
  );

  return { posts, total, loading, error, refetch, updatePost, deletePost, publishNow };
}
