import { Request, Response } from 'express';
import { eventService } from '../services/event.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { CONSTANTS } from '../config/constants.js';

export const listEvents = asyncHandler(async (_req: Request, res: Response) => {
  const events = await eventService.getAllEvents();
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ data: events });
});

export const getEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.id);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ data: event });
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  const event = await eventService.createEventFromProfile(req.body, user.id);
  res.status(CONSTANTS.HTTP_STATUS.CREATED).json({ data: event });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  const updated = await eventService.updateProfile(req.params.id, req.body, user);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ data: updated });
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await eventService.addMember(req.params.id, req.body);
  res.status(CONSTANTS.HTTP_STATUS.CREATED).json({ data: member });
});

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  const comment = await eventService.addComment(req.params.id, req.body, user);
  res.status(CONSTANTS.HTTP_STATUS.CREATED).json({ data: comment });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  await eventService.markNotificationRead(req.params.id, req.params.nid);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ success: true });
});
