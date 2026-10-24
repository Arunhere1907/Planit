import { Router, Request, Response } from 'express';
import { aiService } from '../services/ai/ai.service.js';
import { placesService } from '../services/places/places.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { CONSTANTS } from '../config/constants.js';
import { EventProfile, VendorCategory } from '../../shared/types/index.js';

const router = Router();

// 1. Budget Generation
router.post('/budget/generate', asyncHandler(async (req: Request, res: Response) => {
  const profile: EventProfile = req.body.profile || req.body;
  const budget = aiService.generateDeterministicBudget(profile);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({
    categories: budget.categories.map((c) => ({
      id: c.category,
      name: c.category,
      amount: c.allocated,
      percent: (c.allocated / budget.totalBudget) * 100,
      reasoning: c.rationale,
      is_locked: c.isLocked,
      source: 'ai'
    })),
    strategic_notes: 'Allocated with exact integer sum matching event budget ceiling.'
  });
}));

// 2. Timeline Generation
router.post('/timeline/generate', asyncHandler(async (req: Request, res: Response) => {
  const profile: EventProfile = req.body.profile || req.body;
  const tasks = aiService.generateDeterministicTimeline(profile);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      due_date: t.dueDate,
      phase: t.category,
      status: t.status,
      priority: t.priority,
      notes: t.description
    })),
    run_of_show: [
      { id: 'ros_1', time: '04:00 PM', title: 'Vendor Arrival & Handover', owner: 'Event Lead', location: 'Main Gate' },
      { id: 'ros_2', time: '06:00 PM', title: 'Welcome Drinks & Guest Arrival', owner: 'Hospitality', location: 'Lobby' },
      { id: 'ros_3', time: '07:30 PM', title: 'Main Celebration Ceremony', owner: 'Host & Emcee', location: 'Stage' },
      { id: 'ros_4', time: '08:45 PM', title: 'Gourmet Dinner Service', owner: 'Catering Lead', location: 'Dining Hall' },
      { id: 'ros_5', time: '10:30 PM', title: 'Closing & Guest Farewell', owner: 'Host Family', location: 'Entrance' }
    ]
  });
}));

// 3. Vendor Search (both GET and POST for maximum compatibility)
const handleVendorSearch = asyncHandler(async (req: Request, res: Response) => {
  const category = (req.body?.category || req.query?.category) as VendorCategory | undefined;
  const city = (req.body?.city || req.query?.city) as string | undefined;
  const query = (req.body?.query || req.query?.query) as string | undefined;
  const vendors = await placesService.searchVendors({ category, city, query });
  
  // Return matching both formats
  res.status(CONSTANTS.HTTP_STATUS.OK).json({
    data: vendors,
    vendors: vendors.map(v => ({
      id: v.id,
      name: v.name,
      category: v.category,
      city: v.city,
      rating: v.rating,
      user_ratings_total: v.reviewCount,
      address: v.address,
      phone: v.phone,
      website: v.website,
      quote: v.priceTier === 'budget' ? 50000 : v.priceTier === 'luxury' ? 300000 : 150000,
      approx_cost: v.priceTier === 'budget' ? 50000 : v.priceTier === 'luxury' ? 300000 : 150000,
      status: 'shortlisted',
      reviews: [{ author: 'Satisfied Client', rating: 5, text: 'Fantastic service and punctual team.' }]
    }))
  });
});

router.post('/vendors/search', handleVendorSearch);
router.get('/vendors/search', handleVendorSearch);

// 4. Ideas Generation
router.post('/ideas/generate', asyncHandler(async (req: Request, res: Response) => {
  const profile: EventProfile = req.body.profile || req.body;
  const ideas = await aiService.suggestIdeas(profile);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({
    ideas: ideas.map(i => ({
      id: i.id,
      category: i.category,
      title: i.title,
      description: i.description,
      cost_range: `₹${(i.estimatedCost * 0.9).toFixed(0)} - ₹${(i.estimatedCost * 1.1).toFixed(0)}`,
      effort_level: i.diyFeasibility === 'high' ? 'Low' : 'Medium',
      tags: ['Creative', 'Personalized'],
      saved: i.status === 'accepted'
    }))
  });
}));

// 5. Invitations Generation
router.post('/invitations/generate', asyncHandler(async (req: Request, res: Response) => {
  const profile: EventProfile = req.body.profile || req.body;
  const invitations = await aiService.generateInvitations(profile);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({
    variants: invitations.map(inv => ({
      id: inv.id,
      type: `${inv.channel.toUpperCase()} Invitation`,
      tone: inv.tone,
      content: inv.content,
      share_url: `https://wa.me/?text=${encodeURIComponent(inv.content)}`
    }))
  });
}));

// 6. Risk Analysis
router.post('/risks/generate', asyncHandler(async (req: Request, res: Response) => {
  const profile: EventProfile = req.body.profile || req.body;
  const risks = await aiService.analyzeRisks(profile);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({
    risks: risks.map(r => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
      likelihood: r.probability === 'likely' ? 'high' : 'medium',
      category: r.category,
      why: r.preventiveMeasure,
      mitigation: r.preventiveMeasure,
      backup_plan: r.contingencyPlan
    }))
  });
}));

export default router;
