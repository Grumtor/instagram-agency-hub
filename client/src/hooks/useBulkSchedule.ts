import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useWorkspace } from './useWorkspace';
import { extractErrorMessage } from '../lib/errorUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BulkCsvError {
  line: number;
  reason: string;
}

export interface BulkCsvResult {
  createdCount: number;
  posts: unknown[];
  errors: BulkCsvError[];
  warning?: string;
}

export interface PreviewPost {
  igAccountId: string;
  type: string;
  caption: string;
  mediaUrls: string[];
  scheduledAt: string;
  status: string;
}

export interface MediaPreviewResult {
  postCount: number;
  spacing: 'auto';
  editable: true;
  posts: PreviewPost[];
}

export interface BulkConfirmResult {
  createdCount: number;
  posts: unknown[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBulkSchedule() {
  const { currentWorkspace } = useWorkspace();

  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<BulkCsvResult | null>(null);

  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<MediaPreviewResult | null>(null);

  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<BulkConfirmResult | null>(null);

  const downloadTemplate = useCallback(async () => {
    if (!currentWorkspace) return;
    const token = localStorage.getItem('iah_access_token');
    const res = await fetch(
      `/api/workspaces/${currentWorkspace.id}/posts/bulk/template`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) throw new Error('Failed to download template');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-schedule-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [currentWorkspace]);

  const uploadCsv = useCallback(
    async (file: File) => {
      if (!currentWorkspace) return;
      setCsvLoading(true);
      setCsvError(null);
      setCsvResult(null);
      try {
        const form = new FormData();
        form.append('file', file);
        const { data } = await api.post<BulkCsvResult>(
          `/api/workspaces/${currentWorkspace.id}/posts/bulk/csv`,
          form,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        setCsvResult(data);
      } catch (err) {
        setCsvError(extractErrorMessage(err, 'Failed to upload CSV'));
      } finally {
        setCsvLoading(false);
      }
    },
    [currentWorkspace],
  );

  const uploadMedia = useCallback(
    async (files: File[], accountId: string, startDate: string) => {
      if (!currentWorkspace) return;
      setMediaLoading(true);
      setMediaError(null);
      setMediaPreview(null);
      try {
        const form = new FormData();
        files.forEach((f) => form.append('files', f));
        form.append('accountId', accountId);
        form.append('startDate', startDate);
        const { data } = await api.post<MediaPreviewResult>(
          `/api/workspaces/${currentWorkspace.id}/posts/bulk/media`,
          form,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        setMediaPreview(data);
      } catch (err) {
        setMediaError(extractErrorMessage(err, 'Failed to upload media'));
      } finally {
        setMediaLoading(false);
      }
    },
    [currentWorkspace],
  );

  const confirmBulk = useCallback(
    async (posts: PreviewPost[]) => {
      if (!currentWorkspace) return;
      setConfirmLoading(true);
      setConfirmError(null);
      setConfirmResult(null);
      try {
        const { data } = await api.post<BulkConfirmResult>(
          `/api/workspaces/${currentWorkspace.id}/posts/bulk/confirm`,
          { posts },
        );
        setConfirmResult(data);
      } catch (err) {
        setConfirmError(extractErrorMessage(err, 'Failed to confirm posts'));
      } finally {
        setConfirmLoading(false);
      }
    },
    [currentWorkspace],
  );

  const resetCsv = useCallback(() => {
    setCsvResult(null);
    setCsvError(null);
  }, []);

  const resetMedia = useCallback(() => {
    setMediaPreview(null);
    setMediaError(null);
  }, []);

  const resetConfirm = useCallback(() => {
    setConfirmResult(null);
    setConfirmError(null);
  }, []);

  return {
    // CSV
    csvLoading,
    csvError,
    csvResult,
    downloadTemplate,
    uploadCsv,
    resetCsv,
    // Media
    mediaLoading,
    mediaError,
    mediaPreview,
    uploadMedia,
    resetMedia,
    // Confirm
    confirmLoading,
    confirmError,
    confirmResult,
    confirmBulk,
    resetConfirm,
    // Helpers
    setMediaPreview,
  };
}
