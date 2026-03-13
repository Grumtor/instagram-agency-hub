import { prisma } from '../config/database';
import { decrypt } from '../config/encryption';
import { config } from '../config';
import { logger } from '../utils/logger';
import { PostStatus, PostType, AuditAction } from '../types/enums';
import { createAuditLog } from '../services/auditLog.service';
import { createNotificationForWorkspace } from '../services/notification.service';
import { safeParseMediaUrls } from '../utils/safeJson';
import * as publisher from '../services/publisher.service';

const VIDEO_EXTENSIONS = /\.(mp4|mov|avi|wmv|webm|mkv)$/i;

export async function processPost(postId: string): Promise<void> {
  // Atomic lock: only one worker can transition a post to PUBLISHING
  const lockResult = await prisma.post.updateMany({
    where: { id: postId, status: { in: [PostStatus.SCHEDULED, PostStatus.DRAFT] } },
    data: { status: PostStatus.PUBLISHING },
  });

  if (lockResult.count === 0) {
    logger.info({ postId }, 'Post not in publishable state (likely already processing), skipping');
    return;
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { igAccount: true },
  });

  if (!post) {
    logger.error({ postId }, 'Post not found after lock');
    return;
  }

  try {
    const accessToken = decrypt(
      post.igAccount.accessTokenEncrypted,
      post.igAccount.accessTokenIV,
      post.igAccount.accessTokenTag,
      config.encryptionKey,
    );

    const mediaUrls = safeParseMediaUrls(post.mediaUrls);
    if (mediaUrls.length === 0) {
      throw new Error('Post has no media URLs');
    }
    const caption = post.caption ?? '';
    const igUserId = post.igAccount.igUserId;

    let result: { id: string; permalink?: string };

    switch (post.type) {
      case PostType.POST:
        result = await publisher.publishPhoto(
          igUserId,
          mediaUrls[0],
          caption,
          accessToken,
        );
        break;

      case PostType.CAROUSEL:
        result = await publisher.publishCarousel(
          igUserId,
          mediaUrls,
          caption,
          accessToken,
        );
        break;

      case PostType.REEL:
        result = await publisher.publishReel(
          igUserId,
          mediaUrls[0],
          caption,
          accessToken,
          post.thumbnailUrl ?? undefined,
        );
        break;

      case PostType.STORY: {
        const isVideo = VIDEO_EXTENSIONS.test(mediaUrls[0]);
        result = await publisher.publishStory(
          igUserId,
          mediaUrls[0],
          isVideo,
          accessToken,
        );
        break;
      }

      default:
        throw new Error(`Unknown post type: ${post.type}`);
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        igPostId: result.id,
        igPermalink: result.permalink ?? null,
      },
    });

    await createAuditLog(
      post.workspaceId,
      post.createdById,
      AuditAction.POST_PUBLISHED,
      'Post',
      post.id,
      { igPostId: result.id, igPermalink: result.permalink },
    );

    logger.info({ postId, igPostId: result.id }, 'Post published successfully');
  } catch (error) {
    const newRetryCount = post.retryCount + 1;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (newRetryCount < post.maxRetries) {
      const retryDelayMs = 30_000 * Math.pow(2, post.retryCount);
      const nextRetryAt = new Date(Date.now() + retryDelayMs);

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.SCHEDULED,
          retryCount: newRetryCount,
          scheduledAt: nextRetryAt,
          errorMessage,
        },
      });

      logger.warn(
        { postId, retryCount: newRetryCount, nextRetryAt },
        'Post publish failed, will retry',
      );
    } else {
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.FAILED,
          retryCount: newRetryCount,
          errorMessage,
        },
      });

      await createAuditLog(
        post.workspaceId,
        post.createdById,
        AuditAction.POST_FAILED,
        'Post',
        post.id,
        { error: errorMessage, retryCount: newRetryCount },
      );

      createNotificationForWorkspace({
        workspaceId: post.workspaceId,
        type: 'post_failed',
        title: 'Post failed to publish',
        message: `A post failed to publish after ${newRetryCount} attempt(s): ${errorMessage}`,
        link: `/posts`,
        metadata: { postId: post.id, error: errorMessage, retryCount: newRetryCount },
      }).catch((err) => logger.error({ err, postId }, 'Failed to create post_failed notification'));

      logger.error({ postId, error: errorMessage }, 'Post publish failed permanently');
    }
  }
}
