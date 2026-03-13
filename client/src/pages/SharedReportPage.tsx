import { useParams } from 'react-router-dom';
import { Loader2, ExternalLink, Instagram } from 'lucide-react';
import { AreaChart } from '@tremor/react';
import { useSharedReport } from '../hooks/useReports';
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
      <p className="text-2xl font-bold text-gray-900">{value}</p>
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
                      {post.caption
                        ? post.caption.slice(0, 80) + (post.caption.length > 80 ? '...' : '')
                        : '—'}
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

          {section.series.length > 1 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Reach &amp; Impressions Over Time
              </p>
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

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>();
  const { report, loading, error, expired } = useSharedReport(token);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          Loading report...
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-xl border border-gray-200 bg-white p-10 shadow-sm">
            <p className="text-4xl mb-4">🔗</p>
            <h1 className="text-xl font-bold text-gray-900 mb-2">This link has expired</h1>
            <p className="text-sm text-gray-500">
              Shared report links are valid for 30 days. Please ask the sender to generate a new
              share link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-xl border border-red-200 bg-white p-10 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Report not found</h1>
            <p className="text-sm text-gray-500">{error ?? 'This report link is invalid.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const data = report.data;
  const multiAccount = data.sections.length > 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Instagram className="h-5 w-5 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-700">Instagram Agency Hub</span>
          <span className="ml-auto text-xs text-gray-400">Client Report</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {fmtDate(data.startDate)} &ndash; {fmtDate(data.endDate)}
          </p>
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
                <p className="text-2xl font-bold text-indigo-900">
                  {fmt(data.aggregateSummary.totalReach)}
                </p>
              </div>
              <div>
                <p className="text-xs text-indigo-600 mb-0.5">Total Impressions</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {fmt(data.aggregateSummary.totalImpressions)}
                </p>
              </div>
              <div>
                <p className="text-xs text-indigo-600 mb-0.5">Profile Views</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {fmt(data.aggregateSummary.totalProfileViews)}
                </p>
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

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center">
          <p className="text-xs text-gray-400">
            Generated by Instagram Agency Hub &bull; {fmtDate(data.generatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
