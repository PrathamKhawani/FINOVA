import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getTransactions } from '../controllers/transactions.controller';

const router = Router();

router.use(authenticate);
router.get('/', getTransactions);

export default router;
