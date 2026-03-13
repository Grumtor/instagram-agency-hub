import { prisma } from '../config/database';
import { AppError, NotFoundError } from '../utils/errors';
import { PostStatus } from '../types/enums';

export interface CalendarPost {
  id: string;
  captionPreview: string | null;
  type: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  igUsername: string;
  igAccountId: string;
  engagement?: {
    likeCount: number;
    commentCount: number;
    savedCount: number;
    engagementRate: number;
  } | null;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  posts: CalendarPost[];
}

function toCaptionPreview(caption: string | null, maxLength = 60): string | null {
  if (!caption) return null;
  return caption.length <= maxLength ? caption : caption.slice(0, maxLength) + '...';
}

export async function getCalendarPosts(
  workspaceId: string,
  month: string, // YYYY-MM
  igAccountId?: string,
): Promise<{ byDate: Record<string, CalendarPost[]>; unscheduledDrafts: CalendarPost[] }> {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 1); // first day of next month (exclusive)

  const where: Record<string, unknown> = {
    workspaceId,
    ...(igAccountId && { igAccountId }),
    OR: [
      // Posts with scheduledAt or publishedAt in the month
      { scheduledAt: { gte: startDate, lt: endDate } },
      { publishedAt: { gte: startDate, lt: endDate } },
      // Unscheduled drafts (no scheduledAt, DRAFT status) — returned separately
      { status: PostStatus.DRAFT, scheduledAt: null },
    ],
  };

  const posts = await prisma.post.findMany({
    where,
    select: {
      id: true,
      caption: true,
      type: true,
      status: true,
      scheduledAt: true,
      publishedAt: true,
      igAccountId: true,
      igAccount: { select: { igUsername: true } },
      insight: {
        select: {
          likeCount: true,
          commentCount: true,
          savedCount: true,
          engagementRate: true,
        },
      },
    },
    orderBy: [{ scheduledAt: 'asc' }, { publishedAt: 'asc' }, { createdAt: 'asc' }],
  });

  const byDate: Record<string, CalendarPost[]> = {};
  const unscheduledDrafts: CalendarPost[] = [];

  for (const post of posts) {
    const calPost: CalendarPost = {
      id: post.id,
      captionPreview: toCaptionPreview(post.caption),
      type: post.type,
      status: post.status,
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      igUsername: post.igAccount.igUsername,
      igAccountId: post.igAccountId,
      engagement: post.insight ?? null,
    };

    // Unscheduled drafts: DRAFT with no scheduledAt
    if (post.status === PostStatus.DRAFT && !post.scheduledAt) {
      unscheduledDrafts.push(calPost);
      continue;
    }

    // Place on calendar by date
    const dateKey = post.scheduledAt
      ? post.scheduledAt.toISOString().slice(0, 10)
      : post.publishedAt
        ? post.publishedAt.toISOString().slice(0, 10)
        : null;

    if (dateKey) {
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(calPost);
    }
  }

  return { byDate, unscheduledDrafts };
}

export async function reschedulePost(
  postId: string,
  workspaceId: string,
  scheduledAt: string,
  userId: string,
): Promise<{ id: string; scheduledAt: string; status: string }> {
  const post = await prisma.post.findFirst({
    where: { id: postId, workspaceId },
  });

  if (!post) {
    throw new NotFoundError('Post');
  }

  if (
    post.status !== PostStatus.DRAFT &&
    post.status !== PostStatus.SCHEDULED
  ) {
    throw new AppError(
      `Cannot reschedule a post with status ${post.status}. Only DRAFT and SCHEDULED posts can be rescheduled.`,
      400,
    );
  }

  const newDate = new Date(scheduledAt);
  const newStatus = newDate > new Date() ? PostStatus.SCHEDULED : PostStatus.DRAFT;

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      scheduledAt: newDate,
      status: newStatus,
    },
  });

  return {
    id: updated.id,
    scheduledAt: updated.scheduledAt!.toISOString(),
    status: updated.status,
  };
}
