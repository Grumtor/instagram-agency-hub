import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';

export type NotificationType = 'post_failed' | 'token_expiring' | 'engagement_spike' | 'system';

interface CreateNotificationData {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  type?: string;
}

/**
 * Creates a notification for a user, respecting their notification preferences.
 * post_failed notifications are always created regardless of preferences.
 */
export async function createNotification(data: CreateNotificationData): Promise<void> {
  // Check notification preferences (except post_failed which is always on)
  if (data.type !== 'post_failed' && data.type !== 'system') {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId_workspaceId: { userId: data.userId, workspaceId: data.workspaceId } },
    });

    if (prefs) {
      if (data.type === 'token_expiring' && !prefs.tokenExpiring) return;
      if (data.type === 'engagement_spike' && !prefs.engagementSpike) return;
    }
  }

  await prisma.notification.create({
    data: {
      workspaceId: data.workspaceId,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link ?? null,
      metadata: data.metadata !== undefined ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

/**
 * Creates a notification for all members of a workspace, respecting each
 * member's individual notification preferences.
 */
export async function createNotificationForWorkspace(
  data: Omit<CreateNotificationData, 'userId'>,
): Promise<void> {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: data.workspaceId },
    select: { userId: true },
  });

  await Promise.allSettled(
    members.map((m) => createNotification({ ...data, userId: m.userId })),
  );
}

export async function getNotifications(
  userId: string,
  workspaceId: string,
  opts: GetNotificationsOptions = {},
) {
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where = {
    userId,
    workspaceId,
    ...(opts.type ? { type: opts.type } : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications,
    total,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUnreadCount(userId: string, workspaceId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, workspaceId, read: false },
  });
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new NotFoundError('Notification');
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string, workspaceId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, workspaceId, read: false },
    data: { read: true },
  });
}

export async function getPreferences(userId: string, workspaceId: string) {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  // Return defaults if no preferences record yet
  return (
    prefs ?? {
      id: null,
      userId,
      workspaceId,
      postFailed: true,
      tokenExpiring: true,
      engagementSpike: true,
    }
  );
}

export async function updatePreferences(
  userId: string,
  workspaceId: string,
  data: { tokenExpiring?: boolean; engagementSpike?: boolean },
) {
  // postFailed is always true — cannot be disabled
  return prisma.notificationPreference.upsert({
    where: { userId_workspaceId: { userId, workspaceId } },
    create: {
      userId,
      workspaceId,
      postFailed: true,
      tokenExpiring: data.tokenExpiring ?? true,
      engagementSpike: data.engagementSpike ?? true,
    },
    update: {
      ...(data.tokenExpiring !== undefined && { tokenExpiring: data.tokenExpiring }),
      ...(data.engagementSpike !== undefined && { engagementSpike: data.engagementSpike }),
    },
  });
}
