import { Router } from 'express';
import { getTimeline, updateTaskStatus, addTask } from '../controllers/timeline.controller.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { TimelineTaskSchema } from '../../shared/schemas/zod-schemas.js';
import { TaskUpdateSchema, TaskIdParamSchema, EventIdParamSchema } from '../validation/request-schemas.js';
import { requireEventAccess, requireEventRole } from '../middleware/demo-user.js';

const router = Router();

router.get('/:id/timeline', validateParams(EventIdParamSchema), requireEventAccess(), getTimeline);
router.patch(
  '/:id/timeline/tasks/:taskId/status',
  validateParams(TaskIdParamSchema),
  requireEventRole('owner', 'editor'),
  validateBody(TaskUpdateSchema),
  updateTaskStatus
);
router.post(
  '/:id/timeline/tasks',
  validateParams(EventIdParamSchema),
  requireEventRole('owner', 'editor'),
  validateBody(TimelineTaskSchema.omit({ id: true })),
  addTask
);

export default router;
