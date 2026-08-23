import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getSavingsGoals, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from '../controllers/savings.controller';

const router = Router();
router.use(authenticate);
router.get('/goals', getSavingsGoals);
router.post('/goals', createSavingsGoal);
router.put('/goals/:id', updateSavingsGoal);
router.delete('/goals/:id', deleteSavingsGoal);

export default router;
