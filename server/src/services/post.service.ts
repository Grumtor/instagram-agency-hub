import { prisma } from '../config/database';
import { NotFoundError, AppError } from '../utils/errors';
import { PostStatus, AuditAction } from '../types/enums';
import { createAuditLog } from './auditLog.service';
import { safeParseMediaUrls } from '../utils/safeJson';
import type { CreatePostInput, UpdatePostInput } from '../validators/post.validator';

export async function createPost(
  data: CreatePostInput & { workspaceId: string; createdById: string },
) {
  const igAccount = await prisma.instagramAccount.findFirst({
    where: { id: data.igAccountId, workspaceId: data.workspaceId },
  });
  if (!igAccount) {
    throw new NotFoundError('Instagram account');
  }

  const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
  const status =
    scheduledAt && scheduledAt > new Date() ? PostStatus.SCHEDULED : PostStatus.DRAFT;

  const post = await prisma.post.create({
    data: {
      workspaceId: data.workspaceId,
      igAccountId: data.igAccountId,
      type: data.type,
      caption: data.caption ?? null,
      mediaUrls: data.mediaUrls,
      thumbnailUrl: data.thumbnailUrl ?? null,
      scheduledAt,
      status,
      createdById: data.createdById,
    },
    include: {
      igAccount: { select: { id: true, igUsername: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  await createAuditLog(
    data.workspaceId,
    data.createdById,
    AuditAction.POST_CREATED,
    'Post',
    post.id,
    { type: data.type, status },
  );

  return { ...post, mediaUrls: safeParseMediaUrls(post.mediaUrls) };
}

export async function getPosts(
  workspaceId: string,
  filters: { status?: string; igAccountId?: string; page: number; limit: number },
) {
  const { status, igAccountId, page, limit } = filters;
  const skip = (page - 1) * limit;

  const where = {
    workspaceId,
    ...(status && { status }),
    ...(igAccountId && { igAccountId }),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        igAccount: { select: { id: true, igUsername: true } },
        createdBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    posts: posts.map((p) => ({ ...p, mediaUrls: safeParseMediaUrls(p.mediaUrls) })),
    total,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPostById(postId: string, workspaceId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, workspaceId },
    include: {
      igAccount: { select: { id: true, igUsername: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  if (!post) {
    throw new NotFoundError('Post');
  }

  return { ...post, mediaUrls: safeParseMediaUrls(post.mediaUrls) };
}

export async function updatePost(
  postId: string,
  workspaceId: string,
  data: UpdatePostInput,
  userId: string,
) {
  const existing = await prisma.post.findFirst({
    where: { id: postId, workspaceId },
  });

  if (!existing) {
    throw new NotFoundError('Post');
  }

  if (existing.status !== PostStatus.DRAFT && existing.status !== PostStatus.SCHEDULED) {
    throw new AppError('Can only update posts with DRAFT or SCHEDULED status', 400);
  }

  const updateData: Record<string, unknown> = {};

  if (data.igAccountId !== undefined) {
    const igAccount = await prisma.instagramAccount.findFirst({
      where: { id: data.igAccountId, workspaceId },
    });
    if (!igAccount) {
      throw new NotFoundError('Instagram account');
    }
    updateData.igAccountId = data.igAccountId;
  }

  if (data.type !== undefined) updateData.type = data.type;
  if (data.caption !== undefined) updateData.caption = data.caption;
  if (data.mediaUrls !== undefined) updateData.mediaUrls = data.mediaUrls;
  if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;

  if (data.scheduledAt !== undefined) {
    if (data.scheduledAt === null) {
      updateData.scheduledAt = null;
      updateData.status = PostStatus.DRAFT;
    } else {
      const scheduledAt = new Date(data.scheduledAt);
      updateData.scheduledAt = scheduledAt;
      if (scheduledAt > new Date()) {
        updateData.status = PostStatus.SCHEDULED;
      }
    }
  }

  const post = await prisma.post.update({
    where: { id: postId },
    data: updateData,
    include: {
      igAccount: { select: { id: true, igUsername: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  await createAuditLog(
    workspaceId,
    userId,
    AuditAction.POST_UPDATED,
    'Post',
    post.id,
    data as Record<string, unknown>,
  );

  return { ...post, mediaUrls: safeParseMediaUrls(post.mediaUrls) };
}

export async function deletePost(postId: string, workspaceId: string, userId: string) {
  const existing = await prisma.post.findFirst({
    where: { id: postId, workspaceId },
  });

  if (!existing) {
    throw new NotFoundError('Post');
  }

  if (existing.status !== PostStatus.DRAFT && existing.status !== PostStatus.SCHEDULED) {
    throw new AppError('Can only delete posts with DRAFT or SCHEDULED status', 400);
  }

  await createAuditLog(
    workspaceId,
    userId,
    AuditAction.POST_DELETED,
    'Post',
    postId,
  );

  await prisma.post.delete({ where: { id: postId } });
  return { deleted: true };
}

export async function publishNow(postId: string, workspaceId: string, userId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, workspaceId },
    include: {
      igAccount: { select: { id: true, igUsername: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  if (!post) {
    throw new NotFoundError('Post');
  }

  if (
    post.status !== PostStatus.DRAFT &&
    post.status !== PostStatus.SCHEDULED
  ) {
    throw new AppError('Can only publish posts with DRAFT or SCHEDULED status', 400);
  }

  await createAuditLog(
    workspaceId,
    userId,
    AuditAction.POST_SCHEDULED,
    'Post',
    post.id,
    { action: 'publish_now' },
  );

  return { ...post, mediaUrls: safeParseMediaUrls(post.mediaUrls) };
}
