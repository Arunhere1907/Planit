import { z } from "zod";

// 1. Intake Profile Schema
export const EventProfileSchema = z.object({
  type: z.enum(["wedding", "birthday", "community", "general"]).default("wedding"),
  title: z.string().min(1, "Title is required").default("Celebration Event"),
  date: z.string().default("2026-12-18"),
  city: z.string().min(1, "City is required").default("Ahmedabad"),
  guest_count: z.number().int().positive("Guests must be positive").default(100),
  total_budget: z.number().positive("Budget must be positive").default(500000),
  currency: z.string().default("INR"),
  vibe_theme: z.string().default("Festive & Elegant"),
  culture_tradition: z.string().default("Traditional"),
  dietary_mix: z.string().default("Vegetarian"),
  indoor_outdoor: z.enum(["indoor", "outdoor", "hybrid"]).default("outdoor"),
  priorities: z.array(z.string()).default([]),
  constraints: z.string().default(""),
});

export const IntakeResponseSchema = z.object({
  profile: EventProfileSchema,
  follow_up_questions: z.array(z.string()).max(3).default([]),
  ai_summary: z.string().default(""),
});

// 2. Budget Generation Schema
export const BudgetCategoryItemSchema = z.object({
  name: z.string(),
  percent: z.number().min(0).max(100),
  reasoning: z.string(),
});

export const BudgetResponseSchema = z.object({
  categories: z.array(BudgetCategoryItemSchema).min(3),
  strategic_notes: z.string().optional(),
});

// 3. Timeline Task Schema
export const TimelineTaskItemSchema = z.object({
  title: z.string(),
  role: z.string(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  phase: z.enum(["6+ months", "3 months", "1 month", "1 week", "Day before", "Day-of"]).default("1 month"),
  offset_days: z.number().int().min(0).default(30),
  linked_vendor: z.string().default("General"),
  notes: z.string().default(""),
});

export const RunOfShowItemSchema = z.object({
  time: z.string(),
  title: z.string(),
  owner: z.string(),
  location: z.string(),
  notes: z.string(),
});

export const TimelineResponseSchema = z.object({
  tasks: z.array(TimelineTaskItemSchema).min(3),
  run_of_show: z.array(RunOfShowItemSchema).min(3),
});

// 4. Vendor Questions Schema
export const VendorQuestionsResponseSchema = z.object({
  questions: z.array(
    z.object({
      category: z.string(),
      question: z.string(),
      why_it_matters: z.string(),
    })
  ).min(5).max(12),
});

// 5. Vendor Comparison Schema
export const VendorCompareResponseSchema = z.object({
  comparison_table: z.array(
    z.object({
      vendor_name: z.string(),
      estimated_price: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      score: z.number().min(1).max(10),
    })
  ),
  overall_recommendation: z.string(),
  negotiation_leverage: z.string(),
});

// 6. Ideas Schema
export const IdeaItemSchema = z.object({
  category: z.string(),
  title: z.string(),
  description: z.string(),
  cost_range: z.string(),
  effort_level: z.enum(["Low", "Medium", "High"]),
  tags: z.array(z.string()),
});

export const IdeasResponseSchema = z.object({
  ideas: z.array(IdeaItemSchema).min(3),
});

// 7. Invitations Schema
export const InvitationVariantSchema = z.object({
  title: z.string(),
  tone: z.string(),
  content: z.string(),
});

export const InvitationsResponseSchema = z.object({
  variants: z.array(InvitationVariantSchema).min(1),
});

// 8. Risks Schema
export const RiskItemSchema = z.object({
  title: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  likelihood: z.enum(["high", "medium", "low"]),
  category: z.enum(["Weather", "Permits & Legal", "Food & Safety", "Timeline", "Financial", "General"]),
  why: z.string(),
  mitigation: z.string(),
  backup_plan: z.string(),
});

export const RisksResponseSchema = z.object({
  risks: z.array(RiskItemSchema).min(2),
  sanity_check_passed: z.boolean().default(true),
  sanity_notes: z.string().optional(),
});

// 9. Optimizer Scenario Schema
export const OptimizerScenarioSchema = z.object({
  name: z.string(),
  description: z.string(),
  total_savings: z.number(),
  experience_impact: z.enum(["Low", "Medium", "High"]),
  proposed_cuts: z.array(
    z.object({
      category_name: z.string(),
      cut_percent: z.number(),
      specific_action: z.string(),
    })
  ),
});

export const OptimizerResponseSchema = z.object({
  scenarios: z.array(OptimizerScenarioSchema).min(2),
});

// 10. Daily Digest Schema
export const DigestResponseSchema = z.object({
  greeting: z.string(),
  summary_message: z.string(),
  urgent_actions: z.array(z.string()),
  motivational_tip: z.string(),
});
