import { llmClient } from './llm.client.js';
import {
  INTAKE_EXTRACTION_SYSTEM_PROMPT,
  IDEA_GENERATION_SYSTEM_PROMPT,
  INVITATION_GENERATION_SYSTEM_PROMPT,
  RISK_ANALYSIS_SYSTEM_PROMPT,
  BUDGET_REASONING_SYSTEM_PROMPT,
  TIMELINE_GENERATION_SYSTEM_PROMPT,
  BUDGET_OPTIMIZER_SYSTEM_PROMPT,
} from './prompts/event-prompts.js';
import type {
  EventProfile,
  EventType,
  FullEventPlan,
  Task,
  RunOfShowItem,
  IdeaItem,
  InvitationItem,
  RiskItem,
  BudgetCategory,
} from '../../../shared/types/index.js';
import {
  calculateBudgetSplitFromPercents,
  calculateBackwardsDueDates,
  DEFAULT_BUDGET_SPLITS,
} from '../../../shared/utils/deterministic-math.js';
import { logger } from '../../utils/logger.js';
import {
  sanitizeDataForPrompt,
  validateProfileBeforeLLM,
  validateLLMOutput,
} from './prompt-security.js';
import { fallbackDataService } from './fallback-data.service.js';
import { aiResponseValidator } from './ai-response-validator.js';

export class AIService {
  /**
   * Conversational intake parser: turns raw conversational text into structured EventProfile
   */
  public async extractEventProfile(userInput: string): Promise<{
    profile: EventProfile;
    followUpQuestions: string[];
    confidence: number;
  }> {
    if (llmClient.isAvailable()) {
      try {
        const rawJson = await llmClient.generateContent(
          INTAKE_EXTRACTION_SYSTEM_PROMPT,
          userInput
        );
        
        // Validate LLM output against expected structure
        const validated = validateLLMOutput(rawJson, (parsed: unknown) => {
          if (typeof parsed !== 'object' || parsed === null) {
            return null;
          }
          
          const obj = parsed as Record<string, unknown>;
          
          // Validate required fields exist
          const profile = obj.profile || obj;
          if (typeof profile !== 'object' || profile === null) {
            return null;
          }
          
          return parsed;
        });
        
        if (validated) {
          const parsed = validated as Record<string, unknown>;
          
          // Additional validation: check for injection attempts in profile
          const profileObj = (parsed.profile || parsed) as Record<string, unknown>;
          const securityCheck = validateProfileBeforeLLM(profileObj);
          
          if (!securityCheck.safe) {
            logger.warn('LLM output contained suspicious patterns, using fallback', {
              warnings: securityCheck.warnings,
            });
            return fallbackDataService.extractProfileFromText(userInput);
          }
          
          return {
            profile: this.sanitizeExtractedProfile((parsed.profile || parsed) as Record<string, unknown>),
            followUpQuestions: Array.isArray(parsed.follow_up_questions)
              ? parsed.follow_up_questions
              : Array.isArray(parsed.followUpQuestions)
              ? parsed.followUpQuestions
              : [],
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
          };
        } else {
          logger.warn('LLM output failed validation, using fallback');
        }
      } catch (err: unknown) {
        logger.warn('LLM extraction failed or timed out, using deterministic fallback parser', { err });
      }
    }

    return fallbackDataService.extractProfileFromText(userInput);
  }

  /**
   * Sanitizes extracted profile data
   */
  private sanitizeExtractedProfile(raw: Record<string, unknown>): EventProfile {
    return {
      id: String(raw.id || `event-${Date.now()}`),
      title: String(raw.title || 'Celebration Event'),
      type: (raw.type as EventType) || 'wedding',
      date: String(raw.date || raw.targetDate || '2026-12-18'),
      city: String(raw.city || 'Ahmedabad'),
      guest_count: Math.max(10, Number(raw.guest_count || raw.guestCount) || 150),
      total_budget: Math.max(50000, Number(raw.total_budget || raw.totalBudget) || 500000),
      currency: String(raw.currency || 'INR'),
      vibe_theme: String(raw.vibe_theme || raw.vibe || 'Festive and Welcoming'),
      culture_tradition: String(raw.culture_tradition || raw.culturalTradition || 'Contemporary'),
      dietary_mix: String(raw.dietary_mix || raw.dietaryMix || 'Standard Vegetarian Feast'),
      indoor_outdoor: (raw.indoor_outdoor as 'indoor' | 'outdoor' | 'hybrid') || 'outdoor',
      priorities: Array.isArray(raw.priorities) ? raw.priorities.map(String) : ['Food', 'Decor', 'Experience'],
      constraints: String(raw.constraints || ''),
    };
  }

