import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getTransactions, getCategories } from '../controllers/transactions.controller';
import { reviewTransaction, previewReviewMatch } from '../controllers/review.controller';

const router = Router();

router.use(authenticate);
router.get('/categories', getCategories);
router.get('/', getTransactions);
// Review / category correction
router.patch('/:id/review', reviewTransaction);
router.get('/:id/review/preview', previewReviewMatch);

export default router;
