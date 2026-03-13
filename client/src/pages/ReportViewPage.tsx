import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Download, Loader2, ExternalLink } from 'lucide-react';
import { AreaChart } from '@tremor/react';
import toast from 'react-hot-toast';
import { useReport, useReports } from '../hooks/useReports';
import { extractErrorMessage } from '../lib/errorUtils';
import { getAccessToken } from '../lib/api';
import type { AccountReportSection, TopPost } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Top Posts Table ──────────────────────────────────────────────────────────

function TopPostsTable({ posts }: { posts: TopPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">No posts with insights in this date range.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Caption</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Reach</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Likes</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Comments</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Saved</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Eng. Rate</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Published</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, i) => (
              <tr
                key={post.postId}
                className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}
              >
                <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                <td className="px-4 py-3 max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 line-clamp-2">
                      {post.caption ? post.caption.slice(0, 80) + (post.caption.length > 80 ? '...' : '') : '—'}
                    </span>
                    {post.igPermalink && (
                      <a
                        href={post.igPermalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-gray-400 hover:text-indigo-600"
                        title="View on Instagram"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-700">{fmt(post.reach)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{fmt(post.likeCount)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{fmt(post.commentCount)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{fmt(post.savedCount)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {fmtPct(post.engagementRate)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {post.publishedAt ? fmtDate(post.publishedAt) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Account Section ──────────────────────────────────────────────────────────

function AccountSection({ section }: { section: AccountReportSection }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-gray-900">@{section.igUsername}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{section.accountId}</p>
      </div>

      {!section.dataAvailable ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-800">No insights data available</p>
          {section.suggestion && (
            <p className="text-sm text-amber-700 mt-1">{section.suggestion}</p>
          )}
        </div>
      ) : (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Total Reach" value={fmt(section.totalReach)} />
            <MetricCard label="Total Impressions" value={fmt(section.totalImpressions)} />
            <MetricCard label="Profile Views" value={fmt(section.totalProfileViews)} />
            <MetricCard
              label="Follower Growth"
              value={`${section.followerEnd - section.followerStart >= 0 ? '+' : ''}${fmt(section.followerEnd - section.followerStart)}`}
              sub={`${fmt(section.followerStart)} → ${fmt(section.followerEnd)}`}
            />
          </div>

          {/* Area Chart */}
          {section.series.length > 1 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3">Reach &amp; Impressions Over Time</p>
              <AreaChart
                className="h-48"
                data={section.series}
                index="date"
                categories={['reach', 'impressions']}
                colors={['indigo', 'cyan']}
                showLegend={true}
                showYAxis={false}
                showGridLines={false}
                showXAxis={true}
                curveType="monotone"
                valueFormatter={fmt}
              />
            </div>
          )}

          {/* Top Posts */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Top Posts by Engagement (up to 10)
            </h4>
            <TopPostsTable posts={section.topPosts} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportViewPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { report, loading, error } = useReport(reportId);
  const { shareReport, getExportUrl } = useReports();

  const handleShare = async () => {
    if (!reportId) return;
    try {
      const { shareToken } = await shareReport(reportId);
      const shareUrl = `${window.location.origin}/shared-report/${shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to create share link'));
    }
  };

  const handleExport = async () => {
    if (!reportId) return;
    const url = getExportUrl(reportId);
    if (!url) return;
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
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-sm text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading report...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/reports')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? 'Report not found.'}
        </div>
      </div>
    );
  }

  const data = report.data;
  const multiAccount = data.sections.length > 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            onClick={() => navigate('/reports')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {fmtDate(data.startDate)} &ndash; {fmtDate(data.endDate)}
            <span className="mx-2 text-gray-300">&bull;</span>
            Generated {fmtDate(data.generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Aggregate summary (multi-account) */}
      {multiAccount && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <h2 className="text-sm font-semibold text-indigo-800 mb-3">
            Combined Summary ({data.sections.length} accounts)
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-indigo-600 mb-0.5">Total Reach</p>
              <p className="text-2xl font-bold text-indigo-900">{fmt(data.aggregateSummary.totalReach)}</p>
            </div>
            <div>
              <p className="text-xs text-indigo-600 mb-0.5">Total Impressions</p>
              <p className="text-2xl font-bold text-indigo-900">{fmt(data.aggregateSummary.totalImpressions)}</p>
            </div>
            <div>
              <p className="text-xs text-indigo-600 mb-0.5">Profile Views</p>
              <p className="text-2xl font-bold text-indigo-900">{fmt(data.aggregateSummary.totalProfileViews)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Per-account sections */}
      {data.sections.map((section, i) => (
        <div key={section.accountId}>
          {i > 0 && <div className="border-t border-gray-200 pt-8 mt-2" />}
          <AccountSection section={section} />
        </div>
      ))}
    </div>
  );
}
