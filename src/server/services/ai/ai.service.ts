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
import {
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
            return this.fallbackExtractProfile(userInput);
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

    return this.fallbackExtractProfile(userInput);
  }

  /**
   * Deterministic pattern extractor for intake
   */
  private fallbackExtractProfile(text: string): {
    profile: EventProfile;
    followUpQuestions: string[];
    confidence: number;
  } {
    const lower = text.toLowerCase();

    // 1. Detect Type
    let eventType: EventType = 'wedding';
    if (lower.includes('birthday') || lower.includes('bday') || lower.includes('turning')) {
      eventType = 'birthday';
    } else if (
      lower.includes('garba') ||
      lower.includes('community') ||
      lower.includes('festival') ||
      lower.includes('gathering')
    ) {
      eventType = 'community';
    } else if (lower.includes('conference') || lower.includes('anniversary')) {
      eventType = 'general';
    }

    // 2. Detect Guest Count
    const guestMatch =
      lower.match(/(\d+)\s*(guests?|people|pax|members|attendees?)/i) ||
      lower.match(/guests?:\s*(\d+)/i);
    const guestCount = guestMatch ? parseInt(guestMatch[1], 10) : 150;

    // 3. Detect Budget (INR Lakhs or raw numbers)
    let totalBudget = 500000;
    const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l|lakhs)/i);
    if (lakhMatch) {
      totalBudget = Math.round(parseFloat(lakhMatch[1]) * 100000);
    } else {
      const croreMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:crore|cr)/i);
      if (croreMatch) {
        totalBudget = Math.round(parseFloat(croreMatch[1]) * 10000000);
      } else {
        const rawBudgetMatch = lower.match(/(?:rs\.?|inr|budget:?)\s*(\d[\d,]+)/i);
        if (rawBudgetMatch) {
          totalBudget = parseInt(rawBudgetMatch[1].replace(/,/g, ''), 10);
        }
      }
    }

    // 4. Detect City
    let city = 'Ahmedabad';
    const cities = [
      'Ahmedabad',
      'Mumbai',
      'Delhi',
      'Bengaluru',
      'Jaipur',
      'Udaipur',
      'Surat',
      'Vadodara',
      'Pune',
      'Goa',
      'Hyderabad',
      'Chennai',
      'Kolkata',
    ];
    for (const c of cities) {
      if (lower.includes(c.toLowerCase())) {
        city = c;
        break;
      }
    }

    // 5. Detect Date (e.g. December 2026 or YYYY-MM-DD)
    let date = '2026-12-18';
    const dateMatch = lower.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      date = dateMatch[1];
    } else if (lower.includes('december') || lower.includes('dec')) {
      date = '2026-12-18';
    } else if (lower.includes('november') || lower.includes('nov')) {
      date = '2026-11-20';
    } else if (lower.includes('january') || lower.includes('jan')) {
      date = '2027-01-22';
    }

    // 6. Food & Vibe heuristics
    let dietaryMix = 'Vegetarian & Jain friendly';
    if (lower.includes('jain')) dietaryMix = 'Strict Jain & Pure Vegetarian counters';
    else if (lower.includes('non-veg') || lower.includes('chicken')) dietaryMix = 'Mixed Gourmet Non-Veg & Veg';

    const indoorOutdoor: 'indoor' | 'outdoor' | 'hybrid' = lower.includes('rooftop') || lower.includes('lawn') || lower.includes('outdoor')
      ? 'outdoor'
      : lower.includes('banquet') || lower.includes('hall') || lower.includes('indoor')
      ? 'indoor'
      : 'hybrid';

    const title =
      eventType === 'wedding'
        ? `Grand Celebration in ${city}`
        : eventType === 'birthday'
        ? `Milestone Birthday Celebration in ${city}`
        : `Community Cultural Gathering in ${city}`;

    const profile: EventProfile = {
      id: `event-${Date.now()}`,
      title,
      type: eventType,
      date,
      city,
      guest_count: guestCount,
      total_budget: totalBudget,
      currency: 'INR',
      vibe_theme: 'Festive, Elegant & Culturally Rooted',
      culture_tradition: eventType === 'wedding' ? 'Traditional Indian' : 'Contemporary',
      dietary_mix: dietaryMix,
      indoor_outdoor: indoorOutdoor,
      priorities: ['Catering & Culinary Excellence', 'Warm Aesthetic Decor', 'Memorable Hospitality'],
      constraints: '10:00 PM sound restrictions; elderly accessibility required',
    };

    return {
      profile,
      followUpQuestions: [
        'Would you like a dedicated live food station (e.g. chaat, dessert bar)?',
        'Do you have specific color palette preferences for the mandap or stage?',
      ],
      confidence: 0.88,
    };
  }

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
          sanitizedProfile
        );
        
        const parsed = JSON.parse(raw);
        
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
          // LLM provides percentages and reasoning, code does exact math
          const categories = calculateBudgetSplitFromPercents(
            profile.total_budget,
            parsed.categories.map((c: Record<string, unknown>) => ({
              name: String(c.name || 'Category'),
              percent: Number(c.percent || 10),
              reasoning: String(c.reasoning || 'Budget allocation'),
            }))
          );
          
          return {
            categories,
            strategic_notes: String(parsed.strategic_notes || parsed.notes || ''),
          };
        }
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
        
        const parsed = JSON.parse(raw);
        
        if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
          // LLM provides task descriptions and offsets, code calculates exact dates
          const taskTemplates = parsed.tasks.map((t: Record<string, unknown>) => ({
            title: String(t.title || 'Milestone Task'),
            role: String(t.role || t.assignee || 'Organizer'),
            priority: (t.priority as 'high' | 'medium' | 'low') || 'medium',
            phase: (t.phase as Task['phase']) || '1 month',
            offset_days: Number(t.offset_days || 30),
            linked_vendor: String(t.linked_vendor || 'General'),
            notes: String(t.notes || ''),
          }));
          
          const tasks = calculateBackwardsDueDates(profile.date, taskTemplates);
          const runOfShow = this.generateRunOfShowForType(profile.type, profile.date);
          
          return { tasks, run_of_show: runOfShow };
        }
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
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.ideas)) {
          return parsed.ideas.map((item: Record<string, unknown>, idx: number) => ({
            id: `idea_${Date.now()}_${idx}`,
            category: String(item.category || 'Decor & Ambiance'),
            title: String(item.title || 'Creative Touch'),
            description: String(item.description || ''),
            cost_range: String(item.cost_range || `₹${Math.round(profile.total_budget * 0.03).toLocaleString()}`),
            effort_level: (item.effort_level as 'Low' | 'Medium' | 'High') || 'Medium',
            tags: Array.isArray(item.tags) ? item.tags.map(String) : ['Creative', 'Personalized'],
            saved: Boolean(item.saved),
          }));
        }
      } catch (err: unknown) {
        logger.warn('LLM idea generation failed, using curated ideas', { err });
      }
    }

    return this.getCuratedIdeas(profile);
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

    return this.getCuratedInvitations(profile);
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
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.risks)) {
          return parsed.risks.map((r: Record<string, unknown>, idx: number) => ({
            id: `risk_${Date.now()}_${idx}`,
            category: (r.category as RiskItem['category']) || 'General',
            title: String(r.title || 'Operational Risk'),
            severity: (r.severity as 'high' | 'medium' | 'low') || 'medium',
            likelihood: (r.likelihood as 'high' | 'medium' | 'low') || 'medium',
            why: String(r.why || r.preventiveMeasure || 'Event day contingency'),
            mitigation: String(r.mitigation || r.preventiveMeasure || 'Pre-event checkpoint inspection'),
            backup_plan: String(r.backup_plan || r.contingencyPlan || 'Standby vendor on call'),
          }));
        }
      } catch (err: unknown) {
        logger.warn('LLM risk evaluation failed, using curated risk matrix', { err });
      }
    }

    return this.getCuratedRisks(profile);
  }

  // Curated fallbacks ensuring high-quality experience even without API key
  private getCuratedIdeas(profile: EventProfile): IdeaItem[] {
    const isWedding = profile.type === 'wedding';
    return [
      {
        id: 'idea_seed_1',
        category: 'Decor & Ambiance',
        title: isWedding ? 'Heritage Brass & Marigold Canopy' : 'Warm Fairy Lights Canopy with Photo Wall',
        description: isWedding
          ? 'Use traditional brass urulis with floating tea-lights and fragrant marigold torans at the entrance gate for a warm, auspicious welcome.'
          : 'A cozy fairy light installation with instant polaroid photo clips celebrating memories.',
        cost_range: `₹${Math.round(profile.total_budget * 0.025).toLocaleString()} - ₹${Math.round(profile.total_budget * 0.04).toLocaleString()}`,
        effort_level: 'Low',
        tags: ['Aesthetic', 'Welcome', 'Traditional'],
        saved: true,
      },
      {
        id: 'idea_seed_2',
        category: 'Food & Culinary',
        title: 'Live Artisan Chaat & Mocktail Bar',
        description: 'Interactive counter featuring curated spiced treats, smoked tamarind coolers, and chilled tender coconut refreshers.',
        cost_range: `₹${Math.round(profile.total_budget * 0.04).toLocaleString()} - ₹${Math.round(profile.total_budget * 0.06).toLocaleString()}`,
        effort_level: 'Medium',
        tags: ['Culinary', 'Interactive', 'Gourmet'],
        saved: true,
      },
      {
        id: 'idea_seed_3',
        category: 'Entertainment',
        title: isWedding ? 'Acoustic Folk Sangeet & Live Dhol Welcome' : 'Live Acoustic Set & Interactive Trivia',
        description: 'Engage all age groups with authentic beats during peak arrival, transitioning into acoustic live melodies.',
        cost_range: `₹${Math.round(profile.total_budget * 0.03).toLocaleString()} - ₹${Math.round(profile.total_budget * 0.05).toLocaleString()}`,
        effort_level: 'Low',
        tags: ['Music', 'Vibe', 'Live'],
        saved: false,
      },
      {
        id: 'idea_seed_4',
        category: 'Favors & Gifting',
        title: 'Eco-Friendly Plantable Seed Paper & Artisanal Sweets',
        description: 'Zero-waste takeaway gifts packaged in handcrafted jute pouches with customized family tags.',
        cost_range: `₹${Math.round(profile.total_budget * 0.015).toLocaleString()} - ₹${Math.round(profile.total_budget * 0.025).toLocaleString()}`,
        effort_level: 'Low',
        tags: ['Eco-friendly', 'Gifts', 'Memories'],
        saved: true,
      },
    ];
  }

  private getCuratedInvitations(profile: EventProfile): InvitationItem[] {
    return [
      {
        id: 'msg_seed_1',
        type: 'WhatsApp Digital Invite',
        language: 'English',
        tone: 'Warm & Festive',
        content: `Namaste! 🙏\n\nWith immense joy and blessings, we warmly invite you to celebrate ${profile.title}.\n\n📅 Date: ${profile.date}\n📍 City: ${profile.city}\n👥 Guests: ${profile.guest_count}\n\nYour presence and blessings will make our special day complete. Kindly treat this as our heartfelt invitation!\n\nWarm regards,\nFamily`,
        share_url: `https://wa.me/?text=${encodeURIComponent(`Namaste! You are cordially invited to celebrate ${profile.title} on ${profile.date} in ${profile.city}!`)}`,
      },
      {
        id: 'msg_seed_2',
        type: 'Formal Card Copy',
        language: 'English',
        tone: 'Formal & Royal',
        content: `Cordial Invitation\n\nWe take great pleasure in inviting you to join us on the auspicious occasion of ${profile.title}.\n\nDate: ${profile.date}\nLocation: ${profile.city}\nDress Code: Festive Traditional\n\nPlease let us know your travel itinerary to assist with arrangements.\n\nWarm regards,\nHost Committee`,
        share_url: '',
      },
      {
        id: 'msg_seed_3',
        type: 'Short SMS / WhatsApp Broadcast',
        language: 'English',
        tone: 'Joyful & Direct',
        content: `✨ Save the Date! Join us for ${profile.title} on ${profile.date} in ${profile.city}. Detailed invite to follow. Can't wait to celebrate together!`,
        share_url: `https://wa.me/?text=${encodeURIComponent(`Save the date for ${profile.title} on ${profile.date}!`)}`,
      },
    ];
  }

  private getCuratedRisks(profile: EventProfile): RiskItem[] {
    return [
      {
        id: 'risk_seed_1',
        category: 'Food & Safety',
        title: 'Catering Headcount Overflow (+15% unexpected guests)',
        severity: 'high',
        likelihood: 'high',
        why: 'In Indian celebrations, extended families often arrive in larger groups than initially confirmed.',
        mitigation: 'Mandate RSVP confirmations 5 days prior; contractually request caterer for 15% buffer provision in raw materials.',
        backup_plan: 'Pre-negotiated secondary fast-service live counter with 30-minute replenishment window.',
      },
      {
        id: 'risk_seed_2',
        category: 'Weather',
        title: profile.indoor_outdoor === 'outdoor' ? 'Sudden Unseasonal Rain or Extreme Evening Dew' : 'Air Conditioning Overload with Full Banquet',
        severity: 'high',
        likelihood: 'medium',
        why: profile.indoor_outdoor === 'outdoor' ? 'Winter evening dew and unexpected showers can disrupt lawn mandap setups.' : 'Full hall capacity can strain HVAC compressors.',
        mitigation: profile.indoor_outdoor === 'outdoor' ? 'Reserve water-resistant German hanger canopy with side curtains.' : 'Verify venue transformer backup and run test load 48h prior.',
        backup_plan: 'On-site 125 kVA silent generator stationed on standby with automatic changeover switch.',
      },
      {
        id: 'risk_seed_3',
        category: 'Timeline',
        title: 'Baraat / Ceremony Delay Impacting Dinner Schedule',
        severity: 'medium',
        likelihood: 'high',
        why: 'Traffic congestion and extended dance processions routinely push schedules back by 60-90 minutes.',
        mitigation: 'Assign a dedicated Baraat coordinator with wireless comms to signal caterers at the 500-meter mark.',
        backup_plan: 'Keep welcome appetizer stations fully loaded and circulating so arriving guests remain comfortable.',
      },
    ];
  }
}

export const aiService = new AIService();
