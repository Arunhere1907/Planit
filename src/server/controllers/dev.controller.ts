import type { Request, Response } from 'express';
import { resetDatabaseToSeed } from '../repositories/seed-loader.js';
import { inProcessScheduler } from '../services/notifications/scheduler.js';
import { asyncHandler } from '../utils/async-handler.js';
import { CONSTANTS } from '../config/constants.js';

export const resetDatabase = asyncHandler(async (_req: Request, res: Response) => {
  await resetDatabaseToSeed();
  res.status(CONSTANTS.HTTP_STATUS.OK).json({
    success: true,
    message: 'In-memory database has been successfully reset to initial seed data'
  });
});

export const triggerScheduler = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.query.eventId ? String(req.query.eventId) : undefined;
  const result = await inProcessScheduler.runDueChecks(eventId);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({
    success: true,
    notificationsCreated: result.notificationsCreated
  });
});
