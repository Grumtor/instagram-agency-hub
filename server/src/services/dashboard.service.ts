import { prisma } from '../config/database';
import { PostStatus } from '../types/enums';

export async function getStats(workspaceId: string) {
  const [
    totalAccounts,
    activeAccounts,
    totalPosts,
    scheduledCount,
    publishedCount,
    failedCount,
    draftCount,
    recentPosts,
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
  ]);

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
      mediaUrls: JSON.parse(p.mediaUrls),
    })),
  };
}
