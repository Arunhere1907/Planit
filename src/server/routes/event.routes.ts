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
import { validateBody } from '../middleware/validate.js';
import { EventProfileSchema, EventMemberSchema, EventCommentSchema } from '../../shared/schemas/zod-schemas.js';
import { requireRole } from '../middleware/demo-user.js';

const router = Router();

router.get('/', listEvents);
router.post('/', requireRole('owner', 'editor'), validateBody(EventProfileSchema), createEvent);
router.get('/:id', getEvent);
router.patch('/:id/profile', requireRole('owner', 'editor'), updateProfile);
router.post('/:id/members', requireRole('owner'), validateBody(EventMemberSchema.omit({ id: true, joinedAt: true })), addMember);
router.post('/:id/comments', validateBody(EventCommentSchema.omit({ id: true, eventId: true, userId: true, userName: true, createdAt: true })), addComment);
router.patch('/:id/notifications/:nid/read', markNotificationRead);

export default router;
