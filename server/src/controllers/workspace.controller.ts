import { Request, Response, NextFunction } from 'express';
import * as workspaceService from '../services/workspace.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError } from '../utils/errors';
import type { CreateWorkspaceInput, UpdateWorkspaceInput, AddMemberInput } from '../validators/workspace.validator';

export async function createWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { name } = req.body as CreateWorkspaceInput;
    const workspace = await workspaceService.createWorkspace(name, req.user.id);
    successResponse(res, workspace, 201);
  } catch (error) {
    next(error);
  }
}

export async function getWorkspaces(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const workspaces = await workspaceService.getWorkspaces(req.user.id);
    successResponse(res, { workspaces });
  } catch (error) {
    next(error);
  }
}

export async function getWorkspaceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspace = await workspaceService.getWorkspaceById(req.params.workspaceId as string);
    successResponse(res, workspace);
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const data = req.body as UpdateWorkspaceInput;
    const workspace = await workspaceService.updateWorkspace(req.params.workspaceId as string, data, req.user.id);
    successResponse(res, workspace);
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const result = await workspaceService.deleteWorkspace(req.params.workspaceId as string, req.user.id);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { email, role } = req.body as AddMemberInput;
    const member = await workspaceService.addMember(req.params.workspaceId as string, email, role, req.user.id);
    successResponse(res, member, 201);
  } catch (error) {
    next(error);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const result = await workspaceService.removeMember(req.params.workspaceId as string, req.params.memberId as string, req.user.id);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const members = await workspaceService.getMembers(req.params.workspaceId as string);
    successResponse(res, { members });
  } catch (error) {
    next(error);
  }
}
