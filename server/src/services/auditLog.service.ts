import { prisma } from '../config/database';
import { AuditAction } from '../types/enums';

export async function createAuditLog(
  workspaceId: string,
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  return prisma.auditLog.create({
    data: {
      workspaceId,
      userId,
      action,
      entityType,
      entityId: entityId ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

interface AuditLogFilters {
  action?: string;
  entityType?: string;
  userId?: string;
}

interface Pagination {
  page?: number;
  limit?: number;
}

export async function getAuditLogs(
  workspaceId: string,
  filters: AuditLogFilters = {},
  pagination: Pagination = {},
) {
  const { action, entityType, userId } = filters;
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 50;
  const skip = (page - 1) * limit;

  const where = {
    workspaceId,
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(userId && { userId }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
