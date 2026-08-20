import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getDashboardSummary } from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);
router.get('/summary', getDashboardSummary);

export default router;
