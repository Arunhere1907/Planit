import { describe, it, expect } from 'vitest';
import {
  calculateBudgetSplitFromPercents,
  rebalanceBudgetCategories,
  calculateBackwardsDueDates,
  checkBudgetSanity,
  validateBudgetTotals,
} from '../src/shared/utils/deterministic-math.js';
import { BudgetCategory } from '../src/shared/types/index.js';

describe('Deterministic Math & Budget Engine', () => {
  it('calculates category amounts that exactly sum to total budget without rounding loss', () => {
    const totalBudget = 800000;
    const categories = [
      { name: 'Venue', percent: 30.0, reasoning: 'Venue rental' },
      { name: 'Catering', percent: 32.5, reasoning: 'Food' },
      { name: 'Decor', percent: 12.3, reasoning: 'Decor' },
      { name: 'Photography', percent: 9.7, reasoning: 'Photo' },
      { name: 'Contingency Fund', percent: 15.5, reasoning: 'Reserve' },
    ];

    const result = calculateBudgetSplitFromPercents(totalBudget, categories);
    const sum = result.reduce((acc, c) => acc + c.amount, 0);

    expect(sum).toBe(totalBudget);
    expect(result.length).toBe(categories.length);
  });

  it('rebalances unlocked categories while strictly preserving locked categories', () => {
    const totalBudget = 500000;
    const initialCategories: BudgetCategory[] = [
      {
        id: 'cat-1',
        name: 'Venue',
        percent: 30,
        amount: 150000,
        reasoning: 'Hall',
        is_locked: true,
        source: 'user',
        edited_at: '2026-10-24T00:00:00Z',
      },
      {
        id: 'cat-2',
        name: 'Catering',
        percent: 40,
        amount: 200000,
        reasoning: 'Dinner',
        is_locked: false,
        source: 'ai',
        edited_at: '2026-10-24T00:00:00Z',
      },
      {
        id: 'cat-3',
        name: 'Decor',
        percent: 30,
        amount: 150000,
        reasoning: 'Flowers',
        is_locked: false,
        source: 'ai',
        edited_at: '2026-10-24T00:00:00Z',
      },
    ];

    // User increases Catering from 200k to 250k
    const rebalanced = rebalanceBudgetCategories(totalBudget, initialCategories, 'cat-2', 250000);

    // Locked venue should remain exactly 150,000
    const venue = rebalanced.find((c) => c.id === 'cat-1');
    expect(venue?.amount).toBe(150000);

    // Edited catering should be 250,000
    const catering = rebalanced.find((c) => c.id === 'cat-2');
    expect(catering?.amount).toBe(250000);

    // Decor must have absorbed the remaining difference (500k - 150k - 250k = 100k)
    const decor = rebalanced.find((c) => c.id === 'cat-3');
    expect(decor?.amount).toBe(100000);

    // Total must still equal totalBudget
    const sum = rebalanced.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(totalBudget);
  });

  it('validates budget totals correctly with tolerance for minor integer delta', () => {
    const validBudget = {
      total_budget: 100000,
      categories: [
        { id: '1', name: 'A', percent: 50, amount: 50000, reasoning: '', source: 'ai' as const, edited_at: '' },
        { id: '2', name: 'B', percent: 50, amount: 50000, reasoning: '', source: 'ai' as const, edited_at: '' },
      ],
    };
    expect(validateBudgetTotals(validBudget).isValid).toBe(true);

    const invalidBudget = {
      total_budget: 100000,
      categories: [
        { id: '1', name: 'A', percent: 50, amount: 40000, reasoning: '', source: 'ai' as const, edited_at: '' },
        { id: '2', name: 'B', percent: 50, amount: 40000, reasoning: '', source: 'ai' as const, edited_at: '' },
      ],
    };
    expect(validateBudgetTotals(invalidBudget).isValid).toBe(false);
  });

  it('computes backwards due dates without placing any milestone after the event date', () => {
    const eventDate = '2026-12-18';
    const tasks = [
      {
        title: 'Book Venue',
        role: 'Host',
        priority: 'high' as const,
        phase: '6+ months' as const,
        offset_days: 180,
        linked_vendor: 'Venue',
      },
      {
        title: 'Sound Check',
        role: 'DJ',
        priority: 'medium' as const,
        phase: '1 week' as const,
        offset_days: 7,
        linked_vendor: 'Music',
      },
      {
        title: 'Stage Handover',
        role: 'Lead',
        priority: 'high' as const,
        phase: 'Day-of' as const,
        offset_days: 0,
        linked_vendor: 'Stage',
      },
    ];

    const computed = calculateBackwardsDueDates(eventDate, tasks);
    expect(computed.length).toBe(3);

    for (const task of computed) {
      expect(new Date(task.due_date).getTime()).toBeLessThanOrEqual(new Date(eventDate).getTime());
    }
  });

  it('provides sensible budget benchmarks based on city and event type', () => {
    const weddingSanity = checkBudgetSanity(800000, 200, 'wedding', 'Ahmedabad');
    expect(weddingSanity.perGuest).toBe(4000);
    expect(weddingSanity.isSane).toBe(true);

    const leanSanity = checkBudgetSanity(50000, 200, 'wedding', 'Mumbai');
    expect(leanSanity.isSane).toBe(false);
    expect(leanSanity.feedback).toContain('lean');
  });
});
