import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer storage
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const filetypes = /pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only .pdf, .doc and .docx files are allowed!'));
  }
});

// Protected profile endpoints
router.get('/', authenticateToken, ProfileController.getProfile);
router.put('/', authenticateToken, upload.single('resume'), ProfileController.updateProfile);
router.post('/', authenticateToken, upload.single('resume'), ProfileController.updateProfile);

export default router;