  /**
   * Generates budget breakdown using LLM for reasoning, code for math
   */
  public async generateBudgetWithReasoning(profile: EventProfile): Promise<{ categories: BudgetCategory[]; strategic_notes?: string }> {
    if (llmClient.isAvailable()) {
      try {
        // Sanitize profile data before sending to LLM
        const sanitizedProfile = sanitizeDataForPrompt({
          type: profile.type,
          city: profile.city,
          guest_count: profile.guest_count,
          total_budget: profile.total_budget,
          currency: profile.currency,
          vibe_theme: profile.vibe_theme,
          priorities: profile.priorities,
        });
        
        const raw = await llmClient.generateContent(
          BUDGET_REASONING_SYSTEM_PROMPT,
          JSON.stringify(sanitizedProfile)
        );
        
        // Parse and validate response
        const parseResult = aiResponseValidator.safeParseJSON(raw);
        if (!parseResult.success) {
          logger.warn('Budget response JSON parse failed', { error: parseResult.error });
          throw new Error('Invalid JSON response');
        }
        
        const validation = aiResponseValidator.validateBudgetCategories(parseResult.data);
        if (!validation.isValid) {
          logger.warn('Budget response validation failed', { errors: validation.errors });
          throw new Error('Invalid budget structure');
        }
        
        // Use validated data
        const validatedData = validation.data!;
        const categories = calculateBudgetSplitFromPercents(
          profile.total_budget,
          validatedData.categories
        );
        
        return {
          categories,
          strategic_notes: validatedData.strategic_notes || `Budget allocated using AI-powered analysis for ${profile.type} event in ${profile.city}.`,
        };
      } catch (err: unknown) {
        logger.warn('LLM budget reasoning failed, using deterministic fallback', { err });
      }
    }

    // Fallback: use event-type templates with math
    const splits = DEFAULT_BUDGET_SPLITS[profile.type] || DEFAULT_BUDGET_SPLITS.wedding;
    const categories = calculateBudgetSplitFromPercents(profile.total_budget, splits);
    return {
      categories,
      strategic_notes: `Budget allocated using industry-standard ${profile.type} event distribution for ${profile.city}.`,
    };
  }

  /**
   * Generates timeline tasks using LLM for context-aware planning, code for dates
   */
  public async generateTimelineWithTasks(profile: EventProfile): Promise<{ tasks: Task[]; run_of_show: RunOfShowItem[] }> {
    if (llmClient.isAvailable()) {
      try {
        const promptData = {
          type: profile.type,
          date: profile.date,
          city: profile.city,
          guest_count: profile.guest_count,
          total_budget: profile.total_budget,
          vibe_theme: profile.vibe_theme,
          indoor_outdoor: profile.indoor_outdoor,
        };
        
        const raw = await llmClient.generateContent(
          TIMELINE_GENERATION_SYSTEM_PROMPT,
          JSON.stringify(promptData)
        );
        
        // Parse and validate response
        const parseResult = aiResponseValidator.safeParseJSON(raw);
        if (!parseResult.success) {
          logger.warn('Timeline response JSON parse failed', { error: parseResult.error });
          throw new Error('Invalid JSON response');
        }
        
        const validation = aiResponseValidator.validateTimelineTasks(parseResult.data);
        if (!validation.isValid) {
          logger.warn('Timeline response validation failed', { errors: validation.errors });
          throw new Error('Invalid timeline structure');
        }
        
        // Use validated data - LLM provides task descriptions and offsets, code calculates exact dates
        const validatedData = validation.data!;
        const tasks = calculateBackwardsDueDates(profile.date, validatedData.tasks);
        const runOfShow = this.generateRunOfShowForType(profile.type, profile.date);
        
        return { tasks, run_of_show: runOfShow };
      } catch (err: unknown) {
        logger.warn('LLM timeline generation failed, using deterministic fallback', { err });
      }
    }

    // Fallback: use event-type templates
    const tasks = this.generateDefaultTimelineForType(profile.type, profile.date);
    const runOfShow = this.generateRunOfShowForType(profile.type, profile.date);
    return { tasks, run_of_show: runOfShow };
  }

