import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getLoans, createLoan, updateLoan, deleteLoan } from '../controllers/loans.controller';

const router = Router();
router.use(authenticate);
router.get('/', getLoans);
router.post('/', createLoan);
router.put('/:id', updateLoan);
router.delete('/:id', deleteLoan);

export default router;
