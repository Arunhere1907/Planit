import { Router } from 'express';
import { extractProfile } from '../controllers/intake.controller.js';
import { validateBody } from '../middleware/validate.js';
import { IntakeChatMessageSchema } from '../validation/request-schemas.js';
import { strictRateLimiter } from '../middleware/rate-limit.js';

const aiRateLimiter = strictRateLimiter();

const router = Router();

// Supports both POST /api/intake and POST /api/intake/extract
router.post('/', aiRateLimiter, validateBody(IntakeChatMessageSchema), extractProfile);
router.post('/extract', aiRateLimiter, validateBody(IntakeChatMessageSchema), extractProfile);

export default router;
