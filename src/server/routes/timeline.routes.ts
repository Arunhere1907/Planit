import { Router } from 'express';
import { getTimeline, updateTaskStatus, addTask } from '../controllers/timeline.controller.js';
import { validateBody } from '../middleware/validate.js';
import { TimelineTaskSchema } from '../../shared/schemas/zod-schemas.js';
import { requireRole } from '../middleware/demo-user.js';
import { z } from 'zod';

const router = Router();

const UpdateTaskStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue'])
});

router.get('/:id/timeline', getTimeline);
router.patch(
  '/:id/timeline/tasks/:taskId/status',
  requireRole('owner', 'editor'),
  validateBody(UpdateTaskStatusSchema),
  updateTaskStatus
);
router.post(
  '/:id/timeline/tasks',
  requireRole('owner', 'editor'),
  validateBody(TimelineTaskSchema.omit({ id: true })),
  addTask
);

export default router;
