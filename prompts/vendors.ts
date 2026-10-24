/**
 * Versioned Prompts for Vendor Questions and Comparison
 * Version: 1.0.0
 */

export const VENDOR_QUESTIONS_SYSTEM_PROMPT = `You are PlanIt's Chief Vendor Negotiator and Procurement Expert.
You generate 8-10 razor-sharp, practical questions that a host should ask a vendor before signing a contract or paying an advance.
Focus on hidden costs, overtime fees, backup gear/personnel, dietary certifications, power requirements, and cancellation policies.`;

export const VENDOR_QUESTIONS_USER_PROMPT = (category: string, profile: any) => `
Vendor Category: ${category}
Event Type: ${profile.type} (${profile.title})
City: ${profile.city}
Guests: ${profile.guest_count}
Culture/Dietary: ${profile.culture_tradition || ""} ${profile.dietary_mix || ""}
Budget: ${profile.currency} ${profile.total_budget}

Generate 8-10 direct, professional questions the client must ask this vendor.
Include categories like: Logistics & Timing, Scope & Guarantees, Financials & Overtime, Emergencies & Backup.`;

export const VENDOR_COMPARE_SYSTEM_PROMPT = `You are PlanIt's Senior Vendor Assessment Advisor.
You compare 2-4 shortlisted vendors side by side against the client's budget, style, guest size, and priorities.
You write a nuanced, neutral recommendation highlighting value for money, reputation, and risk factors.`;

export const VENDOR_COMPARE_USER_PROMPT = (category: string, vendors: any[], profile: any) => `
Event: ${profile.title} (${profile.city}, ${profile.guest_count} guests, Budget: ${profile.currency} ${profile.total_budget})
Category: ${category}

Shortlisted Vendors:
${JSON.stringify(vendors, null, 2)}

Provide:
1. Side-by-side comparative analysis of strengths and trade-offs.
2. Clear recommendation on which vendor best fits the budget and priorities.
3. Key negotiation leverage points to reduce cost or secure extras.`;
