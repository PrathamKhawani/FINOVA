import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  upload,
  uploadStatement,
  getStatements,
  getStatementById,
  deleteStatement,
} from '../controllers/statements.controller';

const router = Router();

router.use(authenticate);

router.post('/upload', upload.single('statement'), uploadStatement);
router.get('/', getStatements);
router.get('/:id', getStatementById);
router.delete('/:id', deleteStatement);

export default router;