  /**
   * Generate event-type specific run-of-show
   */
  private generateRunOfShowForType(eventType: EventType, _eventDate: string): RunOfShowItem[] {
    if (eventType === 'wedding') {
      return [
        { id: 'ros_1', time: '03:30 PM', title: 'Bridal Makeup & Styling Begins', owner: 'Bridal Stylist', location: 'Green Room', notes: 'HD airbrush and draping' },
        { id: 'ros_2', time: '05:15 PM', title: 'Baraat Procession & Dhol Beats', owner: 'Groom\'s Family', location: 'Main Gate', notes: 'Traditional welcome' },
        { id: 'ros_3', time: '06:00 PM', title: 'Bride\'s Family Welcome & Aarti', owner: 'Host Family', location: 'Welcome Arch', notes: 'Tilak and garland exchange' },
        { id: 'ros_4', time: '06:30 PM', title: 'Jaimala Ceremony on Stage', owner: 'Emcee & Photography', location: 'Main Stage', notes: 'Varmala exchange with photo op' },
        { id: 'ros_5', time: '07:00 PM', title: 'Cocktail Hour & Dinner Service Begins', owner: 'Catering Team', location: 'Dining Pavilion', notes: 'Appetizers and welcome drinks' },
        { id: 'ros_6', time: '08:00 PM', title: 'Sacred Mandap Ceremony & Pheras', owner: 'Priest & Family', location: 'Mandap', notes: 'Traditional vows and saptapadi' },
        { id: 'ros_7', time: '10:00 PM', title: 'Blessings & Group Photos', owner: 'Photography Team', location: 'Photo Corner', notes: 'Family portraits' },
        { id: 'ros_8', time: '10:30 PM', title: 'Vidaai & Departure', owner: 'Both Families', location: 'Main Porch', notes: 'Emotional farewell' },
      ];
    } else if (eventType === 'birthday') {
      return [
        { id: 'ros_1', time: '07:00 PM', title: 'Venue Setup & Soundcheck Complete', owner: 'Event Coordinator', location: 'Main Hall', notes: 'Decor and lighting final check' },
        { id: 'ros_2', time: '07:30 PM', title: 'Guests Arrival & Welcome Drinks', owner: 'Hospitality Team', location: 'Entry Lounge', notes: 'Signature cocktails and mocktails' },
        { id: 'ros_3', time: '08:00 PM', title: 'Music & Dance Floor Opens', owner: 'DJ', location: 'Main Floor', notes: 'Playlist begins with upbeat tracks' },
        { id: 'ros_4', time: '09:00 PM', title: 'Dinner Service Begins', owner: 'Catering', location: 'Buffet Area', notes: 'Multi-cuisine spread' },
        { id: 'ros_5', time: '09:30 PM', title: 'Cake Cutting & Birthday Toast', owner: 'Birthday Host', location: 'Center Stage', notes: 'Group singing and champagne toast' },
        { id: 'ros_6', time: '10:00 PM', title: 'Games & Interactive Activities', owner: 'Emcee', location: 'Activity Zone', notes: 'Trivia and photo booth' },
        { id: 'ros_7', time: '11:30 PM', title: 'Thank You & Party Winds Down', owner: 'Host', location: 'Exit Area', notes: 'Return gifts distribution' },
      ];
    } else {
      // Community event
      return [
        { id: 'ros_1', time: '05:00 PM', title: 'Venue Gates Open & Security Check', owner: 'Security Team', location: 'Main Entrance', notes: 'Bag screening and entry badges' },
        { id: 'ros_2', time: '06:00 PM', title: 'Welcome Aarti & Opening Ceremony', owner: 'Cultural Committee', location: 'Main Stage', notes: 'Traditional lamp lighting' },
        { id: 'ros_3', time: '06:30 PM', title: 'Cultural Performances Begin', owner: 'Folk Performers', location: 'Central Ground', notes: 'Garba, bhajan, or folk dance' },
        { id: 'ros_4', time: '07:30 PM', title: 'Community Dinner Service', owner: 'Food Committee', location: 'Dining Marquee', notes: 'Prasad and refreshments' },
        { id: 'ros_5', time: '08:30 PM', title: 'Main Event Program', owner: 'Event Lead', location: 'Main Stage', notes: 'Speeches and announcements' },
        { id: 'ros_6', time: '09:30 PM', title: 'Closing Prayer & Thanks', owner: 'Religious Leader', location: 'Main Stage', notes: 'Community blessing' },
        { id: 'ros_7', time: '10:00 PM', title: 'Venue Clearance Begins', owner: 'Logistics Team', location: 'All Areas', notes: 'Sound curfew compliance' },
      ];
    }
  }

