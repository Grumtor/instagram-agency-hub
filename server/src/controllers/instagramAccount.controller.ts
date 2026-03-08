import { Request, Response, NextFunction } from 'express';
import * as instagramAccountService from '../services/instagramAccount.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError } from '../utils/errors';

export async function getAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const accounts = await instagramAccountService.getAccounts(req.params.workspaceId as string);
    successResponse(res, { accounts });
  } catch (error) {
    next(error);
  }
}

export async function getAccountById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const account = await instagramAccountService.getAccountById(
      req.params.accountId as string,
      req.params.workspaceId as string,
    );
    successResponse(res, account);
  } catch (error) {
    next(error);
  }
}

export async function disconnectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    await instagramAccountService.disconnectAccount(
      req.params.accountId as string,
      req.params.workspaceId as string,
      req.user.id,
    );
    successResponse(res, { disconnected: true });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    await instagramAccountService.refreshAccountToken(
      req.params.accountId as string,
      req.params.workspaceId as string,
      req.user.id,
    );
    successResponse(res, { refreshed: true });
  } catch (error) {
    next(error);
  }
}
