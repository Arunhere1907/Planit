import { Router } from 'express';
import { extractProfile } from '../controllers/intake.controller.js';
import { validateBody } from '../middleware/validate.js';
import { IntakeChatMessageSchema } from '../validation/request-schemas.js';

const router = Router();

// Supports both POST /api/intake and POST /api/intake/extract
router.post('/', validateBody(IntakeChatMessageSchema), extractProfile);
router.post('/extract', validateBody(IntakeChatMessageSchema), extractProfile);

export default router;
