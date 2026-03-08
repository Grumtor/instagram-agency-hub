import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspace } from '../hooks/useWorkspace';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorAlert } from '../components/common/ErrorAlert';
import type { AuditLogEntry } from '../types';

export default function AuditLogPage() {
  const { currentWorkspace } = useWorkspace();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/api/workspaces/${currentWorkspace.id}/audit-log`,
        { params: { page, limit } }
      );
      setEntries(data.logs ?? data.entries ?? data);
      setTotal(data.pagination?.total ?? data.total ?? (data.logs ?? data.entries ?? data).length);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track all actions performed in your workspace
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading audit logs..." />
      ) : error ? (
        <ErrorAlert message={error} onRetry={fetchLogs} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No activity yet"
          description="Actions performed in this workspace will appear here."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    User
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {format(new Date(entry.createdAt), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                      {entry.user?.name || entry.user?.email || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {entry.entityType}
                      {entry.entityId && (
                        <span className="ml-1 text-gray-400">#{entry.entityId.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {entry.metadata
                        ? JSON.stringify(entry.metadata).slice(0, 80)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} entries)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
