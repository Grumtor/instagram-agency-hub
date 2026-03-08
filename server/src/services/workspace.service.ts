import { prisma } from '../config/database';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { MemberRole, AuditAction } from '../types/enums';
import { createAuditLog } from './auditLog.service';

export async function createWorkspace(name: string, userId: string) {
  const workspace = await prisma.workspace.create({
    data: {
      name,
      members: {
        create: {
          userId,
          role: MemberRole.OWNER,
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  await createAuditLog(
    workspace.id,
    userId,
    AuditAction.WORKSPACE_CREATED,
    'Workspace',
    workspace.id,
  );

  return workspace;
}

export async function getWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          members: {
            include: { user: { select: { id: true, email: true, name: true } } },
          },
          _count: {
            select: { instagramAccounts: true, posts: true },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));
}

export async function getWorkspaceById(id: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
      _count: {
        select: { instagramAccounts: true, posts: true, messages: true },
      },
    },
  });

  if (!workspace) {
    throw new NotFoundError('Workspace');
  }

  return workspace;
}

export async function updateWorkspace(id: string, data: { name?: string }, userId: string) {
  const workspace = await prisma.workspace.update({
    where: { id },
    data,
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  await createAuditLog(
    workspace.id,
    userId,
    AuditAction.WORKSPACE_UPDATED,
    'Workspace',
    workspace.id,
    data,
  );

  return workspace;
}

export async function deleteWorkspace(id: string, userId: string) {
  await createAuditLog(
    id,
    userId,
    AuditAction.WORKSPACE_DELETED,
    'Workspace',
    id,
  );

  await prisma.workspace.delete({ where: { id } });
  return { deleted: true };
}

export async function addMember(workspaceId: string, email: string, role: string, invitedByUserId: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new NotFoundError('User with this email');
  }

  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
  });

  if (existingMember) {
    throw new ValidationError('This user is already a member of the workspace');
  }

  if (role === MemberRole.OWNER) {
    throw new ForbiddenError('Cannot assign OWNER role directly');
  }

  const member = await prisma.workspaceMember.create({
    data: {
      userId: user.id,
      workspaceId,
      role,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  await createAuditLog(
    workspaceId,
    invitedByUserId,
    AuditAction.MEMBER_ADDED,
    'WorkspaceMember',
    member.id,
    { email, role },
  );

  return member;
}

export async function removeMember(workspaceId: string, memberId: string, removedByUserId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!member || member.workspaceId !== workspaceId) {
    throw new NotFoundError('Workspace member');
  }

  if (member.role === MemberRole.OWNER) {
    throw new ForbiddenError('Cannot remove the workspace owner');
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } });

  await createAuditLog(
    workspaceId,
    removedByUserId,
    AuditAction.MEMBER_REMOVED,
    'WorkspaceMember',
    memberId,
    { email: member.user.email },
  );

  return { deleted: true };
}

export async function getMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}
