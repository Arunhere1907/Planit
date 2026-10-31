/**
 * Fallback Data Service
 *
 * Provides high-quality curated data for all AI features when the LLM is unavailable.
 * This ensures the app remains fully functional without API keys.
 */

import type {
  EventProfile,
  EventType,
  IdeaItem,
  InvitationItem,
  RiskItem,
} from '../../../shared/types/index.js';

export class FallbackDataService {
  /**
   * Pattern-based event profile extractor
   * Fallback for intake when LLM is unavailable
   */
  public extractProfileFromText(text: string): {
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
    else if (lower.includes('non-veg') || lower.includes('chicken'))
      dietaryMix = 'Mixed Gourmet Non-Veg & Veg';

    const indoorOutdoor: 'indoor' | 'outdoor' | 'hybrid' =
      lower.includes('rooftop') || lower.includes('lawn') || lower.includes('outdoor')
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
      priorities: [
        'Catering & Culinary Excellence',
        'Warm Aesthetic Decor',
        'Memorable Hospitality',
      ],
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

  /**
   * Curated creative ideas per event type
   */
  public getCuratedIdeas(profile: EventProfile): IdeaItem[] {
    const isWedding = profile.type === 'wedding';

    return [
      {
        id: 'idea_seed_1',
        category: 'Decor & Ambiance',
        title: isWedding
          ? 'Heritage Brass & Marigold Canopy'
          : 'Warm Fairy Lights Canopy with Photo Wall',
        description: isWedding
          ? 'Use traditional brass urulis with floating tea-lights and fragrant marigold torans at the entrance gate for a warm, auspicious welcome.'
          : 'A cozy fairy light installation with instant polaroid photo clips celebrating memories.',
        cost_range: `₹${Math.round(profile.total_budget * 0.025).toLocaleString()} - ₹${Math.round(
          profile.total_budget * 0.04
        ).toLocaleString()}`,
        effort_level: 'Low',
        tags: ['Aesthetic', 'Welcome', 'Traditional'],
        saved: true,
      },
      {
        id: 'idea_seed_2',
        category: 'Food & Culinary',
        title: 'Live Artisan Chaat & Mocktail Bar',
        description:
          'Interactive counter featuring curated spiced treats, smoked tamarind coolers, and chilled tender coconut refreshers.',
        cost_range: `₹${Math.round(profile.total_budget * 0.04).toLocaleString()} - ₹${Math.round(
          profile.total_budget * 0.06
        ).toLocaleString()}`,
        effort_level: 'Medium',
        tags: ['Culinary', 'Interactive', 'Gourmet'],
        saved: true,
      },
      {
        id: 'idea_seed_3',
        category: 'Entertainment',
        title: isWedding
          ? 'Acoustic Folk Sangeet & Live Dhol Welcome'
          : 'Live Acoustic Set & Interactive Trivia',
        description:
          'Engage all age groups with authentic beats during peak arrival, transitioning into acoustic live melodies.',
        cost_range: `₹${Math.round(profile.total_budget * 0.03).toLocaleString()} - ₹${Math.round(
          profile.total_budget * 0.05
        ).toLocaleString()}`,
        effort_level: 'Low',
        tags: ['Music', 'Vibe', 'Live'],
        saved: false,
      },
      {
        id: 'idea_seed_4',
        category: 'Favors & Gifting',
        title: 'Eco-Friendly Plantable Seed Paper & Artisanal Sweets',
        description:
          'Zero-waste takeaway gifts packaged in handcrafted jute pouches with customized family tags.',
        cost_range: `₹${Math.round(profile.total_budget * 0.015).toLocaleString()} - ₹${Math.round(
          profile.total_budget * 0.025
        ).toLocaleString()}`,
        effort_level: 'Low',
        tags: ['Eco-friendly', 'Gifts', 'Memories'],
        saved: true,
      },
    ];
  }

  /**
   * Curated invitation templates per tone and language
   */
  public getCuratedInvitations(profile: EventProfile): InvitationItem[] {
    return [
      {
        id: 'msg_seed_1',
        type: 'WhatsApp Digital Invite',
        language: 'English',
        tone: 'Warm & Festive',
        content: `Namaste! 🙏\n\nWith immense joy and blessings, we warmly invite you to celebrate ${profile.title}.\n\n📅 Date: ${profile.date}\n📍 City: ${profile.city}\n👥 Guests: ${profile.guest_count}\n\nYour presence and blessings will make our special day complete. Kindly treat this as our heartfelt invitation!\n\nWarm regards,\nFamily`,
        share_url: `https://wa.me/?text=${encodeURIComponent(
          `Namaste! You are cordially invited to celebrate ${profile.title} on ${profile.date} in ${profile.city}!`
        )}`,
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
        share_url: `https://wa.me/?text=${encodeURIComponent(
          `Save the date for ${profile.title} on ${profile.date}!`
        )}`,
      },
    ];
  }

  /**
   * Context-specific risk assessment matrix
   */
  public getCuratedRisks(profile: EventProfile): RiskItem[] {
    return [
      {
        id: 'risk_seed_1',
        category: 'Food & Safety',
        title: 'Catering Headcount Overflow (+15% unexpected guests)',
        severity: 'high',
        likelihood: 'high',
        why: 'In Indian celebrations, extended families often arrive in larger groups than initially confirmed.',
        mitigation:
          'Mandate RSVP confirmations 5 days prior; contractually request caterer for 15% buffer provision in raw materials.',
        backup_plan:
          'Pre-negotiated secondary fast-service live counter with 30-minute replenishment window.',
      },
      {
        id: 'risk_seed_2',
        category: 'Weather',
        title:
          profile.indoor_outdoor === 'outdoor'
            ? 'Sudden Unseasonal Rain or Extreme Evening Dew'
            : 'Air Conditioning Overload with Full Banquet',
        severity: 'high',
        likelihood: 'medium',
        why:
          profile.indoor_outdoor === 'outdoor'
            ? 'Winter evening dew and unexpected showers can disrupt lawn mandap setups.'
            : 'Full hall capacity can strain HVAC compressors.',
        mitigation:
          profile.indoor_outdoor === 'outdoor'
            ? 'Reserve water-resistant German hanger canopy with side curtains.'
            : 'Verify venue transformer backup and run test load 48h prior.',
        backup_plan:
          'On-site 125 kVA silent generator stationed on standby with automatic changeover switch.',
      },
      {
        id: 'risk_seed_3',
        category: 'Timeline',
        title: 'Baraat / Ceremony Delay Impacting Dinner Schedule',
        severity: 'medium',
        likelihood: 'high',
        why: 'Traffic congestion and extended dance processions routinely push schedules back by 60-90 minutes.',
        mitigation:
          'Assign a dedicated Baraat coordinator with wireless comms to signal caterers at the 500-meter mark.',
        backup_plan:
          'Keep welcome appetizer stations fully loaded and circulating so arriving guests remain comfortable.',
      },
    ];
  }
}

export const fallbackDataService = new FallbackDataService();