  /**
   * Generate default timeline based on event type
   */
  private generateDefaultTimelineForType(eventType: EventType, eventDate: string): Task[] {
    let taskTemplates;
    
    if (eventType === 'wedding') {
      taskTemplates = [
        { title: 'Finalize and secure main venue contract with advance', role: 'Organizer', priority: 'high' as const, phase: '6+ months' as const, offset_days: 180, linked_vendor: 'Venue' },
        { title: 'Finalize catering menu tasting and guest count tiers', role: 'Food Lead', priority: 'high' as const, phase: '3 months' as const, offset_days: 90, linked_vendor: 'Catering' },
        { title: 'Book candid photography and cinematic videographer', role: 'Organizer', priority: 'medium' as const, phase: '3 months' as const, offset_days: 75, linked_vendor: 'Photography' },
        { title: 'Approve mandap backdrop and floral decor theme', role: 'Decor Lead', priority: 'medium' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'Decor' },
        { title: 'Send digital invitations with RSVP tracking', role: 'Communication Lead', priority: 'high' as const, phase: '1 month' as const, offset_days: 28, linked_vendor: 'Invitations' },
        { title: 'Confirm baraat dhol troupe and route permissions', role: 'Entertainment Lead', priority: 'medium' as const, phase: '1 week' as const, offset_days: 7, linked_vendor: 'Music' },
        { title: 'Reconfirm final guest headcount with caterer', role: 'Food Lead', priority: 'high' as const, phase: '1 week' as const, offset_days: 5, linked_vendor: 'Catering' },
        { title: 'Venue walkthrough and backup power check', role: 'Logistics Lead', priority: 'high' as const, phase: 'Day before' as const, offset_days: 1, linked_vendor: 'Venue' },
        { title: 'Mandap setup and priest arrival coordination', role: 'Lead Coordinator', priority: 'high' as const, phase: 'Day-of' as const, offset_days: 0, linked_vendor: 'Rituals' },
      ];
    } else if (eventType === 'birthday') {
      taskTemplates = [
        { title: 'Reserve party venue or lounge space', role: 'Organizer', priority: 'high' as const, phase: '3 months' as const, offset_days: 60, linked_vendor: 'Venue' },
        { title: 'Order custom birthday cake with design', role: 'Host', priority: 'high' as const, phase: '1 month' as const, offset_days: 14, linked_vendor: 'Bakery' },
        { title: 'Book DJ or entertainment package', role: 'Entertainment Lead', priority: 'medium' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'Entertainment' },
        { title: 'Send digital invitations with RSVP', role: 'Host', priority: 'high' as const, phase: '1 month' as const, offset_days: 21, linked_vendor: 'Invitations' },
        { title: 'Finalize decor theme and balloon arrangements', role: 'Decor Lead', priority: 'medium' as const, phase: '1 week' as const, offset_days: 3, linked_vendor: 'Decor' },
        { title: 'Confirm final headcount and meal preferences', role: 'Catering Lead', priority: 'high' as const, phase: '1 week' as const, offset_days: 5, linked_vendor: 'Catering' },
        { title: 'Setup party favors and return gifts', role: 'Host', priority: 'low' as const, phase: 'Day before' as const, offset_days: 1, linked_vendor: 'Favors' },
        { title: 'Venue decoration and soundcheck', role: 'Event Coordinator', priority: 'high' as const, phase: 'Day-of' as const, offset_days: 0, linked_vendor: 'Venue' },
      ];
    } else {
      // Community event
      taskTemplates = [
        { title: 'Apply for municipal permits and sound NOC', role: 'Admin Lead', priority: 'high' as const, phase: '6+ months' as const, offset_days: 90, linked_vendor: 'Permits' },
        { title: 'Book community grounds and stage platform', role: 'Venue Coordinator', priority: 'high' as const, phase: '3 months' as const, offset_days: 60, linked_vendor: 'Venue' },
        { title: 'Arrange sound system and lighting equipment', role: 'Technical Lead', priority: 'high' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'Sound & Lighting' },
        { title: 'Organize volunteer team and role assignments', role: 'Volunteer Coordinator', priority: 'medium' as const, phase: '1 month' as const, offset_days: 20, linked_vendor: 'Volunteers' },
        { title: 'Confirm catering for community meal service', role: 'Food Committee', priority: 'high' as const, phase: '1 week' as const, offset_days: 7, linked_vendor: 'Catering' },
        { title: 'Setup seating, signage, and sanitation facilities', role: 'Logistics Team', priority: 'medium' as const, phase: '1 week' as const, offset_days: 3, linked_vendor: 'Facilities' },
        { title: 'Conduct volunteer briefing and dry run', role: 'Coordinator', priority: 'high' as const, phase: 'Day before' as const, offset_days: 1, linked_vendor: 'Volunteers' },
        { title: 'Day-of security deployment and gate management', role: 'Security Lead', priority: 'high' as const, phase: 'Day-of' as const, offset_days: 0, linked_vendor: 'Security' },
      ];
    }
    
    return calculateBackwardsDueDates(eventDate, taskTemplates);
  }

