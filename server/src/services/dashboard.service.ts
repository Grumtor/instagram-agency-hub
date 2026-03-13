import { prisma } from '../config/database';
import { PostStatus } from '../types/enums';
import { safeParseMediaUrls } from '../utils/safeJson';
import { daysAgo } from '../utils/dateUtils';

export async function getStats(workspaceId: string) {
  const twentyEightDaysAgo = daysAgo(28);

  const [
    totalAccounts,
    activeAccounts,
    totalPosts,
    scheduledCount,
    publishedCount,
    failedCount,
    draftCount,
    recentPosts,
    activeAccountsWithInsights,
  ] = await Promise.all([
    prisma.instagramAccount.count({ where: { workspaceId } }),
    prisma.instagramAccount.count({ where: { workspaceId, isActive: true } }),
    prisma.post.count({ where: { workspaceId } }),
    prisma.post.count({ where: { workspaceId, status: PostStatus.SCHEDULED } }),
    prisma.post.count({ where: { workspaceId, status: PostStatus.PUBLISHED } }),
    prisma.post.count({ where: { workspaceId, status: PostStatus.FAILED } }),
    prisma.post.count({ where: { workspaceId, status: PostStatus.DRAFT } }),
    prisma.post.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        igAccount: { select: { id: true, igUsername: true } },
      },
    }),
    prisma.instagramAccount.findMany({
      where: { workspaceId, isActive: true },
      select: {
        id: true,
        igUsername: true,
        accountInsights: {
          where: { date: { gte: twentyEightDaysAgo } },
          orderBy: { date: 'asc' },
        },
      },
    }),
  ]);

  const accountInsights = activeAccountsWithInsights.map((account) => {
    const sorted = account.accountInsights;
    const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
    const series = sorted.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      impressions: row.impressions ?? 0,
      reach: row.reach ?? 0,
      profileViews: row.profileViews ?? 0,
      followerCount: row.followerCount ?? 0,
    }));
    return {
      igAccountId: account.id,
      igUsername: account.igUsername,
      followerCount: latest?.followerCount ?? null,
      reach: latest?.reach ?? null,
      impressions: latest?.impressions ?? null,
      profileViews: latest?.profileViews ?? null,
      date: latest?.date.toISOString() ?? null,
      series,
    };
  });

  return {
    totalAccounts,
    activeAccounts,
    totalPosts,
    scheduledCount,
    publishedCount,
    failedCount,
    draftCount,
    recentPosts: recentPosts.map((p) => ({
      ...p,
      mediaUrls: safeParseMediaUrls(p.mediaUrls),
    })),
    accountInsights,
  };
}
