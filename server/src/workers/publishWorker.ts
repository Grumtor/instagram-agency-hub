import { prisma } from '../config/database';
import { decrypt } from '../config/encryption';
import { config } from '../config';
import { logger } from '../utils/logger';
import { PostStatus, PostType, AuditAction } from '../types/enums';
import { createAuditLog } from '../services/auditLog.service';
import * as publisher from '../services/publisher.service';

const VIDEO_EXTENSIONS = /\.(mp4|mov|avi|wmv|webm|mkv)$/i;

export async function processPost(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { igAccount: true },
  });

  if (!post) {
    logger.error({ postId }, 'Post not found for publishing');
    return;
  }

  if (post.status === PostStatus.PUBLISHED) {
    logger.info({ postId }, 'Post already published, skipping');
    return;
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: PostStatus.PUBLISHING },
  });

  try {
    const accessToken = decrypt(
      post.igAccount.accessTokenEncrypted,
      post.igAccount.accessTokenIV,
      post.igAccount.accessTokenTag,
      config.encryptionKey,
    );

    const mediaUrls: string[] = JSON.parse(post.mediaUrls);
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

      logger.error({ postId, error: errorMessage }, 'Post publish failed permanently');
    }
  }
}
