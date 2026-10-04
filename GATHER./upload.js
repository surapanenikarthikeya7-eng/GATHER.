import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileTypeFromFile } from 'file-type';
import { HttpError } from '../utils/http.js';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const extension = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[file.mimetype];
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const multerUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowed.has(file.mimetype)) return callback(new HttpError(400, 'Upload a JPG, PNG, or WEBP image.'));
    callback(null, true);
  }
}).single('image');

export function uploadImage(req, res, next) {
  multerUpload(req, res, async (error) => {
    if (error) return next(error);
    if (!req.file) return next();
    try {
      const detected = await fileTypeFromFile(req.file.path);
      const expected = {
        'image/jpeg': 'image/jpeg',
        'image/png': 'image/png',
        'image/webp': 'image/webp'
      }[req.file.mimetype];
      if (!detected || detected.mime !== expected) {
        await fs.promises.unlink(req.file.path);
        return next(new HttpError(400, 'The uploaded file is not a valid JPG, PNG, or WEBP image.'));
      }
      return next();
    } catch (verificationError) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return next(verificationError);
    }
  });
}
