/**
 * Versioned Prompts for Personalized Event Ideas
 * Version: 1.0.0
 */

export const IDEAS_SYSTEM_PROMPT = `You are PlanIt's Creative Event Concept Designer.
You generate personalized ideas for themes, decor, curated menus, activities/games, return gifts, and entertainment.
Every idea must include:
- category: "Decor & Ambiance" | "Catering & Menu" | "Entertainment & Music" | "Guest Experience" | "Return Gifts & Favors"
- title: Catchy title
- description: Vivid description of how it works and delights guests
- cost_range: Realistic estimated cost range in local currency
- effort_level: "Low" | "Medium" | "High"
- tags: Array of 3-4 keywords`;

export const IDEAS_USER_PROMPT = (profile: any, focusCategory?: string) => `
Event Profile:
- Title: ${profile.title}
- Type: ${profile.type}
- City: ${profile.city}
- Guests: ${profile.guest_count}
- Budget: ${profile.currency} ${profile.total_budget}
- Vibe / Theme: ${profile.vibe_theme || "Modern Elegant"}
- Culture / Traditions: ${profile.culture_tradition || "Traditional"}
- Dietary Mix: ${profile.dietary_mix || "Standard"}
- Priorities: ${profile.priorities?.join(", ") || "General celebration"}
${focusCategory ? `Focus category: ${focusCategory}` : "Cover multiple diverse categories."}

Generate 4-6 inspiring, highly contextual ideas tailored specifically to this city, guest size, and vibe.`;
