import { Request, Response } from 'express';
import { eventService } from '../services/event.service.js';
import { aiService } from '../services/ai/ai.service.js';
import { eventRepository } from '../repositories/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { CONSTANTS } from '../config/constants.js';

export const getIdeas = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.id);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ data: event.ideas });
});

export const generateIdeas = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.id);
  const ideas = await aiService.suggestIdeas(event.profile);
  event.ideas = ideas;
  await eventRepository.update(event.id, { ideas });
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ data: ideas });
});

export const getInvitations = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.id);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ data: event.invitations });
});

export const generateInvitations = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.id);
  const invitations = await aiService.generateInvitations(event.profile);
  event.invitations = invitations;
  await eventRepository.update(event.id, { invitations });
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ data: invitations });
});

export const getRisks = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.id);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ data: event.risks });
});

export const analyzeRisks = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.id);
  const risks = await aiService.analyzeRisks(event.profile);
  event.risks = risks;
  await eventRepository.update(event.id, { risks });
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ data: risks });
});
