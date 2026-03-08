import { Request, Response, NextFunction } from 'express';
import * as messageService from '../services/message.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import type { SendMessageInput } from '../validators/message.validator';

export async function getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const igAccountId = req.query.igAccountId as string;
    if (!igAccountId) {
      throw new ValidationError('igAccountId query parameter is required');
    }

    const conversations = await messageService.getConversations(
      req.params.workspaceId as string,
      igAccountId,
    );
    successResponse(res, conversations);
  } catch (error) {
    next(error);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const igAccountId = req.query.igAccountId as string;
    if (!igAccountId) {
      throw new ValidationError('igAccountId query parameter is required');
    }

    const messages = await messageService.getMessages(
      req.params.workspaceId as string,
      igAccountId,
      req.params.conversationId as string,
    );
    successResponse(res, messages);
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { igAccountId, recipientId, content } = req.body as SendMessageInput;

    const result = await messageService.sendMessage(
      req.params.workspaceId as string,
      igAccountId,
      recipientId,
      content,
      req.user.id,
    );
    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
}