  /**
   * Generates budget and timeline strictly using deterministic code math (deprecated, kept for compatibility)
   */
  public generateDeterministicBudget(profile: EventProfile): FullEventPlan['budget'] {
    const splits = DEFAULT_BUDGET_SPLITS[profile.type] || DEFAULT_BUDGET_SPLITS.wedding;
    const categories = calculateBudgetSplitFromPercents(profile.total_budget, splits);
    return {
      total_budget: profile.total_budget,
      currency: profile.currency,
      categories,
      expenses: [],
    };
  }

  public generateDeterministicTimeline(profile: EventProfile): { tasks: Task[]; run_of_show: RunOfShowItem[] } {
    const tasks = this.generateDefaultTimelineForType(profile.type, profile.date);
    const runOfShow = this.generateRunOfShowForType(profile.type, profile.date);
    return { tasks, run_of_show: runOfShow };
  }

  /**
   * Budget optimizer: generates what-if scenarios for cost reduction
   */
  public async optimizeBudget(
    profile: EventProfile,
    scenario: 'maintain_quality' | 'moderate_cuts' | 'aggressive_savings',
    targetBudget?: number
  ): Promise<{
    scenario: string;
    original_budget: number;
    target_budget: number;
    projected_savings_percent: number;
    categories: BudgetCategory[];
    implementation_tips: string[];
  }> {
    const target = targetBudget || profile.total_budget;
    
    if (llmClient.isAvailable()) {
      try {
        const promptData = {
          profile,
          scenario,
          original_budget: profile.total_budget,
          target_budget: target,
        };
        
        const raw = await llmClient.generateContent(
          BUDGET_OPTIMIZER_SYSTEM_PROMPT,
          JSON.stringify(promptData)
        );
        
        const parsed = JSON.parse(raw);
        
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
          const categories = calculateBudgetSplitFromPercents(
            target,
            parsed.categories.map((c: Record<string, unknown>) => ({
              name: String(c.name || 'Category'),
              percent: Number(c.new_percent || c.percent || 10),
              reasoning: String(c.new_reasoning || c.reasoning || c.savings_strategy || ''),
            }))
          );
          
          return {
            scenario: parsed.scenario_name || scenario,
            original_budget: profile.total_budget,
            target_budget: target,
            projected_savings_percent: Number(parsed.projected_savings_percent || 0),
            categories,
            implementation_tips: Array.isArray(parsed.implementation_tips) ? parsed.implementation_tips : [],
          };
        }
      } catch (err: unknown) {
        logger.warn('LLM budget optimizer failed, using deterministic reduction', { err });
      }
    }

    // Fallback: apply simple percentage reduction
    const savingsPercent = scenario === 'maintain_quality' ? 10 : scenario === 'moderate_cuts' ? 20 : 35;
    const splits = DEFAULT_BUDGET_SPLITS[profile.type] || DEFAULT_BUDGET_SPLITS.wedding;
    const categories = calculateBudgetSplitFromPercents(target, splits);
    
