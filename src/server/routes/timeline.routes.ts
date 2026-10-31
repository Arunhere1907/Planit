import { Router } from 'express';
import { getTimeline, updateTaskStatus, addTask } from '../controllers/timeline.controller.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { TimelineTaskSchema } from '../../shared/schemas/zod-schemas.js';
import {
  TaskUpdateSchema,
  TaskIdParamSchema,
  EventIdParamSchema,
} from '../validation/request-schemas.js';
import { requireEventAccess, requireEventRole } from '../middleware/demo-user.js';

const router = Router();

router.get('/:id/timeline', validateParams(EventIdParamSchema), requireEventAccess(), getTimeline);

// Support both /timeline/tasks/:taskId/status and /timeline/task/:taskId (test convention)
router.patch(
  [
    '/:id/timeline/tasks/:taskId/status',
    '/:id/timeline/tasks/:taskId',
    '/:id/timeline/task/:taskId',
  ],
  validateParams(TaskIdParamSchema),
  requireEventRole('owner', 'editor'),
  validateBody(TaskUpdateSchema),
  updateTaskStatus
);

// Support both /timeline/tasks (API client) and /timeline/task (test convention)
router.post(
  ['/:id/timeline/tasks', '/:id/timeline/task'],
  validateParams(EventIdParamSchema),
  requireEventRole('owner', 'editor'),
  validateBody(TimelineTaskSchema.omit({ id: true })),
  addTask
);

export default router;
