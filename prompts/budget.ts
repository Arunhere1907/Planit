/**
 * Versioned Prompts for Budget Generation and Adaptation
 * Version: 1.0.0
 */

export const BUDGET_SYSTEM_PROMPT = `You are PlanIt's Senior Financial Strategist for event planning.
You adapt base event template budget allocations to fit specific city market conditions, guest counts, cultural expectations, and host priorities.

CORE ARCHITECTURE RULE:
- Code enforces deterministic sums, percentages, and rebalancing.
- You supply strategic category distribution weights and crisp one-line reasoning based on real market costs and RAG references.
- Categories should include: Venue & Facilities, Catering & Beverages, Decor & Floral Design, Photography & Video, Music, DJ & Entertainment, Attire, Hair & Makeup, Invitations & Stationery, Transport & Logistics, Rituals/Miscellaneous, and Contingency Fund (5-10%).
- Ensure the sum of percentages equals exactly 100%.`;

export const BUDGET_USER_PROMPT_TEMPLATE = (profile: any, template: any, ragContext: string) => `
Event Profile:
- Type: ${profile.type}
- Title: ${profile.title}
- City: ${profile.city}
- Guests: ${profile.guest_count}
- Total Budget: ${profile.currency} ${profile.total_budget}
- Priorities: ${profile.priorities?.join(", ") || "Standard"}
- Dietary Mix: ${profile.dietary_mix || "Standard"}
- Culture / Vibe: ${profile.culture_tradition || ""} | ${profile.vibe_theme || ""}

Base Template Defaults:
${JSON.stringify(template.default_budget_split, null, 2)}

Market Reference Data (RAG):
${ragContext}

Generate adapted budget allocations. Provide:
1. Category name
2. Recommended percentage (numbers summing to 100)
3. Concise, compelling reasoning mentioning why this proportion fits ${profile.city} with ${profile.guest_count} guests and priorities.`;
