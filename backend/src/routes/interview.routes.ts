import { Router } from 'express';
import { InterviewController } from '../controllers/interview.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Protected interview endpoints
router.post('/start', authenticateToken, InterviewController.start);
router.post('/message', authenticateToken, InterviewController.message);
router.post('/end', authenticateToken, InterviewController.end);
router.post('/end/:id', authenticateToken, InterviewController.end);
router.get('/history', authenticateToken, InterviewController.getHistory);
router.get('/stats', authenticateToken, InterviewController.getStats);
router.get('/:id', authenticateToken, InterviewController.getSession);
router.get('/report/:id', authenticateToken, InterviewController.getReport);

export default router;
