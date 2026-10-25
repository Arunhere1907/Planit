import { describe, it, expect } from 'vitest';
import {
  calculateBudgetSplitFromPercents,
  rebalanceBudgetCategories,
  validateBudgetTotals,
  calculateDefaultBudget,
  checkBudgetSanity,
} from '../../shared/utils/deterministic-math.js';
import type { BudgetCategory } from '../../shared/types/index.js';

describe('Budget Split from Percentages', () => {
  it('should split budget so sum equals total exactly', () => {
    const totalBudget = 800000;
    const categories = [
      { name: 'Venue', percent: 30, reasoning: 'Main hall' },
      { name: 'Catering', percent: 35, reasoning: 'Food' },
      { name: 'Decor', percent: 20, reasoning: 'Flowers' },
      { name: 'Photography', percent: 15, reasoning: 'Photos' },
    ];

    const result = calculateBudgetSplitFromPercents(totalBudget, categories);

    const sum = result.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(totalBudget);
  });

  it('should handle zero budget', () => {
    const result = calculateBudgetSplitFromPercents(0, [
      { name: 'Venue', percent: 50, reasoning: 'Test' },
      { name: 'Food', percent: 50, reasoning: 'Test' },
    ]);

    const sum = result.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(0);
    expect(result).toHaveLength(2);
  });

  it('should handle single category', () => {
    const totalBudget = 100000;
    const result = calculateBudgetSplitFromPercents(totalBudget, [
      { name: 'All-in-one', percent: 100, reasoning: 'Everything' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(totalBudget);
  });

  it('should normalize percentages that do not sum to 100', () => {
    const totalBudget = 100000;
    const categories = [
      { name: 'A', percent: 20, reasoning: 'test' },
      { name: 'B', percent: 30, reasoning: 'test' },
    ]; // Sum = 50, not 100

    const result = calculateBudgetSplitFromPercents(totalBudget, categories);

    // Should normalize to 40% and 60%
    const sum = result.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(totalBudget);
  });

  it('should handle rounding by adjusting contingency or first category', () => {
    const totalBudget = 1000001; // Odd number to force rounding
    const categories = [
      { name: 'Venue', percent: 33.33, reasoning: 'test' },
      { name: 'Food', percent: 33.33, reasoning: 'test' },
      { name: 'Contingency', percent: 33.34, reasoning: 'test' },
    ];

    const result = calculateBudgetSplitFromPercents(totalBudget, categories);
    const sum = result.reduce((acc, c) => acc + c.amount, 0);

    expect(sum).toBe(totalBudget);

    // Contingency should absorb rounding difference
    const contingency = result.find((c) => c.name === 'Contingency');
    expect(contingency).toBeDefined();
  });

  it('should handle empty categories array', () => {
    const result = calculateBudgetSplitFromPercents(100000, []);
    expect(result).toEqual([]);
  });

  it('should set all categories to locked=false and source=ai initially', () => {
    const result = calculateBudgetSplitFromPercents(100000, [
      { name: 'Venue', percent: 100, reasoning: 'test' },
    ]);

    expect(result[0].is_locked).toBe(false);
    expect(result[0].source).toBe('ai');
  });
});

describe('Budget Rebalancing with Locks', () => {
  const createCategory = (
    name: string,
    amount: number,
    isLocked = false
  ): BudgetCategory => ({
    id: `cat-${name}`,
    name,
    amount,
    percent: 0,
    reasoning: 'test',
    is_locked: isLocked,
    source: 'ai',
    edited_at: new Date().toISOString(),
  });

  it('should rebalance unlocked categories when one is edited', () => {
    const totalBudget = 100000;
    const categories = [
      createCategory('Venue', 30000),
      createCategory('Food', 40000),
      createCategory('Decor', 30000),
    ];

    // Edit Venue to 50000
    const result = rebalanceBudgetCategories(
      totalBudget,
      categories,
      'cat-Venue',
      50000
    );

    const sum = result.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(totalBudget);

    const venue = result.find((c) => c.name === 'Venue');
    expect(venue?.amount).toBe(50000);
    expect(venue?.source).toBe('user');
  });

  it('should preserve locked categories exactly', () => {
    const totalBudget = 100000;
    const categories = [
      createCategory('Venue', 30000, true), // Locked
      createCategory('Food', 40000),
      createCategory('Decor', 30000),
    ];

    // Edit Food
    const result = rebalanceBudgetCategories(
      totalBudget,
      categories,
      'cat-Food',
      60000
    );

    const venue = result.find((c) => c.name === 'Venue');
    expect(venue?.amount).toBe(30000); // Unchanged

    const sum = result.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(totalBudget);
  });

  it('should handle case where all other categories are locked', () => {
    const totalBudget = 100000;
    const categories = [
      createCategory('Venue', 30000, true),
      createCategory('Food', 40000, true),
      createCategory('Decor', 30000),
    ];

    // Edit Decor - it should get whatever is left
    const result = rebalanceBudgetCategories(
      totalBudget,
      categories,
      'cat-Decor',
      40000
    );

    const sum = result.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(110000); // Will exceed because locked cats consume 70k

    const venue = result.find((c) => c.name === 'Venue');
    const food = result.find((c) => c.name === 'Food');
    expect(venue?.amount).toBe(30000);
    expect(food?.amount).toBe(40000);
  });

  it('should handle zero new amount', () => {
    const totalBudget = 100000;
    const categories = [
      createCategory('Venue', 50000),
      createCategory('Food', 50000),
    ];

    const result = rebalanceBudgetCategories(
      totalBudget,
      categories,
      'cat-Venue',
      0
    );

    const sum = result.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(totalBudget);

    const venue = result.find((c) => c.name === 'Venue');
    expect(venue?.amount).toBe(0);

    const food = result.find((c) => c.name === 'Food');
    expect(food?.amount).toBe(100000); // Gets everything
  });

  it('should clamp negative amounts to zero', () => {
    const totalBudget = 100000;
    const categories = [createCategory('Venue', 50000)];

    const result = rebalanceBudgetCategories(
      totalBudget,
      categories,
      'cat-Venue',
      -1000
    );

    const venue = result.find((c) => c.name === 'Venue');
    expect(venue?.amount).toBe(0);
  });

  it('should clamp amounts exceeding total budget', () => {
    const totalBudget = 100000;
    const categories = [createCategory('Venue', 50000)];

    const result = rebalanceBudgetCategories(
      totalBudget,
      categories,
      'cat-Venue',
      150000
    );

    const venue = result.find((c) => c.name === 'Venue');
    expect(venue?.amount).toBe(100000);
  });

  it('should distribute proportionally based on previous amounts', () => {
    const totalBudget = 100000;
    const categories = [
      createCategory('Venue', 20000),
      createCategory('Food', 60000),
      createCategory('Decor', 20000),
    ];

    // Lock Venue at 30000, leaving 70000 for Food and Decor
    const result = rebalanceBudgetCategories(
      totalBudget,
      categories,
      'cat-Venue',
      30000
    );

    const sum = result.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(totalBudget);

    const food = result.find((c) => c.name === 'Food');
    const decor = result.find((c) => c.name === 'Decor');

    // Food had 60k out of 80k (75%), Decor had 20k (25%)
    // So Food should get ~75% of 70k = 52500, Decor ~17500
    expect(food!.amount).toBeGreaterThan(50000);
    expect(decor!.amount).toBeLessThan(20000);
  });

  it('should return unchanged if category not found', () => {
    const categories = [createCategory('Venue', 50000)];

    const result = rebalanceBudgetCategories(
      100000,
      categories,
      'cat-NonExistent',
      10000
    );

    expect(result).toEqual(categories);
  });

  it('should recalculate percentages based on totalBudget', () => {
    const totalBudget = 100000;
    const categories = [
      createCategory('Venue', 50000),
      createCategory('Food', 50000),
    ];

    const result = rebalanceBudgetCategories(
      totalBudget,
      categories,
      'cat-Venue',
      60000
    );

    const venue = result.find((c) => c.name === 'Venue');
    expect(venue?.percent).toBe(60); // 60k / 100k * 100
  });
});

describe('Budget Validation', () => {
  const createCategory = (name: string, amount: number): BudgetCategory => ({
    id: `cat-${name}`,
    name,
    amount,
    percent: 0,
    reasoning: 'test',
    is_locked: false,
    source: 'ai',
    edited_at: new Date().toISOString(),
  });

  it('should validate when sum matches total within tolerance', () => {
    const budget = {
      total_budget: 100000,
      categories: [createCategory('A', 50000), createCategory('B', 50000)],
    };

    const result = validateBudgetTotals(budget);
    expect(result.isValid).toBe(true);
  });

  it('should allow small rounding differences within 5 rupees', () => {
    const budget = {
      total_budget: 100000,
      categories: [createCategory('A', 49998), createCategory('B', 50000)],
    };

    const result = validateBudgetTotals(budget);
    expect(result.isValid).toBe(true);
  });

  it('should reject when sum differs by more than 5', () => {
    const budget = {
      total_budget: 100000,
      categories: [createCategory('A', 40000), createCategory('B', 50000)],
    };

    const result = validateBudgetTotals(budget);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('does not match');
  });

  it('should handle empty categories', () => {
    const budget = {
      total_budget: 100000,
      categories: [],
    };

    const result = validateBudgetTotals(budget);
    expect(result.isValid).toBe(false);
  });
});

describe('Budget Sanity Check', () => {
  it('should flag wedding budget below benchmark', () => {
    const result = checkBudgetSanity(200000, 200, 'wedding', 'Ahmedabad');

    // 200000 / 200 = 1000 per guest, below benchmark ~3000
    expect(result.isSane).toBe(false);
    expect(result.perGuest).toBe(1000);
    expect(result.feedback).toContain('lean');
  });

  it('should accept wedding budget within benchmark', () => {
    const result = checkBudgetSanity(800000, 200, 'wedding', 'Ahmedabad');

    // 800000 / 200 = 4000 per guest, within range
    expect(result.isSane).toBe(true);
    expect(result.perGuest).toBe(4000);
  });

  it('should flag generous budget above benchmark', () => {
    const result = checkBudgetSanity(2000000, 200, 'wedding', 'Ahmedabad');

    // 2000000 / 200 = 10000 per guest, above 8000
    expect(result.isSane).toBe(true);
    expect(result.feedback).toContain('Generous');
  });

  it('should use different benchmarks for birthday', () => {
    const result = checkBudgetSanity(100000, 50, 'birthday', 'Mumbai');

    // 100000 / 50 = 2000 per guest
    expect(result.benchmarkRange[0]).toBe(800);
    expect(result.benchmarkRange[1]).toBe(2500);
    expect(result.isSane).toBe(true);
  });

  it('should use different benchmarks for community', () => {
    const result = checkBudgetSanity(250000, 500, 'community', 'Delhi');

    // 250000 / 500 = 500 per guest
    expect(result.benchmarkRange[0]).toBe(300);
    expect(result.benchmarkRange[1]).toBe(1200);
    expect(result.isSane).toBe(true);
  });

  it('should adjust benchmarks for metro cities', () => {
    const mumbaiResult = checkBudgetSanity(800000, 200, 'wedding', 'Mumbai');
    const otherResult = checkBudgetSanity(800000, 200, 'wedding', 'Jaipur');

    // Mumbai should have higher benchmark
    expect(mumbaiResult.benchmarkRange[0]).toBeGreaterThan(
      otherResult.benchmarkRange[0]
    );
  });

  it('should handle zero guests gracefully', () => {
    const result = checkBudgetSanity(100000, 0, 'wedding', 'Delhi');

    // Should treat as 1 guest minimum
    expect(result.perGuest).toBeGreaterThan(0);
  });
});

describe('Default Budget Calculator', () => {
  it('should generate wedding budget with 10 categories', () => {
    const result = calculateDefaultBudget(800000, 'wedding', 'INR');

    expect(result.total_budget).toBe(800000);
    expect(result.currency).toBe('INR');
    expect(result.categories).toHaveLength(10);

    const sum = result.categories.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(800000);
  });

  it('should generate birthday budget with 7 categories', () => {
    const result = calculateDefaultBudget(200000, 'birthday', 'INR');

    expect(result.categories).toHaveLength(7);

    const sum = result.categories.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(200000);
  });

  it('should generate community budget with 6 categories', () => {
    const result = calculateDefaultBudget(500000, 'community', 'INR');

    expect(result.categories).toHaveLength(6);

    const sum = result.categories.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(500000);
  });

  it('should default to wedding if type unknown', () => {
    const result = calculateDefaultBudget(100000, 'unknown-type', 'INR');

    expect(result.categories).toHaveLength(10); // Wedding has 10
  });

  it('should initialize expenses as empty array', () => {
    const result = calculateDefaultBudget(100000, 'wedding', 'INR');

    expect(result.expenses).toEqual([]);
  });
});
