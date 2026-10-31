import type { Request, Response } from 'express';
import { timelineService } from '../services/timeline.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { CONSTANTS } from '../config/constants.js';

export const getTimeline = asyncHandler(async (req: Request, res: Response) => {
  const timeline = await timelineService.getTimeline(req.params.id);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ tasks: timeline });
});

export const updateTaskStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  const status = req.body.status;
  await timelineService.updateTaskStatus(
    req.params.id,
    req.params.taskId,
    status,
    user
  );
  // Return updated task list for convenience
  const allTasks = await timelineService.getTimeline(req.params.id);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ tasks: allTasks });
});

export const addTask = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  await timelineService.addTask(req.params.id, req.body, user);
  const allTasks = await timelineService.getTimeline(req.params.id);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ tasks: allTasks });
});
