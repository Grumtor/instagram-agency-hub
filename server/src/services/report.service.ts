import crypto from 'crypto';
import { prisma } from '../config/database';
import { AppError, NotFoundError } from '../utils/errors';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TopPost {
  postId: string;
  igPostId: string | null;
  igPermalink: string | null;
  caption: string | null;
  publishedAt: string | null;
  likeCount: number;
  commentCount: number;
  savedCount: number;
  reach: number;
  impressions: number;
  engagementRate: number;
}

export interface AccountReportSection {
  accountId: string;
  igUsername: string;
  totalReach: number;
  totalImpressions: number;
  totalProfileViews: number;
  followerStart: number;
  followerEnd: number;
  dataAvailable: boolean;
  suggestion?: string;
  topPosts: TopPost[];
  series: Array<{
    date: string;
    reach: number;
    impressions: number;
    profileViews: number;
    followerCount: number;
  }>;
}

export interface ReportData {
  title: string;
  workspaceId: string;
  accountIds: string[];
  startDate: string;
  endDate: string;
  generatedAt: string;
  sections: AccountReportSection[];
  aggregateSummary: {
    totalReach: number;
    totalImpressions: number;
    totalProfileViews: number;
    totalTopPosts: TopPost[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Service Functions ────────────────────────────────────────────────────────

export async function generateReport(
  workspaceId: string,
  accountIds: string[],
  title: string,
  startDate: Date,
  endDate: Date,
  userId: string,
): Promise<{ id: string; data: ReportData; createdAt: Date }> {
  // Fetch account details for all requested accounts
  const accounts = await prisma.instagramAccount.findMany({
    where: {
      id: { in: accountIds },
      workspaceId,
    },
    select: { id: true, igUsername: true },
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const sections: AccountReportSection[] = [];

  for (const accountId of accountIds) {
    const account = accountMap.get(accountId);
    if (!account) {
      // Skip accounts that don't belong to this workspace
      continue;
    }

    // Fetch account insights in date range
    const accountInsights = await prisma.accountInsight.findMany({
      where: {
        igAccountId: accountId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const dataAvailable = accountInsights.length > 0;

    let totalReach = 0;
    let totalImpressions = 0;
    let totalProfileViews = 0;
    let followerStart = 0;
    let followerEnd = 0;

    const series = accountInsights.map((insight) => {
      totalReach += insight.reach;
      totalImpressions += insight.impressions;
      totalProfileViews += insight.profileViews;

      return {
        date: insight.date.toISOString().slice(0, 10),
        reach: insight.reach,
        impressions: insight.impressions,
        profileViews: insight.profileViews,
        followerCount: insight.followerCount,
      };
    });

    if (accountInsights.length > 0) {
      followerStart = accountInsights[0].followerCount;
      followerEnd = accountInsights[accountInsights.length - 1].followerCount;
    }

    // Fetch top posts by engagement within date range
    const posts = await prisma.post.findMany({
      where: {
        igAccountId: accountId,
        workspaceId,
        publishedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'PUBLISHED',
        insight: { isNot: null },
      },
      include: {
        insight: true,
      },
      orderBy: {
        insight: {
          engagementRate: 'desc',
        },
      },
      take: 10,
    });

    const topPosts: TopPost[] = posts
      .filter((p) => p.insight !== null)
      .map((p) => ({
        postId: p.id,
        igPostId: p.igPostId,
        igPermalink: p.igPermalink,
        caption: p.caption,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        likeCount: p.insight!.likeCount,
        commentCount: p.insight!.commentCount,
        savedCount: p.insight!.savedCount,
        reach: p.insight!.reach,
        impressions: p.insight!.impressions,
        engagementRate: p.insight!.engagementRate,
      }));

    sections.push({
      accountId,
      igUsername: account.igUsername,
      totalReach,
      totalImpressions,
      totalProfileViews,
      followerStart,
      followerEnd,
      dataAvailable,
      suggestion: dataAvailable
        ? undefined
        : 'No insights data found for this date range. Please check insights collection is enabled for this account.',
      topPosts,
      series,
    });
  }

  // Compute aggregate summary across all sections
  const allTopPosts = sections
    .flatMap((s) => s.topPosts)
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, 10);

  const aggregateSummary = {
    totalReach: sections.reduce((sum, s) => sum + s.totalReach, 0),
    totalImpressions: sections.reduce((sum, s) => sum + s.totalImpressions, 0),
    totalProfileViews: sections.reduce((sum, s) => sum + s.totalProfileViews, 0),
    totalTopPosts: allTopPosts,
  };

  const reportData: ReportData = {
    title,
    workspaceId,
    accountIds,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    generatedAt: new Date().toISOString(),
    sections,
    aggregateSummary,
  };

  const report = await prisma.report.create({
    data: {
      workspaceId,
      title,
      accountIds: accountIds.join(','),
      startDate,
      endDate,
      data: reportData as object,
      createdById: userId,
    },
  });

  return {
    id: report.id,
    data: reportData,
    createdAt: report.createdAt,
  };
}

export async function getReports(workspaceId: string) {
  const reports = await prisma.report.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      accountIds: true,
      startDate: true,
      endDate: true,
      shareToken: true,
      shareExpiresAt: true,
      createdAt: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return reports.map((r) => ({
    ...r,
    accountIds: r.accountIds.split(',').filter(Boolean),
  }));
}

export async function getReport(reportId: string, workspaceId: string) {
  const report = await prisma.report.findFirst({
    where: { id: reportId, workspaceId },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  return {
    ...report,
    accountIds: report.accountIds.split(',').filter(Boolean),
  };
}

export async function shareReport(reportId: string, workspaceId: string) {
  const report = await prisma.report.findFirst({
    where: { id: reportId, workspaceId },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  const shareToken = generateShareToken();
  const shareExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { shareToken, shareExpiresAt },
  });

  return {
    shareToken: updated.shareToken,
    shareExpiresAt: updated.shareExpiresAt,
  };
}

export async function getSharedReport(shareToken: string) {
  const report = await prisma.report.findUnique({
    where: { shareToken },
  });

  if (!report) {
    throw new AppError('This shared report link has expired or is invalid', 410);
  }

  if (!report.shareExpiresAt || report.shareExpiresAt < new Date()) {
    throw new AppError('This shared report link has expired', 410);
  }

  return {
    ...report,
    accountIds: report.accountIds.split(',').filter(Boolean),
  };
}

export function exportReportAsHtml(report: {
  id: string;
  title: string;
  data: unknown;
  createdAt: Date;
}): string {
  const data = report.data as ReportData;
  const { sections, aggregateSummary } = data;

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;

  const postRowsHtml = (posts: TopPost[]) => {
    if (posts.length === 0) return '<tr><td colspan="6" style="text-align:center;color:#888;padding:12px">No posts in this date range</td></tr>';
    return posts
      .map(
        (p, i) => `
        <tr style="border-bottom:1px solid #e5e7eb;${i % 2 === 0 ? '' : 'background:#f9fafb'}">
          <td style="padding:8px 12px">${i + 1}</td>
          <td style="padding:8px 12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.caption ? p.caption.slice(0, 80) + (p.caption.length > 80 ? '...' : '') : '—'}</td>
          <td style="padding:8px 12px;text-align:right">${fmt(p.reach)}</td>
          <td style="padding:8px 12px;text-align:right">${fmt(p.likeCount + p.commentCount + p.savedCount)}</td>
          <td style="padding:8px 12px;text-align:right">${fmtPct(p.engagementRate)}</td>
          <td style="padding:8px 12px">${p.publishedAt ? fmtDate(p.publishedAt) : '—'}${p.igPermalink ? ` <a href="${p.igPermalink}" style="color:#6366f1;font-size:11px" target="_blank">View</a>` : ''}</td>
        </tr>`,
      )
      .join('');
  };

  const sectionHtml = sections
    .map(
      (section) => `
    <div style="margin-bottom:48px;page-break-inside:avoid">
      <h2 style="font-size:20px;font-weight:700;color:#1f2937;margin:0 0 4px">@${section.igUsername}</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:13px">${section.accountId}</p>

      ${
        !section.dataAvailable
          ? `<div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:16px;color:#92400e;font-size:14px">
              No insights data available for this date range. ${section.suggestion ?? ''}
             </div>`
          : `
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px">
        <div style="flex:1;min-width:120px;background:#f0f9ff;border-radius:8px;padding:16px;text-align:center">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Total Reach</div>
          <div style="font-size:28px;font-weight:700;color:#0369a1">${fmt(section.totalReach)}</div>
        </div>
        <div style="flex:1;min-width:120px;background:#faf5ff;border-radius:8px;padding:16px;text-align:center">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Total Impressions</div>
          <div style="font-size:28px;font-weight:700;color:#7c3aed">${fmt(section.totalImpressions)}</div>
        </div>
        <div style="flex:1;min-width:120px;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Profile Views</div>
          <div style="font-size:28px;font-weight:700;color:#16a34a">${fmt(section.totalProfileViews)}</div>
        </div>
        <div style="flex:1;min-width:120px;background:#fff7ed;border-radius:8px;padding:16px;text-align:center">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Follower Growth</div>
          <div style="font-size:28px;font-weight:700;color:#c2410c">${section.followerEnd - section.followerStart >= 0 ? '+' : ''}${fmt(section.followerEnd - section.followerStart)}</div>
          <div style="font-size:11px;color:#9ca3af">${fmt(section.followerStart)} → ${fmt(section.followerEnd)}</div>
        </div>
      </div>

      <h3 style="font-size:15px;font-weight:600;color:#374151;margin:0 0 12px">Top Posts by Engagement</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f3f4f6;text-align:left">
            <th style="padding:8px 12px;font-weight:600;color:#374151">#</th>
            <th style="padding:8px 12px;font-weight:600;color:#374151">Caption</th>
            <th style="padding:8px 12px;font-weight:600;color:#374151;text-align:right">Reach</th>
            <th style="padding:8px 12px;font-weight:600;color:#374151;text-align:right">Engagements</th>
            <th style="padding:8px 12px;font-weight:600;color:#374151;text-align:right">Eng. Rate</th>
            <th style="padding:8px 12px;font-weight:600;color:#374151">Published</th>
          </tr>
        </thead>
        <tbody>${postRowsHtml(section.topPosts)}</tbody>
      </table>
      `
      }
    </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.title} — Instagram Report</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
      h2, h3 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #111827;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 32px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div style="border-bottom:2px solid #6366f1;padding-bottom:24px;margin-bottom:32px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px">
        <div>
          <h1 style="margin:0 0 4px;font-size:28px;font-weight:800;color:#1f2937">${data.title}</h1>
          <p style="margin:0;color:#6b7280;font-size:14px">
            ${fmtDate(data.startDate)} &ndash; ${fmtDate(data.endDate)}
          </p>
        </div>
        <div style="text-align:right">
          <p style="margin:0;font-size:12px;color:#9ca3af">Generated ${fmtDate(data.generatedAt)}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">Instagram Agency Hub</p>
        </div>
      </div>
    </div>

    <!-- Aggregate Summary -->
    ${
      sections.length > 1
        ? `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:40px">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#374151">Combined Summary (${sections.length} accounts)</h2>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:100px;text-align:center">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Total Reach</div>
          <div style="font-size:24px;font-weight:700;color:#1f2937">${fmt(aggregateSummary.totalReach)}</div>
        </div>
        <div style="flex:1;min-width:100px;text-align:center">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Total Impressions</div>
          <div style="font-size:24px;font-weight:700;color:#1f2937">${fmt(aggregateSummary.totalImpressions)}</div>
        </div>
        <div style="flex:1;min-width:100px;text-align:center">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Profile Views</div>
          <div style="font-size:24px;font-weight:700;color:#1f2937">${fmt(aggregateSummary.totalProfileViews)}</div>
        </div>
      </div>
    </div>`
        : ''
    }

    <!-- Per-account sections -->
    ${sectionHtml}

    <div style="border-top:1px solid #e5e7eb;margin-top:48px;padding-top:16px;text-align:center">
      <p style="margin:0;font-size:11px;color:#9ca3af">
        Generated by Instagram Agency Hub &bull; ${fmtDate(data.generatedAt)}
      </p>
    </div>
  </div>

  <div class="no-print" style="position:fixed;bottom:20px;right:20px">
    <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 6px rgba(0,0,0,.1)">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>`;
}
