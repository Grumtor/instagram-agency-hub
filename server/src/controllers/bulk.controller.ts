import { Request, Response, NextFunction } from 'express';
import * as bulkService from '../services/bulk.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import type { BulkConfirmInput } from '../validators/bulk.validator';

export async function getCsvTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const csv = await bulkService.getCsvTemplate(req.params.workspaceId as string);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk-schedule-template.csv"');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

export async function uploadCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      throw new ValidationError('No CSV file uploaded');
    }

    // Read file from disk (multer disk storage)
    const fs = await import('fs/promises');
    let csvText: string;
    try {
      csvText = await fs.readFile(file.path, 'utf-8');
    } catch {
      throw new ValidationError('Failed to read uploaded file');
    }

    const result = await bulkService.processCsvUpload(
      req.params.workspaceId as string,
      req.user.id,
      csvText,
    );

    successResponse(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      throw new ValidationError('No media files uploaded');
    }

    const { accountId, startDate } = req.body as { accountId?: string; startDate?: string };

    if (!accountId) throw new ValidationError('accountId is required');
    if (!startDate) throw new ValidationError('startDate is required');

    const result = await bulkService.previewMediaBatch(
      req.params.workspaceId as string,
      files,
      accountId,
      startDate,
    );

    successResponse(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function confirmBulk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();

    const { posts } = req.body as BulkConfirmInput;

    const result = await bulkService.confirmBulkPosts(
      req.params.workspaceId as string,
      req.user.id,
      posts,
    );

    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
}
