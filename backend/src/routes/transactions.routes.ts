import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getTransactions, getCategories } from '../controllers/transactions.controller';

const router = Router();

router.use(authenticate);
router.get('/categories', getCategories);
router.get('/', getTransactions);

export default router;
