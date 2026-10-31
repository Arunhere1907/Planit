import type { Request, Response } from 'express';
import { eventService } from '../services/event.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { CONSTANTS } from '../config/constants.js';

export const listEvents = asyncHandler(async (_req: Request, res: Response) => {
  const events = await eventService.getAllEvents();
  res.status(CONSTANTS.HTTP_STATUS.OK).json(events);
});

export const getEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.id);
  const response = {
    id: event.profile.id,
    profile: event.profile,
    budget: event.budget,
    timeline: event.timeline,
    vendors: event.vendors,
    ideas: event.ideas,
    invitations: event.invitations,
    risks: event.risks,
    collaborators: event.collaborators,
    activity_log: event.activity_log,
    notifications: event.notifications,
    comments: event.comments,
  };
  res.status(CONSTANTS.HTTP_STATUS.OK).json(response);
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  const event = await eventService.createEventFromProfile(req.body, user.id);
  const response = {
    id: event.profile.id,
    profile: event.profile,
    budget: event.budget,
    timeline: event.timeline,
    vendors: event.vendors,
    ideas: event.ideas,
    invitations: event.invitations,
    risks: event.risks,
    collaborators: event.collaborators,
    activity_log: event.activity_log,
    notifications: event.notifications,
    comments: event.comments,
  };
  res.status(CONSTANTS.HTTP_STATUS.CREATED).json(response);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  const updated = await eventService.updateProfile(req.params.id, req.body, user);
  res.status(CONSTANTS.HTTP_STATUS.OK).json(updated);
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await eventService.addMember(req.params.id, req.body);
  res.status(CONSTANTS.HTTP_STATUS.CREATED).json(member);
});

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  const comment = await eventService.addComment(req.params.id, req.body, user);
  res.status(CONSTANTS.HTTP_STATUS.CREATED).json(comment);
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  await eventService.markNotificationRead(req.params.id, req.params.nid);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ success: true });
});
