import { Router } from 'express';
import {
  getIdeas,
  generateIdeas,
  getInvitations,
  generateInvitations,
  getRisks,
  analyzeRisks
} from '../controllers/ai-features.controller.js';
import { requireRole } from '../middleware/demo-user.js';

const router = Router();

router.get('/:id/ideas', getIdeas);
router.post('/:id/ideas/generate', requireRole('owner', 'editor'), generateIdeas);

router.get('/:id/invitations', getInvitations);
router.post('/:id/invitations/generate', requireRole('owner', 'editor'), generateInvitations);

router.get('/:id/risks', getRisks);
router.post('/:id/risks/analyze', requireRole('owner', 'editor'), analyzeRisks);

export default router;
