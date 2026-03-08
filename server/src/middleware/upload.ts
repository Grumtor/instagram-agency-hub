import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { ValidationError } from '../utils/errors';

const uploadDir = path.resolve(config.upload.dir);
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uuid = crypto.randomUUID();
    cb(null, `${uuid}-${file.originalname}`);
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
