/**
 * AI Response Validator
 *
 * Validates and sanitizes LLM outputs before they're used in the application.
 * Ensures AI responses conform to expected structure and business rules.
 */

import { logger } from '../../utils/logger.js';

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
}

export class AIResponseValidator {
  /**
   * Validates budget category response structure
   */
  public validateBudgetCategories(data: unknown): ValidationResult<{
    categories: Array<{ name: string; percent: number; reasoning: string }>;
    strategic_notes?: string;
  }> {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
      return { isValid: false, errors: ['Response must be an object'] };
    }

    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj.categories)) {
      return { isValid: false, errors: ['categories must be an array'] };
    }

    if (obj.categories.length === 0) {
      return { isValid: false, errors: ['categories array cannot be empty'] };
    }

    const categories = obj.categories
      .map((cat: unknown, idx: number) => {
        if (typeof cat !== 'object' || cat === null) {
          errors.push(`Category ${idx} must be an object`);
          return null;
        }

        const c = cat as Record<string, unknown>;

        if (typeof c.name !== 'string' || c.name.trim().length === 0) {
          errors.push(`Category ${idx} must have a non-empty name`);
        }

        if (typeof c.percent !== 'number' || c.percent < 0 || c.percent > 100) {
          errors.push(`Category ${idx} percent must be between 0 and 100`);
        }

        if (typeof c.reasoning !== 'string') {
          errors.push(`Category ${idx} must have a reasoning string`);
        }

        return {
          name: String(c.name || 'Category'),
          percent: Number(c.percent || 10),
          reasoning: String(c.reasoning || 'Budget allocation'),
        };
      })
      .filter(Boolean);

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Validate percentages sum reasonably
    const totalPercent = categories.reduce((sum, cat) => sum + (cat?.percent || 0), 0);
    if (totalPercent < 80 || totalPercent > 120) {
      errors.push(`Total percentages (${totalPercent}%) should be close to 100%`);
    }

    return {
      isValid: errors.length === 0,
      data: {
        categories: categories as Array<{ name: string; percent: number; reasoning: string }>,
        strategic_notes: typeof obj.strategic_notes === 'string' ? obj.strategic_notes : undefined,
      },
      errors,
    };
  }

  /**
   * Validates timeline task response structure
   */
  public validateTimelineTasks(data: unknown): ValidationResult<{
    tasks: Array<{
      title: string;
      role: string;
      priority: 'high' | 'medium' | 'low';
      phase: '6+ months' | '3 months' | '1 month' | '1 week' | 'Day before' | 'Day-of';
      offset_days: number;
      linked_vendor: string;
      notes?: string;
    }>;
  }> {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
      return { isValid: false, errors: ['Response must be an object'] };
    }

    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj.tasks)) {
      return { isValid: false, errors: ['tasks must be an array'] };
    }

    if (obj.tasks.length === 0) {
      return { isValid: false, errors: ['tasks array cannot be empty'] };
    }

    const tasks = obj.tasks
      .map((task: unknown, idx: number) => {
        if (typeof task !== 'object' || task === null) {
          errors.push(`Task ${idx} must be an object`);
          return null;
        }

        const t = task as Record<string, unknown>;

        if (typeof t.title !== 'string' || t.title.trim().length === 0) {
          errors.push(`Task ${idx} must have a non-empty title`);
        }

        const priority = t.priority as string;
        if (!['high', 'medium', 'low'].includes(priority)) {
          errors.push(`Task ${idx} priority must be high, medium, or low`);
        }

        if (typeof t.offset_days !== 'number' || t.offset_days < 0) {
          errors.push(`Task ${idx} offset_days must be a non-negative number`);
        }

        return {
          title: String(t.title || 'Task'),
          role: String(t.role || t.assignee || 'Organizer'),
          priority: (['high', 'medium', 'low'].includes(priority) ? priority : 'medium') as
            'high' | 'medium' | 'low',
          phase:
            (t.phase as
              '6+ months' | '3 months' | '1 month' | '1 week' | 'Day before' | 'Day-of') ||
            '1 month',
          offset_days: Number(t.offset_days || 30),
          linked_vendor: String(t.linked_vendor || 'General'),
          notes: typeof t.notes === 'string' ? t.notes : undefined,
        };
      })
      .filter(Boolean);

    if (errors.length > 0) {
      logger.warn('Timeline task validation errors', { errors });
    }

    return {
      isValid: errors.length === 0,
      data: {
        tasks: tasks as Array<{
          title: string;
          role: string;
          priority: 'high' | 'medium' | 'low';
          phase: '6+ months' | '3 months' | '1 month' | '1 week' | 'Day before' | 'Day-of';
          offset_days: number;
          linked_vendor: string;
          notes?: string;
        }>,
      },
      errors,
    };
  }

  /**
   * Validates ideas response structure
   */
  public validateIdeas(data: unknown): ValidationResult<{
    ideas: Array<{
      category: string;
      title: string;
      description: string;
      cost_range: string;
      effort_level: 'Low' | 'Medium' | 'High';
      tags: string[];
      saved: boolean;
    }>;
  }> {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
      return { isValid: false, errors: ['Response must be an object'] };
    }

    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj.ideas)) {
      return { isValid: false, errors: ['ideas must be an array'] };
    }

    const ideas = obj.ideas
      .map((idea: unknown, idx: number) => {
        if (typeof idea !== 'object' || idea === null) {
          errors.push(`Idea ${idx} must be an object`);
          return null;
        }

        const i = idea as Record<string, unknown>;

        const effortLevel = i.effort_level as string;
        if (!['Low', 'Medium', 'High'].includes(effortLevel)) {
          errors.push(`Idea ${idx} effort_level must be Low, Medium, or High`);
        }

        return {
          category: String(i.category || 'Decor & Ambiance'),
          title: String(i.title || 'Creative Touch'),
          description: String(i.description || ''),
          cost_range: String(i.cost_range || '₹10,000 - ₹25,000'),
          effort_level: (['Low', 'Medium', 'High'].includes(effortLevel)
            ? effortLevel
            : 'Medium') as 'Low' | 'Medium' | 'High',
          tags: Array.isArray(i.tags) ? i.tags.map(String) : ['Creative', 'Personalized'],
          saved: Boolean(i.saved),
        };
      })
      .filter(Boolean);

    return {
      isValid: errors.length === 0,
      data: {
        ideas: ideas as Array<{
          category: string;
          title: string;
          description: string;
          cost_range: string;
          effort_level: 'Low' | 'Medium' | 'High';
          tags: string[];
          saved: boolean;
        }>,
      },
      errors,
    };
  }

  /**
   * Validates risk assessment response structure
   */
  public validateRisks(data: unknown): ValidationResult<{
    risks: Array<{
      title: string;
      severity: 'high' | 'medium' | 'low';
      likelihood: 'high' | 'medium' | 'low';
      category: string;
      why: string;
      mitigation: string;
      backup_plan: string;
    }>;
  }> {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
      return { isValid: false, errors: ['Response must be an object'] };
    }

    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj.risks)) {
      return { isValid: false, errors: ['risks must be an array'] };
    }

    const risks = obj.risks
      .map((risk: unknown, idx: number) => {
        if (typeof risk !== 'object' || risk === null) {
          errors.push(`Risk ${idx} must be an object`);
          return null;
        }

        const r = risk as Record<string, unknown>;

        const severity = r.severity as string;
        const likelihood = r.likelihood as string;

        if (!['high', 'medium', 'low'].includes(severity)) {
          errors.push(`Risk ${idx} severity must be high, medium, or low`);
        }

        if (!['high', 'medium', 'low'].includes(likelihood)) {
          errors.push(`Risk ${idx} likelihood must be high, medium, or low`);
        }

        return {
          title: String(r.title || 'Operational Risk'),
          severity: (['high', 'medium', 'low'].includes(severity) ? severity : 'medium') as
            'high' | 'medium' | 'low',
          likelihood: (['high', 'medium', 'low'].includes(likelihood) ? likelihood : 'medium') as
            'high' | 'medium' | 'low',
          category: String(r.category || 'General'),
          why: String(r.why || r.preventiveMeasure || 'Event day contingency'),
          mitigation: String(
            r.mitigation || r.preventiveMeasure || 'Pre-event checkpoint inspection'
          ),
          backup_plan: String(r.backup_plan || r.contingencyPlan || 'Standby vendor on call'),
        };
      })
      .filter(Boolean);

    return {
      isValid: errors.length === 0,
      data: {
        risks: risks as Array<{
          title: string;
          severity: 'high' | 'medium' | 'low';
          likelihood: 'high' | 'medium' | 'low';
          category: string;
          why: string;
          mitigation: string;
          backup_plan: string;
        }>,
      },
      errors,
    };
  }

  /**
   * Generic JSON parse with error handling
   */
  public safeParseJSON<T = unknown>(raw: string): { success: boolean; data?: T; error?: string } {
    try {
      const parsed = JSON.parse(raw);
      return { success: true, data: parsed as T };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown parse error';
      logger.warn('JSON parse failed', { error: errorMsg, rawLength: raw.length });
      return { success: false, error: errorMsg };
    }
  }
}

export const aiResponseValidator = new AIResponseValidator();
