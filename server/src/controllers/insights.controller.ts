import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse } from '../utils/apiResponse';
import { NotFoundError } from '../utils/errors';
import * as insightsService from '../services/insights.service';

export async function getAccountInsights(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const accountId = req.params.accountId as string;

    const account = await prisma.instagramAccount.findFirst({
      where: { id: accountId, workspaceId },
    });
    if (!account) {
      throw new NotFoundError('Account');
    }

    const summary = await insightsService.getLatestAccountSummary(accountId);
    successResponse(res, summary ?? null);
  } catch (error) {
    next(error);
  }
}

export async function refreshAccountInsights(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const accountId = req.params.accountId as string;
    const force = req.body?.force === true || req.query?.force === 'true';

    const account = await prisma.instagramAccount.findFirst({
      where: { id: accountId, workspaceId },
    });
    if (!account) {
      throw new NotFoundError('Account');
    }

    // Pass the pre-fetched account to the service to avoid a second DB lookup
    await insightsService.refreshAccountInsights(accountId, force, account);
    successResponse(res, { refreshed: true });
  } catch (error) {
    next(error);
  }
}

export async function getPostInsights(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const postId = req.params.postId as string;

    const post = await prisma.post.findFirst({
      where: { id: postId, workspaceId },
    });
    if (!post) {
      throw new NotFoundError('Post');
    }

    const insight = await prisma.postInsight.findUnique({
      where: { postId },
    });
    successResponse(res, insight ?? null);
  } catch (error) {
    next(error);
  }
}

export async function refreshPostInsights(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const postId = req.params.postId as string;

    const post = await prisma.post.findFirst({
      where: { id: postId, workspaceId },
      include: { igAccount: true },
    });
    if (!post) {
      throw new NotFoundError('Post');
    }

    // Pass the pre-fetched post (with igAccount) to the service to avoid a second DB lookup
    await insightsService.refreshPostInsights(postId, post);
    successResponse(res, { refreshed: true });
  } catch (error) {
    next(error);
  }
}
