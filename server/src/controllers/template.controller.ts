import { Request, Response, NextFunction } from 'express';
import * as templateService from '../services/template.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError } from '../utils/errors';
import type { CreateTemplateInput, UpdateTemplateInput, CreateHashtagSetInput } from '../validators/template.validator';

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const search = req.query.search as string | undefined;
    const templates = await templateService.getTemplates(workspaceId, search);
    successResponse(res, templates);
  } catch (error) {
    next(error);
  }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const workspaceId = req.params.workspaceId as string;
    const data = req.body as CreateTemplateInput;
    const template = await templateService.createTemplate({
      ...data,
      workspaceId,
      createdById: req.user.id,
    });
    successResponse(res, template, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const templateId = req.params.templateId as string;
    const data = req.body as UpdateTemplateInput;
    const template = await templateService.updateTemplate(templateId, workspaceId, data);
    successResponse(res, template);
  } catch (error) {
    next(error);
  }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const templateId = req.params.templateId as string;
    const result = await templateService.deleteTemplate(templateId, workspaceId);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function useTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const templateId = req.params.templateId as string;
    const template = await templateService.markTemplateUsed(templateId, workspaceId);
    successResponse(res, template);
  } catch (error) {
    next(error);
  }
}

// ─── Hashtag Sets ──────────────────────────────────────────────────────────────

export async function getHashtagSets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const sets = await templateService.getHashtagSets(workspaceId);
    successResponse(res, sets);
  } catch (error) {
    next(error);
  }
}

export async function createHashtagSet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const data = req.body as CreateHashtagSetInput;
    const set = await templateService.createHashtagSet({ ...data, workspaceId });
    successResponse(res, set, 201);
  } catch (error) {
    next(error);
  }
}

export async function deleteHashtagSet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const setId = req.params.setId as string;
    const result = await templateService.deleteHashtagSet(setId, workspaceId);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
