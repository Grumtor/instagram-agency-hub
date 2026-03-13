import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/report.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError } from '../utils/errors';
import type { GenerateReportInput } from '../validators/report.validator';

export async function generateReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const workspaceId = req.params.workspaceId as string;
    const body = req.body as GenerateReportInput;

    const report = await reportService.generateReport(
      workspaceId,
      body.accountIds,
      body.title,
      new Date(body.startDate),
      new Date(body.endDate),
      req.user.id,
    );

    successResponse(res, report, 201);
  } catch (error) {
    next(error);
  }
}

export async function getReports(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const reports = await reportService.getReports(workspaceId);
    successResponse(res, reports);
  } catch (error) {
    next(error);
  }
}

export async function getReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const reportId = req.params.reportId as string;
    const report = await reportService.getReport(reportId, workspaceId);
    successResponse(res, report);
  } catch (error) {
    next(error);
  }
}

export async function shareReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const reportId = req.params.reportId as string;
    const result = await reportService.shareReport(reportId, workspaceId);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function exportReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const reportId = req.params.reportId as string;
    const report = await reportService.getReport(reportId, workspaceId);

    const html = reportService.exportReportAsHtml(report);

    const filename = `report-${report.id}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
}

export async function getSharedReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shareToken = req.params.shareToken as string;
    const report = await reportService.getSharedReport(shareToken);
    successResponse(res, report);
  } catch (error) {
    next(error);
  }
}
