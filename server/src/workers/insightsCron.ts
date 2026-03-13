import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { refreshAccountInsights, refreshPostInsights } from '../services/insights.service';
import { getLastAppUsage } from '../services/metaApi.service';
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
      } catch (err) {
        errors++;
        logger.error({ err, postId: post.id }, 'Post insight refresh failed');
      }
    }

    logger.info({ refreshed, errors }, 'Insights refresh complete');
  });
}
