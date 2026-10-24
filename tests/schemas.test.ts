import { describe, it, expect } from 'vitest';
import {
  EventProfileSchema,
  ExpenseItemSchema,
  TimelineTaskSchema,
  EventVendorSchema,
  RiskItemSchema,
} from '../src/shared/schemas/zod-schemas.js';

describe('Zod Validation Schemas', () => {
  it('validates a valid EventProfile and applies sensible defaults', () => {
    const raw = {
      title: 'Diya Wedding',
      city: 'Ahmedabad',
      guest_count: 200,
      total_budget: 800000,
    };

    const parsed = EventProfileSchema.parse(raw);
    expect(parsed.title).toBe('Diya Wedding');
    expect(parsed.currency).toBe('INR');
    expect(parsed.type).toBe('wedding');
    expect(parsed.indoor_outdoor).toBe('outdoor');
    expect(parsed.id).toBeDefined();
  });

  it('rejects an invalid EventProfile with negative budget or missing title', () => {
    const invalid = {
      title: '',
      city: 'Ahmedabad',
      total_budget: -100,
    };

    const result = EventProfileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates ExpenseItem and enforces non-negative amounts', () => {
    const validExpense = {
      amount: 15000,
      category_name: 'Decor',
      vendor_name: 'Floral Art',
    };
    expect(ExpenseItemSchema.safeParse(validExpense).success).toBe(true);

    const negativeExpense = {
      amount: -500,
      category_name: 'Decor',
    };
    expect(ExpenseItemSchema.safeParse(negativeExpense).success).toBe(false);
  });

  it('validates TimelineTaskSchema and RiskItemSchema correctly', () => {
    const validTask = {
      title: 'Pay catering token',
      due_date: '2026-11-15',
    };
    expect(TimelineTaskSchema.safeParse(validTask).success).toBe(true);

    const validRisk = {
      title: 'Rain during dinner',
      severity: 'high' as const,
      likelihood: 'medium' as const,
      category: 'Weather' as const,
      why: 'Open lawn in winter evening',
      mitigation: 'Canopy on standby',
      backup_plan: 'Move buffet under covered gazebo',
    };
    expect(RiskItemSchema.safeParse(validRisk).success).toBe(true);
  });
});
