import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Report, ReportListItem } from '../types';
import { useWorkspace } from './useWorkspace';
import { extractErrorMessage } from '../lib/errorUtils';

interface GenerateReportBody {
  title: string;
  accountIds: string[];
  startDate: string;
  endDate: string;
}

export function useReports() {
  const { currentWorkspace } = useWorkspace();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/reports`,
      );
      setReports(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load reports'));
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const generateReport = useCallback(
    async (body: GenerateReportBody): Promise<Report> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      const { data } = await api.post(
        `/api/workspaces/${currentWorkspace.id}/reports`,
        body,
      );
      await refetch();
      return data;
    },
    [currentWorkspace, refetch],
  );

  const shareReport = useCallback(
    async (reportId: string): Promise<{ shareToken: string; shareExpiresAt: string }> => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      const { data } = await api.post(
        `/api/workspaces/${currentWorkspace.id}/reports/${reportId}/share`,
      );
      await refetch();
      return data;
    },
    [currentWorkspace, refetch],
  );

  const getExportUrl = useCallback(
    (reportId: string): string => {
      if (!currentWorkspace) return '';
      return `/api/workspaces/${currentWorkspace.id}/reports/${reportId}/export`;
    },
    [currentWorkspace],
  );

  return { reports, loading, error, refetch, generateReport, shareReport, getExportUrl };
}

export function useReport(reportId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!currentWorkspace || !reportId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/reports/${reportId}`,
      );
      setReport(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load report'));
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, reportId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { report, loading, error, refetch: fetch };
}

export function useSharedReport(shareToken: string | undefined) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    setLoading(true);
    setError(null);
    setExpired(false);

    api
      .get(`/api/reports/shared/${shareToken}`)
      .then(({ data }) => setReport(data))
      .catch((err) => {
        if (err?.response?.status === 410) {
          setExpired(true);
        } else {
          setError(extractErrorMessage(err, 'Failed to load shared report'));
        }
      })
      .finally(() => setLoading(false));
  }, [shareToken]);

  return { report, loading, error, expired };
}
