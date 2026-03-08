import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors';

export function requireWorkspaceAccess(roles?: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError());
      }

      const workspaceId = req.params.workspaceId as string;
      if (!workspaceId) {
        return next(new NotFoundError('Workspace ID'));
      }

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        return next(new NotFoundError('Workspace'));
      }

      const member = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId,
          },
        },
      });

      if (!member) {
        return next(new ForbiddenError('You are not a member of this workspace'));
      }

      if (roles && roles.length > 0 && !roles.includes(member.role)) {
        return next(new ForbiddenError(`Requires one of these roles: ${roles.join(', ')}`));
      }

      req.workspace = { id: workspace.id, name: workspace.name };
      req.workspaceMember = { id: member.id, role: member.role };

      next();
    } catch (error) {
      next(error);
    }
  };
}
