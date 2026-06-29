import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// Rate limited signup and login endpoints
router.post('/signup', authLimiter, AuthController.signup);
router.post('/login', authLimiter, AuthController.login);

export default router;
