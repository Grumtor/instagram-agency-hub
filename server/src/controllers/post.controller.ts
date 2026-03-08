import { Request, Response, NextFunction } from 'express';
import * as postService from '../services/post.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import { config } from '../config';
import { processPost } from '../workers/publishWorker';
import type { CreatePostInput, UpdatePostInput } from '../validators/post.validator';

export async function createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const data = req.body as CreatePostInput;
    const post = await postService.createPost({
      ...data,
      workspaceId: req.params.workspaceId as string,
      createdById: req.user.id,
    });
    successResponse(res, post, 201);
  } catch (error) {
    next(error);
  }
}

export async function getPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string | undefined;
    const igAccountId = req.query.igAccountId as string | undefined;

    const result = await postService.getPosts(req.params.workspaceId as string, {
      status,
      igAccountId,
      page,
      limit,
    });
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getPostById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const post = await postService.getPostById(req.params.postId as string, req.params.workspaceId as string);
    successResponse(res, post);
  } catch (error) {
    next(error);
  }
}

export async function updatePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const data = req.body as UpdatePostInput;
    const post = await postService.updatePost(
      req.params.postId as string,
      req.params.workspaceId as string,
      data,
      req.user.id,
    );
    successResponse(res, post);
  } catch (error) {
    next(error);
  }
}

export async function deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const result = await postService.deletePost(
      req.params.postId as string,
      req.params.workspaceId as string,
      req.user.id,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function publishNow(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const post = await postService.publishNow(
      req.params.postId as string,
      req.params.workspaceId as string,
      req.user.id,
    );
    processPost(req.params.postId as string).catch(() => {});
    successResponse(res, post);
  } catch (error) {
    next(error);
  }
}

export async function uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      throw new ValidationError('No files uploaded');
    }

    const urls = files.map((file) => `${config.upload.publicUrl}/${file.filename}`);
    successResponse(res, { urls }, 201);
  } catch (error) {
    next(error);
  }
}
