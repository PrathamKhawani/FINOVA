import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getRules, createRule, updateRule, deleteRule, previewRule, applyRuleToExisting } from '../controllers/rules.controller';

const router = Router();

router.use(authenticate);

router.get('/', getRules);
router.post('/', createRule);
router.put('/:id', updateRule);
router.delete('/:id', deleteRule);
router.get('/:id/preview', previewRule);
router.post('/:id/apply-existing', applyRuleToExisting);

export default router;
