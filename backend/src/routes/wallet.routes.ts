import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload, uploadWalletStatement } from '../controllers/statements.controller';

const router = Router();

router.use(authenticate);
router.post('/upload', upload.single('statement'), uploadWalletStatement);

export default router;
