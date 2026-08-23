import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../controllers/budget.controller';

const router = Router();
router.use(authenticate);
router.get('/', getBudgets);
router.post('/', createBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;
