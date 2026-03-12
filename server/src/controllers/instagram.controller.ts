import { Request, Response, NextFunction } from 'express';
import * as instagramOAuthService from '../services/instagramOAuth.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError, ValidationError, ForbiddenError } from '../utils/errors';
import { config } from '../config';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export async function getAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();

    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) {
      throw new ValidationError('workspaceId query parameter is required');
    }

    // Verify user is a member of the workspace (AC-9)
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId } },
    });
    if (!member) {
      throw new ForbiddenError('You are not a member of this workspace');
    }

    const url = instagramOAuthService.generateAuthUrl(workspaceId, req.user.id);
    successResponse(res, { url });
  } catch (error) {
    next(error);
  }
}

export async function handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const errorParam = req.query.error as string;

    if (errorParam) {
      const errorDesc = req.query.error_description as string;
      logger.warn({ error: errorParam, errorDesc }, 'Instagram OAuth denied by user');
      res.redirect(`${config.clientUrl}/accounts?error=${encodeURIComponent(errorDesc || errorParam)}`);
      return;
    }

    if (!code || !state) {
      throw new ValidationError('Missing code or state parameter');
    }

    await instagramOAuthService.handleCallback(code, state);
    res.redirect(`${config.clientUrl}/accounts?connected=true`);
  } catch (error) {
    logger.error({ error }, 'Instagram OAuth callback failed');
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.redirect(`${config.clientUrl}/accounts?error=${encodeURIComponent(message)}`);
  }
}
