import { Request, Response } from 'express';
import { aiService } from '../services/ai/ai.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { CONSTANTS } from '../config/constants.js';

export const extractProfile = asyncHandler(async (req: Request, res: Response) => {
  // Support either body.input or body.latestMessage or raw text
  const input = req.body.input || req.body.latestMessage || (typeof req.body === 'string' ? req.body : '');
  const result = await aiService.extractEventProfile(String(input));

  // Shape response accommodating both data wrapper and direct fields
  res.status(CONSTANTS.HTTP_STATUS.OK).json({
    data: result,
    profile: result.profile,
    follow_up_questions: result.followUpQuestions,
    ai_summary: `Understood: ${result.profile.title} in ${result.profile.city} with ${result.profile.guestCount} guests.`
  });
});
