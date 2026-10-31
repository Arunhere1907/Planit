import { Router } from 'express';
import {
  getIdeas,
  generateIdeas,
  getInvitations,
  generateInvitations,
  getRisks,
  analyzeRisks,
} from '../controllers/ai-features.controller.js';
import { requireEventAccess, requireEventRole } from '../middleware/demo-user.js';
import { strictRateLimiter } from '../middleware/rate-limit.js';
import { validateParams } from '../middleware/validate.js';
import { EventIdParamSchema } from '../validation/request-schemas.js';

const router = Router();

// Apply strict rate limiting to AI generation routes
router.get('/:id/ideas', validateParams(EventIdParamSchema), requireEventAccess(), getIdeas);
router.post(
  '/:id/ideas/generate',
  validateParams(EventIdParamSchema),
  strictRateLimiter(),
  requireEventRole('owner', 'editor'),
  generateIdeas
);

router.get(
  '/:id/invitations',
  validateParams(EventIdParamSchema),
  requireEventAccess(),
  getInvitations
);
router.post(
  '/:id/invitations/generate',
  validateParams(EventIdParamSchema),
  strictRateLimiter(),
  requireEventRole('owner', 'editor'),
  generateInvitations
);

router.get('/:id/risks', validateParams(EventIdParamSchema), requireEventAccess(), getRisks);
router.post(
  '/:id/risks/analyze',
  validateParams(EventIdParamSchema),
  strictRateLimiter(),
  requireEventRole('owner', 'editor'),
  analyzeRisks
);

export default router;
