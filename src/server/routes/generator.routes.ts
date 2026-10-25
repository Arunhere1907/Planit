import { Router, Request, Response } from 'express';
import { aiService } from '../services/ai/ai.service.js';
import { placesService } from '../services/places/places.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { CONSTANTS } from '../config/constants.js';
import { EventProfile, VendorCategory } from '../../shared/types/index.js';

const router = Router();

// 1. Budget Generation
router.post(
  '/budget/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const profile: EventProfile = req.body.profile || req.body;
    const result = await aiService.generateBudgetWithReasoning(profile);
    res.status(CONSTANTS.HTTP_STATUS.OK).json({
      categories: result.categories,
      strategic_notes: result.strategic_notes || 'Budget allocated with event-specific considerations.',
    });
  })
);

// 2. Timeline Generation
router.post(
  '/timeline/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const profile: EventProfile = req.body.profile || req.body;
    const timeline = await aiService.generateTimelineWithTasks(profile);
    res.status(CONSTANTS.HTTP_STATUS.OK).json({
      tasks: timeline.tasks,
      run_of_show: timeline.run_of_show,
    });
  })
);

// 3. Vendor Search (supports GET and POST)
const handleVendorSearch = asyncHandler(async (req: Request, res: Response) => {
  const category = (req.body?.category || req.query?.category) as VendorCategory | undefined;
  const city = (req.body?.city || req.query?.city) as string | undefined;
  const query = (req.body?.query || req.query?.query) as string | undefined;
  const maxResults = req.body?.maxResults || req.query?.maxResults;
  const limit = maxResults ? parseInt(String(maxResults), 10) : 10;

  const vendors = await placesService.searchVendors({ category, city, query, maxResults: limit });

  res.status(CONSTANTS.HTTP_STATUS.OK).json({
    data: vendors,
    vendors,
  });
});

router.post('/vendors/search', handleVendorSearch);
router.get('/vendors/search', handleVendorSearch);

// 4. Ideas Generation
router.post(
  '/ideas/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const profile: EventProfile = req.body.profile || req.body;
    const ideas = await aiService.suggestIdeas(profile);
    res.status(CONSTANTS.HTTP_STATUS.OK).json({
      ideas,
    });
  })
);

// 5. Invitations Generation
router.post(
  '/invitations/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const profile: EventProfile = req.body.profile || req.body;
    const invitations = await aiService.generateInvitations(profile);
    res.status(CONSTANTS.HTTP_STATUS.OK).json({
      variants: invitations,
      invitations,
    });
  })
);

// 6. Risk Analysis
router.post(
  '/risks/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const profile: EventProfile = req.body.profile || req.body;
    const risks = await aiService.analyzeRisks(profile);
    res.status(CONSTANTS.HTTP_STATUS.OK).json({
      risks,
    });
  })
);

// 7. Budget Optimizer (What-if Scenarios)
router.post(
  '/budget/optimize',
  asyncHandler(async (req: Request, res: Response) => {
    const profile: EventProfile = req.body.profile || req.body;
    const scenario: 'maintain_quality' | 'moderate_cuts' | 'aggressive_savings' = req.body.scenario || 'moderate_cuts';
    const targetBudget = req.body.targetBudget || profile.total_budget;
    
    const optimized = await aiService.optimizeBudget(profile, scenario, targetBudget);
    res.status(CONSTANTS.HTTP_STATUS.OK).json(optimized);
  })
);

// 8. Replan Timeline (When Event Date Changes)
router.post(
  '/timeline/replan',
  asyncHandler(async (req: Request, res: Response) => {
    const profile: EventProfile = req.body.profile || req.body;
    const newDate = req.body.newDate || profile.date;
    
    const timeline = await aiService.generateTimelineWithTasks({ ...profile, date: newDate });
    res.status(CONSTANTS.HTTP_STATUS.OK).json({
      tasks: timeline.tasks,
      run_of_show: timeline.run_of_show,
      message: `Timeline regenerated for new date: ${newDate}`,
    });
  })
);

export default router;
