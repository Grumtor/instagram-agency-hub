import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { refreshAccountInsights, refreshPostInsights } from '../services/insights.service';
import { getLastAppUsage } from '../services/metaApi.service';
import { createNotificationForWorkspace } from '../services/notification.service';
import { daysAgo } from '../utils/dateUtils';

export function startInsightsCron(): void {
  cron.schedule('0 */6 * * *', async () => {
    const usage = getLastAppUsage();
    if (usage && usage.call_count > 80) {
      logger.warn('Skipping insights cron — API rate limit near threshold');
      return;
    }

    // Refresh account insights for all active accounts
    const accounts = await prisma.instagramAccount.findMany({
      where: { isActive: true },
    });

    let refreshed = 0;
    let errors = 0;

    for (const account of accounts) {
      try {
        await refreshAccountInsights(account.id);
        refreshed++;
      } catch (err) {
        errors++;
        logger.error({ err, accountId: account.id }, 'Account insight refresh failed');
      }
    }

    // Refresh post insights for published posts within last 30 days
    const cutoff = daysAgo(30);
    const posts = await prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: cutoff },
        igPostId: { not: null },
      },
    });

    for (const post of posts) {
      try {
        await refreshPostInsights(post.id);

        // Check for engagement spike (3x above account average)
        await checkEngagementSpike(post.id, post.workspaceId, post.caption);
      } catch (err) {
        errors++;
        logger.error({ err, postId: post.id }, 'Post insight refresh failed');
      }
    }

    logger.info({ refreshed, errors }, 'Insights refresh complete');
  });
}

async function checkEngagementSpike(
  postId: string,
  workspaceId: string,
  caption: string | null,
): Promise<void> {
  const postInsight = await prisma.postInsight.findUnique({
    where: { postId },
    include: { post: { include: { igAccount: true } } },
  });

  if (!postInsight || postInsight.engagementRate === 0) return;

  // Compute the account's average engagement rate over the last 30 posts (excluding this one)
  const recentInsights = await prisma.postInsight.findMany({
    where: {
      post: { igAccountId: postInsight.post.igAccountId, workspaceId },
      postId: { not: postId },
    },
    orderBy: { fetchedAt: 'desc' },
    take: 30,
    select: { engagementRate: true },
  });

  if (recentInsights.length < 3) return; // Not enough baseline data

  const avgEngagementRate =
    recentInsights.reduce((sum, r) => sum + r.engagementRate, 0) / recentInsights.length;

  if (avgEngagementRate === 0) return;

  const multiplier = postInsight.engagementRate / avgEngagementRate;

  if (multiplier >= 3) {
    const caption_preview = caption ? caption.slice(0, 60) + (caption.length > 60 ? '...' : '') : 'No caption';
    createNotificationForWorkspace({
      workspaceId,
      type: 'engagement_spike',
      title: 'Engagement spike detected',
      message: `Post "${caption_preview}" is performing ${multiplier.toFixed(1)}x above the account average.`,
      link: `/posts`,
      metadata: {
        postId,
        engagementRate: postInsight.engagementRate,
        avgEngagementRate,
        multiplier,
        likeCount: postInsight.likeCount,
        commentCount: postInsight.commentCount,
        savedCount: postInsight.savedCount,
      },
    }).catch((err) => logger.error({ err, postId }, 'Failed to create engagement_spike notification'));
  }
}
