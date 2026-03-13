import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import type { CreateTemplateInput, UpdateTemplateInput, CreateHashtagSetInput } from '../validators/template.validator';

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getTemplates(workspaceId: string, search?: string) {
  const where = {
    workspaceId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { caption: { contains: search, mode: 'insensitive' as const } },
        { category: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const templates = await prisma.postTemplate.findMany({
    where,
    include: {
      createdBy: { select: { id: true, email: true, name: true } },
    },
    orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return templates;
}

export async function createTemplate(
  data: CreateTemplateInput & { workspaceId: string; createdById: string },
) {
  const template = await prisma.postTemplate.create({
    data: {
      workspaceId: data.workspaceId,
      name: data.name,
      caption: data.caption,
      hashtags: data.hashtags ?? null,
      category: data.category ?? null,
      createdById: data.createdById,
    },
    include: {
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  return template;
}

export async function updateTemplate(
  templateId: string,
  workspaceId: string,
  data: UpdateTemplateInput,
) {
  const existing = await prisma.postTemplate.findFirst({
    where: { id: templateId, workspaceId },
  });

  if (!existing) {
    throw new NotFoundError('Template');
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.caption !== undefined) updateData.caption = data.caption;
  if (data.hashtags !== undefined) updateData.hashtags = data.hashtags;
  if (data.category !== undefined) updateData.category = data.category;

  const template = await prisma.postTemplate.update({
    where: { id: templateId },
    data: updateData,
    include: {
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  return template;
}

export async function deleteTemplate(templateId: string, workspaceId: string) {
  const existing = await prisma.postTemplate.findFirst({
    where: { id: templateId, workspaceId },
  });

  if (!existing) {
    throw new NotFoundError('Template');
  }

  await prisma.postTemplate.delete({ where: { id: templateId } });
  return { deleted: true };
}

export async function markTemplateUsed(templateId: string, workspaceId: string) {
  const existing = await prisma.postTemplate.findFirst({
    where: { id: templateId, workspaceId },
  });

  if (!existing) {
    throw new NotFoundError('Template');
  }

  const template = await prisma.postTemplate.update({
    where: { id: templateId },
    data: { lastUsedAt: new Date() },
    include: {
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  return template;
}

// ─── Hashtag Sets ──────────────────────────────────────────────────────────────

export async function getHashtagSets(workspaceId: string) {
  const sets = await prisma.hashtagSet.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });

  return sets;
}

export async function createHashtagSet(
  data: CreateHashtagSetInput & { workspaceId: string },
) {
  const set = await prisma.hashtagSet.create({
    data: {
      workspaceId: data.workspaceId,
      name: data.name,
      hashtags: data.hashtags,
    },
  });

  return set;
}

export async function deleteHashtagSet(setId: string, workspaceId: string) {
  const existing = await prisma.hashtagSet.findFirst({
    where: { id: setId, workspaceId },
  });

  if (!existing) {
    throw new NotFoundError('Hashtag set');
  }

  await prisma.hashtagSet.delete({ where: { id: setId } });
  return { deleted: true };
}
