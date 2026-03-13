import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { PostTemplate, HashtagSet } from '../types';
import { useWorkspace } from './useWorkspace';
import { extractErrorMessage } from '../lib/errorUtils';

interface CreateTemplateBody {
  name: string;
  caption: string;
  hashtags?: string;
  category?: string;
}

interface UpdateTemplateBody {
  name?: string;
  caption?: string;
  hashtags?: string | null;
  category?: string | null;
}

interface CreateHashtagSetBody {
  name: string;
  hashtags: string;
}

export function useTemplates(search?: string) {
  const { currentWorkspace } = useWorkspace();
  const [templates, setTemplates] = useState<PostTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/templates`,
        { params }
      );
      setTemplates(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load templates'));
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, search]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createTemplate = useCallback(
    async (data: CreateTemplateBody): Promise<PostTemplate> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      const { data: template } = await api.post(
        `/api/workspaces/${currentWorkspace.id}/templates`,
        data
      );
      await refetch();
      return template;
    },
    [currentWorkspace, refetch]
  );

  const updateTemplate = useCallback(
    async (templateId: string, data: UpdateTemplateBody): Promise<PostTemplate> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      const { data: template } = await api.patch(
        `/api/workspaces/${currentWorkspace.id}/templates/${templateId}`,
        data
      );
      await refetch();
      return template;
    },
    [currentWorkspace, refetch]
  );

  const deleteTemplate = useCallback(
    async (templateId: string): Promise<void> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      await api.delete(`/api/workspaces/${currentWorkspace.id}/templates/${templateId}`);
      await refetch();
    },
    [currentWorkspace, refetch]
  );

  const useTemplate = useCallback(
    async (templateId: string): Promise<PostTemplate> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      const { data: template } = await api.post(
        `/api/workspaces/${currentWorkspace.id}/templates/${templateId}/use`
      );
      return template;
    },
    [currentWorkspace]
  );

  return { templates, loading, error, refetch, createTemplate, updateTemplate, deleteTemplate, useTemplate };
}

export function useHashtagSets() {
  const { currentWorkspace } = useWorkspace();
  const [hashtagSets, setHashtagSets] = useState<HashtagSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/hashtag-sets`
      );
      setHashtagSets(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load hashtag sets'));
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createHashtagSet = useCallback(
    async (data: CreateHashtagSetBody): Promise<HashtagSet> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      const { data: set } = await api.post(
        `/api/workspaces/${currentWorkspace.id}/hashtag-sets`,
        data
      );
      await refetch();
      return set;
    },
    [currentWorkspace, refetch]
  );

  const deleteHashtagSet = useCallback(
    async (setId: string): Promise<void> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      await api.delete(`/api/workspaces/${currentWorkspace.id}/hashtag-sets/${setId}`);
      await refetch();
    },
    [currentWorkspace, refetch]
  );

  return { hashtagSets, loading, error, refetch, createHashtagSet, deleteHashtagSet };
}
