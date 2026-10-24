import { Router } from 'express';
import { resetDatabase, triggerScheduler } from '../controllers/dev.controller.js';

const router = Router();

router.post('/reset', resetDatabase);
router.post('/trigger-scheduler', triggerScheduler);

export default router;
