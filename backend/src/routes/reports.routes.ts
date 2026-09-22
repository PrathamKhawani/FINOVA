import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getReportsSummary } from '../controllers/reports.controller';

const router = Router();
router.use(authenticate);

// GET /api/reports/summary?month=YYYY-MM&source=BANK|WALLET|ALL
router.get('/summary', getReportsSummary);

export default router;
