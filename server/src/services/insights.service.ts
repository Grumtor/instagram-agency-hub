import { prisma } from '../config/database';
import { decrypt } from '../config/encryption';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError, NotFoundError } from '../utils/errors';
import { getAccountInsights, getInstagramProfile, getMediaInsights } from './metaApi.service';
import { daysAgo } from '../utils/dateUtils';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Minimal shape required from a pre-fetched InstagramAccount
interface AccountTokenFields {
  id: string;
  igUserId: string;
  accessTokenEncrypted: string;
  accessTokenIV: string;
  accessTokenTag: string;
}

// Minimal shape required from a pre-fetched Post (with igAccount included)
interface PostWithAccount {
  id: string;
  igPostId: string | null;
  igAccount: AccountTokenFields;
}

/**
 * Refresh account insights for the given igAccountId.
 *
 * @param igAccountId - The internal account ID to refresh.
 * @param force       - When true, bypass the 6-hour staleness guard.
 * @param account     - Optional pre-fetched account. When provided, the DB
 *                      lookup is skipped (eliminates the double fetch from
 *                      the controller ownership check).
 */
export async function refreshAccountInsights(
  igAccountId: string,
  force = false,
  account?: AccountTokenFields,
): Promise<void> {
  const resolvedAccount =
    account ??
    (await prisma.instagramAccount.findUnique({
      where: { id: igAccountId },
    }));

  if (!resolvedAccount) {
    throw new NotFoundError('Instagram account');
  }

  // Staleness guard: skip if most recent AccountInsight is within the last 6 hours
  if (!force) {
    const latest = await prisma.accountInsight.findFirst({
      where: { igAccountId },
      orderBy: { fetchedAt: 'desc' },
      select: { fetchedAt: true },
    });
    if (latest && Date.now() - latest.fetchedAt.getTime() < CACHE_TTL_MS) {
      logger.debug({ igAccountId }, 'AccountInsight cache hit, skipping refresh');
      return;
    }
  }

  const accessToken = decrypt(
    resolvedAccount.accessTokenEncrypted,
    resolvedAccount.accessTokenIV,
    resolvedAccount.accessTokenTag,
    config.encryptionKey,
  );

  const until = new Date();
  const since = daysAgo(28);

  const [insightData, profile] = await Promise.all([
    getAccountInsights(resolvedAccount.igUserId, accessToken, since, until),
    getInstagramProfile(resolvedAccount.igUserId, accessToken),
  ]);

  const followerCount = profile.followers_count ?? 0;

  // Build a map of date -> metrics across all returned metric series
  const dateMap: Map<string, { impressions: number; reach: number; profileViews: number }> =
    new Map();

  for (const metric of insightData) {
    for (const entry of metric.values) {
      const dateKey = entry.end_time.slice(0, 10); // YYYY-MM-DD
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { impressions: 0, reach: 0, profileViews: 0 });
      }
      const row = dateMap.get(dateKey)!;
      if (metric.name === 'impressions') row.impressions = entry.value;
      if (metric.name === 'reach') row.reach = entry.value;
      if (metric.name === 'profile_views') row.profileViews = entry.value;
    }
  }

  for (const [dateKey, metrics] of dateMap.entries()) {
    const date = new Date(`${dateKey}T00:00:00.000Z`);

    await prisma.accountInsight.upsert({
      where: { igAccountId_date: { igAccountId, date } },
      create: {
        igAccountId,
        date,
        impressions: metrics.impressions,
        reach: metrics.reach,
        profileViews: metrics.profileViews,
        followerCount,
        fetchedAt: new Date(),
      },
      update: {
        impressions: metrics.impressions,
        reach: metrics.reach,
        profileViews: metrics.profileViews,
        followerCount,
        fetchedAt: new Date(),
      },
    });
  }

  logger.info({ igAccountId, daysUpserted: dateMap.size, followerCount }, 'Account insights refreshed');
}

/**
 * Refresh post insights for the given postId.
 *
 * @param postId - The internal post ID to refresh.
 * @param post   - Optional pre-fetched post (with igAccount). When provided,
 *                 the DB lookup is skipped.
 */
export async function refreshPostInsights(
  postId: string,
  post?: PostWithAccount,
): Promise<void> {
  const resolvedPost =
    post ??
    (await prisma.post.findUnique({
      where: { id: postId },
      include: { igAccount: true },
    }));

  if (!resolvedPost) {
    throw new NotFoundError('Post');
  }

  if (!resolvedPost.igPostId) {
    throw new AppError('Post has not been published to Instagram', 422);
  }

  // Staleness guard: skip if cached within last 6 hours
  const existing = await prisma.postInsight.findUnique({
    where: { postId },
  });

  if (existing && Date.now() - existing.fetchedAt.getTime() < CACHE_TTL_MS) {
    logger.debug({ postId }, 'PostInsight cache hit, skipping refresh');
    return;
  }

  const accessToken = decrypt(
    resolvedPost.igAccount.accessTokenEncrypted,
    resolvedPost.igAccount.accessTokenIV,
    resolvedPost.igAccount.accessTokenTag,
    config.encryptionKey,
  );

  const insightData = await getMediaInsights(resolvedPost.igPostId, accessToken);

  let likeCount = 0;
  let commentCount = 0;
  let savedCount = 0;
  let reach = 0;
  let impressions = 0;

  for (const metric of insightData) {
    const value = metric.values[0]?.value ?? 0;
    if (metric.name === 'like_count') likeCount = value;
    if (metric.name === 'comments_count') commentCount = value;
    if (metric.name === 'saved') savedCount = value;
    if (metric.name === 'reach') reach = value;
    if (metric.name === 'impressions') impressions = value;
  }

  const engagementRate =
    reach > 0 ? (likeCount + commentCount + savedCount) / reach : 0;

  await prisma.postInsight.upsert({
    where: { postId },
    create: {
      postId,
      likeCount,
      commentCount,
      savedCount,
      reach,
      impressions,
      engagementRate,
      fetchedAt: new Date(),
    },
    update: {
      likeCount,
      commentCount,
      savedCount,
      reach,
      impressions,
      engagementRate,
      fetchedAt: new Date(),
    },
  });

  logger.info({ postId }, 'Post insights refreshed');
}

export async function getLatestAccountSummary(igAccountId: string) {
  const insight = await prisma.accountInsight.findFirst({
    where: { igAccountId },
    orderBy: { date: 'desc' },
  });

  if (!insight) {
    return null;
  }

  return {
    followerCount: insight.followerCount,
    impressions: insight.impressions,
    reach: insight.reach,
    profileViews: insight.profileViews,
    date: insight.date.toISOString(),
  };
}
