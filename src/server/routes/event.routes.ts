import { Router } from 'express';
import {
  listEvents,
  getEvent,
  createEvent,
  updateProfile,
  addMember,
  addComment,
  markNotificationRead
} from '../controllers/event.controller.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { EventMemberSchema, EventCommentSchema } from '../../shared/schemas/zod-schemas.js';
import { EventIdParamSchema, EventProfileInputSchema } from '../validation/request-schemas.js';
import { requireRole, requireEventAccess, requireEventRole } from '../middleware/demo-user.js';

const router = Router();

router.get('/', listEvents);
router.post('/', requireRole('owner', 'editor'), validateBody(EventProfileInputSchema), createEvent);
router.get('/:id', validateParams(EventIdParamSchema), requireEventAccess(), getEvent);
router.patch('/:id/profile', validateParams(EventIdParamSchema), requireEventRole('owner', 'editor'), updateProfile);
router.post('/:id/members', validateParams(EventIdParamSchema), requireEventRole('owner'), validateBody(EventMemberSchema.omit({ id: true })), addMember);
router.post('/:id/comments', validateParams(EventIdParamSchema), requireEventAccess(), validateBody(EventCommentSchema.omit({ id: true, eventId: true, userId: true, userName: true, createdAt: true })), addComment);
router.patch('/:id/notifications/:nid/read', requireEventAccess(), markNotificationRead);

export default router;
