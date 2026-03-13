import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError } from '../utils/errors';
import type { RegisterInput, LoginInput, RefreshInput, ChangePasswordInput } from '../validators/auth.validator';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name } = req.body as RegisterInput;
    const result = await authService.register(email, password, name);
    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as LoginInput;
    const result = await authService.login(email, password);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshInput;
    const result = await authService.verifyRefreshToken(refreshToken);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    successResponse(res, { user: req.user });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { refreshToken } = req.body as { refreshToken?: string };
    await authService.logout(req.user.id, refreshToken);
    successResponse(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { currentPassword, newPassword } = req.body as ChangePasswordInput;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
