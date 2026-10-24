import { llmClient } from './llm.client.js';
import {
  INTAKE_EXTRACTION_SYSTEM_PROMPT,
  IDEA_GENERATION_SYSTEM_PROMPT,
  INVITATION_GENERATION_SYSTEM_PROMPT,
  RISK_ANALYSIS_SYSTEM_PROMPT
} from './prompts/event-prompts.js';
import {
  EventProfile,
  EventType,
  EventBudget,
  TimelineTask,
  CreativeIdea,
  EventMessage,
  RiskItem
} from '../../../shared/types/index.js';
import {
  calculateDefaultBudget,
  generateDefaultTimeline,
  DEFAULT_BUDGET_SPLITS
} from '../../../shared/utils/deterministic-math.js';
import { logger } from '../../utils/logger.js';

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
        const parsed = JSON.parse(rawJson);
        return {
          profile: this.sanitizeExtractedProfile(parsed.profile || parsed),
          followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85
        };
      } catch (err) {
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
    } else if (lower.includes('garba') || lower.includes('community') || lower.includes('festival') || lower.includes('gathering')) {
      eventType = 'community';
    } else if (lower.includes('conference') || lower.includes('anniversary')) {
      eventType = 'other';
    }

    // 2. Detect Guest Count
    const guestMatch = lower.match(/(\d+)\s*(guests?|people|pax|members|attendees?)/i) || lower.match(/guests?:\s*(\d+)/i);
    const guestCount = guestMatch ? parseInt(guestMatch[1], 10) : 150;

    // 3. Detect Budget (INR Lakhs or raw numbers)
    let totalBudget = 500000;
    const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l|lakhs)/i);
    if (lakhMatch) {
      totalBudget = Math.round(parseFloat(lakhMatch[1]) * 100000);
    } else {
      const budgetMatch = lower.match(/(?:budget|cost|rs\.?|inr|₹)\s*[:=]?\s*(\d[\d,]+)/i);
      if (budgetMatch) {
        totalBudget = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
      }
    }

    // 4. Detect City
    const cities = ['Ahmedabad', 'Mumbai', 'Delhi', 'Bengaluru', 'Jaipur', 'Udaipur', 'Surat', 'Pune', 'Goa', 'Chennai', 'Hyderabad', 'Kolkata'];
    let city = 'Ahmedabad';
    for (const c of cities) {
      if (lower.includes(c.toLowerCase())) {
        city = c;
        break;
      }
    }

    // 5. Detect Month/Date
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    let targetDate = '2026-12-18';
    const foundMonthIdx = months.findIndex(m => lower.includes(m));
    if (foundMonthIdx !== -1) {
      const mStr = String(foundMonthIdx + 1).padStart(2, '0');
      targetDate = `2026-${mStr}-15`;
    }

    // 6. Detect Dietary & Vibe
    const dietaryMix: string[] = [];
    if (lower.includes('veg') || lower.includes('vegetarian')) dietaryMix.push('Pure Vegetarian');
    if (lower.includes('jain')) dietaryMix.push('Jain Options');
    if (lower.includes('non-veg')) dietaryMix.push('Non-Vegetarian Counter');
    if (dietaryMix.length === 0) dietaryMix.push('Multi-Cuisine Buffet');

    let vibe = 'Traditional Indian with Modern Elegance';
    if (lower.includes('minimal')) vibe = 'Minimalist & Contemporary';
    if (lower.includes('royal') || lower.includes('grand')) vibe = 'Royal Heritage & Luxurious';
    if (lower.includes('funky') || lower.includes('party')) vibe = 'Vibrant & High-Energy';

    // Title construction
    let title = `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Celebration`;
    if (eventType === 'wedding') {
      title = lower.includes('sister') ? "Sister's Grand Wedding" : 'Dream Wedding Celebration';
    } else if (eventType === 'birthday') {
      title = 'Milestone Birthday Party';
    } else if (eventType === 'community') {
      title = 'Community Cultural Utsav';
    }

    const followUps: string[] = [];
    if (!guestMatch) followUps.push('Could you confirm your expected guest count?');
    if (!lakhMatch && !lower.includes('budget')) followUps.push('What is your target budget ceiling?');
    if (!lower.includes('indoor') && !lower.includes('outdoor')) followUps.push('Do you prefer an indoor banquet or open-air lawn?');

    const profile: EventProfile = {
      title,
      type: eventType,
      targetDate,
      city,
      guestCount,
      totalBudget,
      currency: 'INR',
      vibe,
      culturalTradition: lower.includes('gujarati') ? 'Gujarati Hindu' : 'Indian Contemporary',
      dietaryMix,
      indoorOutdoor: lower.includes('outdoor') ? 'outdoor' : lower.includes('both') ? 'both' : 'indoor',
      priorities: ['Catering & Food Quality', 'Photographer & Moments', 'Guest Comfort']
    };

    return {
      profile,
      followUpQuestions: followUps.slice(0, 3),
      confidence: 0.9
    };
  }

  private sanitizeExtractedProfile(raw: Partial<EventProfile>): EventProfile {
    return {
      title: raw.title || 'Special Celebration',
      type: (raw.type as EventType) || 'wedding',
      targetDate: raw.targetDate || '2026-12-15',
      city: raw.city || 'Ahmedabad',
      guestCount: Math.max(10, Number(raw.guestCount) || 150),
      totalBudget: Math.max(50000, Number(raw.totalBudget) || 500000),
      currency: raw.currency || 'INR',
      vibe: raw.vibe || 'Festive and Welcoming',
      culturalTradition: raw.culturalTradition || 'Contemporary',
      dietaryMix: Array.isArray(raw.dietaryMix) ? raw.dietaryMix : ['Standard Buffet'],
      indoorOutdoor: (raw.indoorOutdoor as 'indoor' | 'outdoor' | 'both') || 'indoor',
      priorities: Array.isArray(raw.priorities) ? raw.priorities : ['Food', 'Decor', 'Experience']
    };
  }

  /**
   * Generates budget and timeline strictly using deterministic code math
   */
  public generateDeterministicBudget(profile: EventProfile): EventBudget {
    return calculateDefaultBudget(profile.totalBudget, profile.type, profile.currency);
  }

  public generateDeterministicTimeline(profile: EventProfile): TimelineTask[] {
    return generateDefaultTimeline(profile.targetDate, profile.type);
  }

  /**
   * Generates creative ideas across decor, entertainment, food, and favors
   */
  public async suggestIdeas(profile: EventProfile): Promise<CreativeIdea[]> {
    if (llmClient.isAvailable()) {
      try {
        const raw = await llmClient.generateContent(
          IDEA_GENERATION_SYSTEM_PROMPT,
          JSON.stringify(profile)
        );
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.ideas)) {
          return parsed.ideas.map((item: Partial<CreativeIdea>, idx: number) => ({
            id: `idea_${Date.now()}_${idx}`,
            category: item.category || 'decor',
            title: item.title || 'Creative Touch',
            description: item.description || '',
            estimatedCost: typeof item.estimatedCost === 'number' ? item.estimatedCost : 15000,
            diyFeasibility: item.diyFeasibility || 'medium',
            status: 'suggested'
          }));
        }
      } catch (err) {
        logger.warn('LLM idea generation failed, using curated ideas', { err });
      }
    }

    return this.getCuratedIdeas(profile);
  }

  /**
   * Generates invitations in multiple formats and tones
   */
  public async generateInvitations(profile: EventProfile): Promise<EventMessage[]> {
    if (llmClient.isAvailable()) {
      try {
        const raw = await llmClient.generateContent(
          INVITATION_GENERATION_SYSTEM_PROMPT,
          JSON.stringify(profile)
        );
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.messages)) {
          return parsed.messages.map((m: Partial<EventMessage>, idx: number) => ({
            id: `msg_${Date.now()}_${idx}`,
            channel: m.channel || 'whatsapp',
            tone: m.tone || 'warm',
            title: m.title || 'Invitation',
            content: m.content || '',
            recipientGroup: m.recipientGroup || 'All Guests'
          }));
        }
      } catch (err) {
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
          return parsed.risks.map((r: Partial<RiskItem>, idx: number) => ({
            id: `risk_${Date.now()}_${idx}`,
            category: r.category || 'logistics',
            title: r.title || 'Operational Risk',
            severity: r.severity || 'medium',
            probability: r.probability || 'possible',
            preventiveMeasure: r.preventiveMeasure || '',
            contingencyPlan: r.contingencyPlan || '',
            owner: 'Event Lead',
            status: 'identified'
          }));
        }
      } catch (err) {
        logger.warn('LLM risk evaluation failed, using curated risk matrix', { err });
      }
    }

    return this.getCuratedRisks(profile);
  }

  // Curated fallbacks ensuring high-quality experience even without API key
  private getCuratedIdeas(profile: EventProfile): CreativeIdea[] {
    const isWedding = profile.type === 'wedding';
    return [
      {
        id: 'idea_seed_1',
        category: 'decor',
        title: isWedding ? 'Heritage Brass & Marigold Canopy' : 'Warm Fairy Lights Canopy with Photo Wall',
        description: isWedding
          ? 'Use traditional brass urulis with floating tea-lights and fragrant marigold torans at the entrance gate for a warm, auspicious welcome.'
          : 'A cozy fairy light installation with instant polaroid photo clips celebrating memories.',
        estimatedCost: Math.round(profile.totalBudget * 0.03),
        diyFeasibility: 'medium',
        status: 'suggested'
      },
      {
        id: 'idea_seed_2',
        category: 'food',
        title: 'Live Artisan Chaat & Mocktail Bar',
        description: 'Interactive counter featuring curated spiced treats, smoked tamarind coolers, and chilled tender coconut refreshers.',
        estimatedCost: Math.round(profile.totalBudget * 0.05),
        diyFeasibility: 'low',
        status: 'suggested'
      },
      {
        id: 'idea_seed_3',
        category: 'entertainment',
        title: isWedding ? 'Acoustic Folk Sangeet & Live Dhol Welcome' : 'Live Acoustic Set & Interactive Trivia',
        description: 'Engage all age groups with authentic beats during peak arrival, transitioning into acoustic live melodies.',
        estimatedCost: Math.round(profile.totalBudget * 0.04),
        diyFeasibility: 'low',
        status: 'accepted'
      },
      {
        id: 'idea_seed_4',
        category: 'favors',
        title: 'Eco-Friendly Plantable Seed Paper & Artisanal Sweets',
        description: 'Zero-waste takeaway gifts packaged in handcrafted jute pouches with customized family tags.',
        estimatedCost: Math.round(profile.totalBudget * 0.02),
        diyFeasibility: 'high',
        status: 'suggested'
      }
    ];
  }

  private getCuratedInvitations(profile: EventProfile): EventMessage[] {
    return [
      {
        id: 'msg_seed_1',
        channel: 'whatsapp',
        tone: 'warm',
        title: 'WhatsApp Family & Friends Invitation',
        content: `Namaste! 🙏\n\nWith immense joy and blessings, we warmly invite you to celebrate ${profile.title}.\n\n📅 Date: ${profile.targetDate}\n📍 City: ${profile.city}\n\nYour presence and blessings will make our special day complete. Kindly treat this as our heartfelt invitation!\n\nWarm regards,\nFamily`,
        recipientGroup: 'Close Family & Friends'
      },
      {
        id: 'msg_seed_2',
        channel: 'email',
        tone: 'formal',
        title: 'Formal Email Invitation',
        content: `Subject: Cordial Invitation to celebrate ${profile.title}\n\nDear {GuestName},\n\nWe take great pleasure in inviting you to join us on the auspicious occasion of ${profile.title}.\n\nDate: ${profile.targetDate}\nLocation: ${profile.city}\nDress Code: Festive Traditional\n\nPlease let us know your travel itinerary to assist with arrangements.\n\nWarm regards,\nHost Committee`,
        recipientGroup: 'Dignitaries & Outstation Guests'
      },
      {
        id: 'msg_seed_3',
        channel: 'sms',
        tone: 'festive',
        title: 'Save The Date SMS / Broadcast',
        content: `✨ Save the Date! Join us for ${profile.title} on ${profile.targetDate} in ${profile.city}. Detailed invite to follow. Can't wait to celebrate together!`,
        recipientGroup: 'All Guests'
      }
    ];
  }

  private getCuratedRisks(profile: EventProfile): RiskItem[] {
    return [
      {
        id: 'risk_seed_1',
        category: 'logistics',
        title: 'Catering Headcount Overflow (+15% unexpected guests)',
        severity: 'high',
        probability: 'likely',
        preventiveMeasure: 'Mandate RSVP confirmations 5 days prior; request caterer for 15% buffer provision in raw materials.',
        contingencyPlan: 'Pre-negotiated secondary fast-service live counter with 30-minute replenishment window.',
        owner: 'Food Coordinator',
        status: 'mitigated'
      },
      {
        id: 'risk_seed_2',
        category: 'weather',
        title: profile.indoorOutdoor === 'outdoor' ? 'Sudden Unseasonal Rain or Extreme Wind' : 'Air Conditioning Overload with Full Banquet',
        severity: 'critical',
        probability: 'possible',
        preventiveMeasure: profile.indoorOutdoor === 'outdoor' ? 'Reserve water-resistant German hanger canopy with side curtains.' : 'Verify venue transformer backup and run test load 48h prior.',
        contingencyPlan: 'On-site 125 kVA silent generator stationed on standby with automatic changeover switch.',
        owner: 'Venue Liaison',
        status: 'identified'
      },
      {
        id: 'risk_seed_3',
        category: 'vendor',
        title: 'Primary Photographer or Sound Engineer Equipment Failure',
        severity: 'high',
        probability: 'unlikely',
        preventiveMeasure: 'Contractually require dual-camera recording and secondary sound mixer in the agreement.',
        contingencyPlan: 'Local studio backup crew on 1-hour on-call retainer.',
        owner: 'Media Manager',
        status: 'identified'
      }
    ];
  }
}

export const aiService = new AIService();