    return {
      scenario,
      original_budget: profile.total_budget,
      target_budget: target,
      projected_savings_percent: savingsPercent,
      categories,
      implementation_tips: [
        'Negotiate bulk discounts with vendors',
        'Consider off-peak dates for better rates',
        'Simplify decor while maintaining core experience',
      ],
    };
  }

  /**
   * Generates creative ideas across decor, entertainment, food, and favors
   */
  public async suggestIdeas(profile: EventProfile): Promise<IdeaItem[]> {
    if (llmClient.isAvailable()) {
      try {
        const raw = await llmClient.generateContent(
          IDEA_GENERATION_SYSTEM_PROMPT,
          JSON.stringify(profile)
        );
        
        // Parse and validate response
        const parseResult = aiResponseValidator.safeParseJSON(raw);
        if (!parseResult.success) {
          logger.warn('Ideas response JSON parse failed', { error: parseResult.error });
          throw new Error('Invalid JSON response');
        }
        
        const validation = aiResponseValidator.validateIdeas(parseResult.data);
        if (!validation.isValid) {
          logger.warn('Ideas response validation failed', { errors: validation.errors });
          throw new Error('Invalid ideas structure');
        }
        
        // Map validated data to IdeaItem format
        const validatedData = validation.data!;
        return validatedData.ideas.map((item, idx) => ({
          id: `idea_${Date.now()}_${idx}`,
          category: item.category,
          title: item.title,
          description: item.description,
          cost_range: item.cost_range,
          effort_level: item.effort_level,
          tags: item.tags,
          saved: item.saved,
        }));
      } catch (err: unknown) {
        logger.warn('LLM idea generation failed, using curated ideas', { err });
      }
    }

    return fallbackDataService.getCuratedIdeas(profile);
  }

  /**
   * Generates invitations in multiple formats and tones
   */
  public async generateInvitations(profile: EventProfile): Promise<InvitationItem[]> {
    if (llmClient.isAvailable()) {
      try {
        const raw = await llmClient.generateContent(
          INVITATION_GENERATION_SYSTEM_PROMPT,
          JSON.stringify(profile)
        );
        const parsed = JSON.parse(raw);
        const variants = parsed.variants || parsed.messages || [];
        if (Array.isArray(variants)) {
          return variants.map((m: Record<string, unknown>, idx: number) => ({
            id: `inv_${Date.now()}_${idx}`,
            type: String(m.type || m.channel || 'WhatsApp Invite'),
            language: String(m.language || 'English'),
            tone: String(m.tone || 'Warm & Traditional'),
            content: String(m.content || ''),
            share_url: `https://wa.me/?text=${encodeURIComponent(String(m.content || ''))}`,
          }));
        }
      } catch (err: unknown) {
        logger.warn('LLM invitation generation failed, using curated templates', { err });
      }
    }

    return fallbackDataService.getCuratedInvitations(profile);
  }

  /**
   * Generates risk evaluation
   */
  public async analyzeRisks(profile: EventProfile): Promise<RiskItem[]> {
    if (llmClient.isAvailable()) {
      try {
        const raw = await llmClient.generateContent(
          RISK_ANALYSIS_SYSTEM_PROMPT,
          JSON.stringify(profile)
        );
        
        // Parse and validate response
        const parseResult = aiResponseValidator.safeParseJSON(raw);
        if (!parseResult.success) {
          logger.warn('Risks response JSON parse failed', { error: parseResult.error });
          throw new Error('Invalid JSON response');
        }
        
        const validation = aiResponseValidator.validateRisks(parseResult.data);
        if (!validation.isValid) {
          logger.warn('Risks response validation failed', { errors: validation.errors });
          throw new Error('Invalid risks structure');
        }
        
        // Map validated data to RiskItem format
        const validatedData = validation.data!;
        return validatedData.risks.map((r, idx) => ({
          id: `risk_${Date.now()}_${idx}`,
          category: r.category as RiskItem['category'],
          title: r.title,
          severity: r.severity,
          likelihood: r.likelihood,
          why: r.why,
          mitigation: r.mitigation,
          backup_plan: r.backup_plan,
        }));
      } catch (err: unknown) {
        logger.warn('LLM risk evaluation failed, using curated risk matrix', { err });
      }
    }

    return fallbackDataService.getCuratedRisks(profile);
  }

  // Curated fallbacks moved to fallback-data.service.ts for better organization
}

export const aiService = new AIService();
