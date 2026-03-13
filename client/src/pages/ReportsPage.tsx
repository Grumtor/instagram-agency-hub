import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  Share2,
  Download,
  Calendar,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useReports } from '../hooks/useReports';
import { useAccounts } from '../hooks/useAccounts';
import { useWorkspace } from '../hooks/useWorkspace';
import { extractErrorMessage } from '../lib/errorUtils';
import { getAccessToken } from '../lib/api';
import type { ReportListItem } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Generate Report Modal ────────────────────────────────────────────────────

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (data: {
    title: string;
    accountIds: string[];
    startDate: string;
    endDate: string;
  }) => Promise<void>;
  accountOptions: Array<{ id: string; igUsername: string }>;
}

function GenerateModal({ open, onClose, onGenerate, accountOptions }: GenerateModalProps) {
  const [title, setTitle] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (selectedAccountIds.length === 0) { setError('Select at least one account'); return; }
    if (!startDate) { setError('Start date is required'); return; }
    if (!endDate) { setError('End date is required'); return; }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onGenerate({
        title: title.trim(),
        accountIds: selectedAccountIds,
        startDate,
        endDate,
      });
      setTitle('');
      setSelectedAccountIds([]);
      setStartDate('');
      setEndDate('');
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to generate report'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Generate Report</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Report Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. February 2026 Performance Report"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Accounts <span className="text-red-500">*</span>
            </label>
            {accountOptions.length === 0 ? (
              <p className="text-sm text-gray-500">No connected accounts found.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {accountOptions.map((acc) => (
                  <label
                    key={acc.id}
                    className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-gray-50"
                  >
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                        selectedAccountIds.includes(acc.id)
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-gray-300'
                      }`}
                      onClick={() => toggleAccount(acc.id)}
                    >
                      {selectedAccountIds.includes(acc.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">@{acc.igUsername}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

interface ReportCardProps {
  report: ReportListItem;
  onShare: (reportId: string) => void;
  onExport: (reportId: string) => void;
  onView: (reportId: string) => void;
  sharing: boolean;
}

function ReportCard({ report, onShare, onExport, onView, sharing }: ReportCardProps) {
  const isShareExpired =
    report.shareToken &&
    report.shareExpiresAt &&
    new Date(report.shareExpiresAt) < new Date();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{report.title}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {fmtDate(report.startDate)} &ndash; {fmtDate(report.endDate)}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {report.accountIds.length} account{report.accountIds.length !== 1 ? 's' : ''}
            {report.createdBy ? ` · by ${report.createdBy.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onShare(report.id)}
            disabled={sharing}
            title="Generate share link"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onExport(report.id)}
            title="Export as HTML"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {report.shareToken && !isShareExpired && (
        <p className="mt-2 text-xs text-green-600">
          Share link active &bull; expires {fmtDate(report.shareExpiresAt!)}
        </p>
      )}
      {isShareExpired && (
        <p className="mt-2 text-xs text-amber-500">Share link expired</p>
      )}

      <div className="mt-3 border-t border-gray-100 pt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">Generated {fmtDate(report.createdAt)}</span>
        <button
          onClick={() => onView(report.id)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          View report
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { reports, loading, error, refetch, generateReport, shareReport, getExportUrl } =
    useReports();
  const { accounts } = useAccounts();

  const [modalOpen, setModalOpen] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const accountOptions = accounts.filter((a) => a.isActive).map((a) => ({
    id: a.id,
    igUsername: a.igUsername,
  }));

  const handleGenerate = useCallback(
    async (data: {
      title: string;
      accountIds: string[];
      startDate: string;
      endDate: string;
    }) => {
      const report = await generateReport(data);
      toast.success('Report generated');
      navigate(`/reports/${report.id}`);
    },
    [generateReport, navigate],
  );

  const handleShare = useCallback(
    async (reportId: string) => {
      setSharingId(reportId);
      try {
        const { shareToken } = await shareReport(reportId);
        const shareUrl = `${window.location.origin}/shared-report/${shareToken}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Share link copied to clipboard!');
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Failed to create share link'));
      } finally {
        setSharingId(null);
      }
    },
    [shareReport],
  );

  const handleExport = useCallback(
    async (reportId: string) => {
      const url = getExportUrl(reportId);
      if (!url) return;
      // Fetch with auth token then trigger download
      const token = getAccessToken();
      try {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = `report-${reportId}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(href);
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Failed to export report'));
      }
    },
    [getExportUrl],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and share performance reports for your Instagram accounts
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Report
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500">Loading reports...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={refetch} className="ml-2 underline">Retry</button>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">No reports yet. Generate your first report!</p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onShare={handleShare}
              onExport={handleExport}
              onView={(id) => navigate(`/reports/${id}`)}
              sharing={sharingId === report.id}
            />
          ))}
        </div>
      )}

      <GenerateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGenerate={handleGenerate}
        accountOptions={accountOptions}
      />
    </div>
  );
}
