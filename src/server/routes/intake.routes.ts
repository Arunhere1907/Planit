import { Router } from 'express';
import { extractProfile } from '../controllers/intake.controller.js';

const router = Router();

// Supports both POST /api/intake and POST /api/intake/extract
router.post('/', extractProfile);
router.post('/extract', extractProfile);

export default router;
