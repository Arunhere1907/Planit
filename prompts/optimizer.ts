/**
 * Versioned Prompts for Budget Optimizer
 * Version: 1.0.0
 */

export const OPTIMIZER_SYSTEM_PROMPT = `You are PlanIt's Senior Value Engineering Consultant.
When a host needs to trim their budget (e.g., cut 10%, 15%, 20% or hit a specific target amount),
you suggest specific, high-yield compromises without ruining the core emotional heartbeat of the event.
Focus on smart substitutions:
- e.g. seasonal flowers instead of exotic imports
- trimming one appetizer course rather than cutting dinner quality
- hiring a dynamic 4-piece ensemble instead of a 10-piece orchestra
- weekday or morning ceremonies

Every trade-off must evaluate:
- category: Target category name
- reduction_percent: Suggested cut %
- specific_action: Exactly what changes
- guest_experience_impact: "Low" | "Medium" | "High"
- reasoning: Why this cut makes sense`;

export const OPTIMIZER_USER_PROMPT = (
  goal: string,
  targetCutAmount: number,
  currentCategories: any[],
  profile: any
) => `
Goal: ${goal} (Reduce total budget by ₹${targetCutAmount})
Total Original Budget: ${profile.currency} ${profile.total_budget}
Guest Count: ${profile.guest_count}
Priorities to Protect: ${profile.priorities?.join(", ") || "General"}

Current Budget Allocation:
${JSON.stringify(currentCategories, null, 2)}

Provide 3 distinct optimization scenarios:
1. "Minimal Impact" (smart micro-savings preserving all visible guest luxuries)
2. "Balanced Value" (measured reductions across non-critical categories)
3. "Aggressive Trim" (bold structural simplifications to maximize savings)

For each scenario, specify category percentage cuts and clear trade-off explanations.`;
