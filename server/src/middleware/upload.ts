import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { ValidationError } from '../utils/errors';

const uploadDir = path.resolve(config.upload.dir);
fs.mkdirSync(uploadDir, { recursive: true });

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'video/webm': '.webm',
    'video/x-matroska': '.mkv',
  };
  return map[mime] || '.bin';
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uuid = crypto.randomUUID();
    const rawExt = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
    const ext = rawExt || mimeToExt(file.mimetype);
    cb(null, `${uuid}${ext}`);
  },
});

const multerInstance = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new ValidationError('Only image and video files are allowed'));
    }
  },
  limits: {
    fileSize: config.upload.maxFileSizeMb * 1024 * 1024,
  },
});

export function handleUpload(fieldName: string, maxCount: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const middleware = multerInstance.array(fieldName, maxCount);
    middleware(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new ValidationError(
                `File too large. Maximum size is ${config.upload.maxFileSizeMb}MB`,
              ),
            );
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new ValidationError(`Too many files. Maximum is ${maxCount}`));
          }
          return next(new ValidationError(err.message));
        }
        return next(err);
      }
      next();
    });
  };
}

// CSV upload — accepts only text/csv and text/plain (browsers vary on MIME for .csv)
const csvMulterInstance = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel'];
    const extOk = file.originalname.toLowerCase().endsWith('.csv');
    if (allowed.includes(file.mimetype) || extOk) {
      cb(null, true);
    } else {
      cb(new ValidationError('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max for CSV
  },
});

export function handleCsvUpload(fieldName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const middleware = csvMulterInstance.single(fieldName);
    middleware(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError('CSV file too large. Maximum size is 5MB'));
          }
          return next(new ValidationError(err.message));
        }
        return next(err);
      }
      next();
    });
  };
}
