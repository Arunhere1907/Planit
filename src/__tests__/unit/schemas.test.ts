import { describe, it, expect } from 'vitest';
import {
  EventProfileSchema,
  BudgetResponseSchema,
  TimelineResponseSchema,
  IdeasResponseSchema,
  InvitationsResponseSchema,
  RisksResponseSchema,
  OptimizerResponseSchema,
  ExpenseItemSchema,
  EventMemberSchema,
  TimelineTaskSchema,
  EventVendorSchema,
} from '../../shared/schemas/zod-schemas.js';

describe('EventProfile Schema', () => {
  it('should validate complete valid profile', () => {
    const validProfile = {
      id: 'event-123',
      type: 'wedding' as const,
      title: 'My Wedding',
      date: '2026-12-18',
      city: 'Ahmedabad',
      guest_count: 200,
      total_budget: 800000,
      currency: 'INR',
      vibe_theme: 'Traditional',
      culture_tradition: 'Indian',
      dietary_mix: 'Vegetarian',
      indoor_outdoor: 'outdoor' as const,
      priorities: ['venue', 'food'],
      constraints: 'None',
    };

    const result = EventProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it('should reject invalid event type', () => {
    const invalid = {
      type: 'invalid-type',
      title: 'Event',
      city: 'City',
      guest_count: 100,
      total_budget: 100000,
    };

    const result = EventProfileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject negative guest count', () => {
    const invalid = {
      type: 'wedding',
      title: 'Event',
      city: 'City',
      guest_count: -10,
      total_budget: 100000,
    };

    const result = EventProfileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject negative budget', () => {
    const invalid = {
      type: 'wedding',
      title: 'Event',
      city: 'City',
      guest_count: 100,
      total_budget: -50000,
    };

    const result = EventProfileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should apply defaults for missing optional fields', () => {
    const minimal = {
      title: 'My Event',
      city: 'Mumbai',
      guest_count: 50,
      total_budget: 200000,
    };

    const result = EventProfileSchema.parse(minimal);

    expect(result.type).toBe('wedding'); // Default
    expect(result.currency).toBe('INR'); // Default
    expect(result.priorities).toEqual([]); // Default empty array
  });

  it('should reject empty title', () => {
    const invalid = {
      title: '',
      city: 'City',
      guest_count: 100,
      total_budget: 100000,
    };

    const result = EventProfileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject empty city', () => {
    const invalid = {
      title: 'Event',
      city: '',
      guest_count: 100,
      total_budget: 100000,
    };

    const result = EventProfileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept zero guest count as invalid', () => {
    const invalid = {
      title: 'Event',
      city: 'City',
      guest_count: 0,
      total_budget: 100000,
    };

    const result = EventProfileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Budget Response Schema', () => {
  it('should validate budget with minimum 3 categories', () => {
    const valid = {
      categories: [
        { name: 'Venue', percent: 30, reasoning: 'Main hall' },
        { name: 'Food', percent: 40, reasoning: 'Catering' },
        { name: 'Decor', percent: 30, reasoning: 'Decoration' },
      ],
    };

    const result = BudgetResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject less than 3 categories', () => {
    const invalid = {
      categories: [
        { name: 'Venue', percent: 50, reasoning: 'Main' },
        { name: 'Food', percent: 50, reasoning: 'Catering' },
      ],
    };

    const result = BudgetResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject percent > 100', () => {
    const invalid = {
      categories: [
        { name: 'Venue', percent: 150, reasoning: 'Invalid' },
        { name: 'Food', percent: 40, reasoning: 'Valid' },
        { name: 'Decor', percent: 30, reasoning: 'Valid' },
      ],
    };

    const result = BudgetResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject negative percent', () => {
    const invalid = {
      categories: [
        { name: 'Venue', percent: -10, reasoning: 'Invalid' },
        { name: 'Food', percent: 55, reasoning: 'Valid' },
        { name: 'Decor', percent: 55, reasoning: 'Valid' },
      ],
    };

    const result = BudgetResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept optional strategic_notes', () => {
    const valid = {
      categories: [
        { name: 'A', percent: 33, reasoning: 'R' },
        { name: 'B', percent: 33, reasoning: 'R' },
        { name: 'C', percent: 34, reasoning: 'R' },
      ],
      strategic_notes: 'Focus on vendor negotiation',
    };

    const result = BudgetResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.strategic_notes).toBe('Focus on vendor negotiation');
    }
  });
});

describe('Timeline Response Schema', () => {
  it('should validate timeline with minimum tasks and run_of_show', () => {
    const valid = {
      tasks: [
        { title: 'T1', role: 'Organizer', priority: 'high' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'V' },
        { title: 'T2', role: 'Host', priority: 'medium' as const, phase: '1 week' as const, offset_days: 7, linked_vendor: 'V' },
        { title: 'T3', role: 'Lead', priority: 'low' as const, phase: 'Day-of' as const, offset_days: 0, linked_vendor: 'V' },
      ],
      run_of_show: [
        { time: '10:00 AM', title: 'Event 1', owner: 'Host', location: 'Hall', notes: 'Notes' },
        { time: '12:00 PM', title: 'Event 2', owner: 'Host', location: 'Hall', notes: 'Notes' },
        { time: '02:00 PM', title: 'Event 3', owner: 'Host', location: 'Hall', notes: 'Notes' },
      ],
    };

    const result = TimelineResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject less than 3 tasks', () => {
    const invalid = {
      tasks: [
        { title: 'T1', role: 'O', priority: 'high' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'V' },
        { title: 'T2', role: 'O', priority: 'high' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'V' },
      ],
      run_of_show: [
        { time: '10:00', title: 'E1', owner: 'H', location: 'L', notes: 'N' },
        { time: '11:00', title: 'E2', owner: 'H', location: 'L', notes: 'N' },
        { time: '12:00', title: 'E3', owner: 'H', location: 'L', notes: 'N' },
      ],
    };

    const result = TimelineResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject less than 3 run_of_show items', () => {
    const invalid = {
      tasks: [
        { title: 'T1', role: 'O', priority: 'high' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'V' },
        { title: 'T2', role: 'O', priority: 'high' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'V' },
        { title: 'T3', role: 'O', priority: 'high' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'V' },
      ],
      run_of_show: [
        { time: '10:00', title: 'E1', owner: 'H', location: 'L', notes: 'N' },
        { time: '11:00', title: 'E2', owner: 'H', location: 'L', notes: 'N' },
      ],
    };

    const result = TimelineResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid priority', () => {
    const invalid = {
      tasks: [
        { title: 'T1', role: 'O', priority: 'urgent' as any, phase: '1 month' as const, offset_days: 30, linked_vendor: 'V' },
        { title: 'T2', role: 'O', priority: 'high' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'V' },
        { title: 'T3', role: 'O', priority: 'high' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'V' },
      ],
      run_of_show: [
        { time: '10:00', title: 'E', owner: 'H', location: 'L', notes: 'N' },
        { time: '11:00', title: 'E', owner: 'H', location: 'L', notes: 'N' },
        { time: '12:00', title: 'E', owner: 'H', location: 'L', notes: 'N' },
      ],
    };

    const result = TimelineResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid phase', () => {
    const invalid = {
      tasks: [
        { title: 'T1', role: 'O', priority: 'high' as const, phase: 'next year' as any, offset_days: 30, linked_vendor: 'V' },
        { title: 'T2', role: 'O', priority: 'high' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'V' },
        { title: 'T3', role: 'O', priority: 'high' as const, phase: '1 month' as const, offset_days: 30, linked_vendor: 'V' },
      ],
      run_of_show: [
        { time: '10:00', title: 'E', owner: 'H', location: 'L', notes: 'N' },
        { time: '11:00', title: 'E', owner: 'H', location: 'L', notes: 'N' },
        { time: '12:00', title: 'E', owner: 'H', location: 'L', notes: 'N' },
      ],
    };

    const result = TimelineResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Ideas Response Schema', () => {
  it('should validate with minimum 3 ideas', () => {
    const valid = {
      ideas: [
        { category: 'Decor', title: 'Idea 1', description: 'Desc', cost_range: '₹10k-20k', effort_level: 'Low' as const, tags: ['tag1'] },
        { category: 'Food', title: 'Idea 2', description: 'Desc', cost_range: '₹5k-10k', effort_level: 'Medium' as const, tags: ['tag2'] },
        { category: 'Music', title: 'Idea 3', description: 'Desc', cost_range: '₹20k-30k', effort_level: 'High' as const, tags: ['tag3'] },
      ],
    };

    const result = IdeasResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject less than 3 ideas', () => {
    const invalid = {
      ideas: [
        { category: 'Decor', title: 'Idea 1', description: 'Desc', cost_range: '₹10k', effort_level: 'Low' as const, tags: [] },
        { category: 'Food', title: 'Idea 2', description: 'Desc', cost_range: '₹10k', effort_level: 'Low' as const, tags: [] },
      ],
    };

    const result = IdeasResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid effort_level', () => {
    const invalid = {
      ideas: [
        { category: 'Decor', title: 'I1', description: 'D', cost_range: 'C', effort_level: 'Very High' as any, tags: [] },
        { category: 'Food', title: 'I2', description: 'D', cost_range: 'C', effort_level: 'Low' as const, tags: [] },
        { category: 'Music', title: 'I3', description: 'D', cost_range: 'C', effort_level: 'Low' as const, tags: [] },
      ],
    };

    const result = IdeasResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Risks Response Schema', () => {
  it('should validate with minimum 2 risks', () => {
    const valid = {
      risks: [
        {
          title: 'Risk 1',
          severity: 'high' as const,
          likelihood: 'medium' as const,
          category: 'Weather' as const,
          why: 'Reason',
          mitigation: 'Plan',
          backup_plan: 'Backup',
        },
        {
          title: 'Risk 2',
          severity: 'low' as const,
          likelihood: 'low' as const,
          category: 'Financial' as const,
          why: 'Reason',
          mitigation: 'Plan',
          backup_plan: 'Backup',
        },
      ],
      sanity_check_passed: true,
    };

    const result = RisksResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject less than 2 risks', () => {
    const invalid = {
      risks: [
        {
          title: 'Risk 1',
          severity: 'high' as const,
          likelihood: 'medium' as const,
          category: 'Weather' as const,
          why: 'Reason',
          mitigation: 'Plan',
          backup_plan: 'Backup',
        },
      ],
    };

    const result = RisksResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid category', () => {
    const invalid = {
      risks: [
        { title: 'R1', severity: 'high' as const, likelihood: 'high' as const, category: 'Unknown' as any, why: 'W', mitigation: 'M', backup_plan: 'B' },
        { title: 'R2', severity: 'low' as const, likelihood: 'low' as const, category: 'Weather' as const, why: 'W', mitigation: 'M', backup_plan: 'B' },
      ],
    };

    const result = RisksResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Optimizer Response Schema', () => {
  it('should validate with minimum 2 scenarios', () => {
    const valid = {
      scenarios: [
        {
          name: 'Scenario 1',
          description: 'Desc',
          total_savings: 50000,
          experience_impact: 'Low' as const,
          proposed_cuts: [
            { category_name: 'Decor', cut_percent: 20, specific_action: 'DIY' },
          ],
        },
        {
          name: 'Scenario 2',
          description: 'Desc',
          total_savings: 100000,
          experience_impact: 'Medium' as const,
          proposed_cuts: [
            { category_name: 'Venue', cut_percent: 30, specific_action: 'Smaller venue' },
          ],
        },
      ],
    };

    const result = OptimizerResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject less than 2 scenarios', () => {
    const invalid = {
      scenarios: [
        {
          name: 'Scenario 1',
          description: 'Desc',
          total_savings: 50000,
          experience_impact: 'Low' as const,
          proposed_cuts: [],
        },
      ],
    };

    const result = OptimizerResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Expense Item Schema', () => {
  it('should validate valid expense', () => {
    const valid = {
      category_name: 'Catering',
      vendor_name: 'ABC Caterers',
      amount: 50000,
      status: 'paid' as const,
    };

    const result = ExpenseItemSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject negative amount', () => {
    const invalid = {
      category_name: 'Catering',
      vendor_name: 'ABC',
      amount: -1000,
      status: 'paid' as const,
    };

    const result = ExpenseItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should apply defaults', () => {
    const minimal = {
      amount: 5000,
    };

    const result = ExpenseItemSchema.parse(minimal);

    expect(result.id).toMatch(/^exp_/);
    expect(result.category_name).toBe('General');
    expect(result.vendor_name).toBe('Vendor');
    expect(result.status).toBe('paid');
  });
});

describe('Event Member Schema', () => {
  it('should validate member with email', () => {
    const valid = {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'editor' as const,
    };

    const result = EventMemberSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid role', () => {
    const invalid = {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin' as any,
    };

    const result = EventMemberSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept string for email (flexible validation)', () => {
    const valid = {
      name: 'John Doe',
      email: 'not-an-email',
      role: 'viewer' as const,
    };

    const result = EventMemberSchema.safeParse(valid);
    // Should succeed because .or(z.string()) allows any string
    expect(result.success).toBe(true);
  });
});

describe('Vendor Schema', () => {
  it('should validate complete vendor', () => {
    const valid = {
      name: 'ABC Vendors',
      category: 'Catering',
      contact: '9876543210',
      quote: 50000,
      advance_paid: 10000,
      balance: 40000,
      due_date: '2026-12-01',
      status: 'booked' as const,
    };

    const result = EventVendorSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject negative quote', () => {
    const invalid = {
      name: 'Vendor',
      quote: -5000,
    };

    const result = EventVendorSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should apply defaults', () => {
    const minimal = {
      name: 'My Vendor',
    };

    const result = EventVendorSchema.parse(minimal);

    expect(result.id).toMatch(/^vendor_/);
    expect(result.category).toBe('General');
    expect(result.quote).toBe(0);
    expect(result.status).toBe('contacted');
  });
});

describe('Schema Unknown Fields', () => {
  it('should strip unknown fields from EventProfile', () => {
    const input = {
      title: 'Event',
      city: 'City',
      guest_count: 100,
      total_budget: 100000,
      unknown_field: 'should be stripped',
    };

    const result = EventProfileSchema.parse(input);

    expect('unknown_field' in result).toBe(false);
  });

  it('should strip unknown fields from Budget', () => {
    const input = {
      categories: [
        { name: 'A', percent: 33, reasoning: 'R' },
        { name: 'B', percent: 33, reasoning: 'R' },
        { name: 'C', percent: 34, reasoning: 'R' },
      ],
      extra_field: 'not allowed',
    };

    const result = BudgetResponseSchema.parse(input);

    expect('extra_field' in result).toBe(false);
  });
});
