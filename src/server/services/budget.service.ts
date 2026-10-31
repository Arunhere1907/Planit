import { eventRepository } from '../repositories/index.js';
import type {
  FullEventPlan,
  Expense,
  BudgetCategory,
  ActivityLogItem,
} from '../../shared/types/index.js';
import {
  rebalanceBudgetWithLocks,
  validateBudgetTotals,
} from '../../shared/utils/deterministic-math.js';
import { NotFoundError, ValidationError } from '../errors/app-error.js';

export class BudgetService {
  public async getBudget(eventId: string): Promise<FullEventPlan['budget']> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');
    return event.budget;
  }

  public async addExpense(
    eventId: string,
    expenseData: Omit<Expense, 'id'>,
    user: { id: string; name: string }
  ): Promise<FullEventPlan['budget']> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const newExpense: Expense = {
      ...expenseData,
      id: `exp_${Date.now()}`,
    };

    const targetCategory = event.budget.categories.find(
      (c: BudgetCategory) =>
        c.name === expenseData.category_name || c.id === expenseData.category_id
    );
    if (!targetCategory) {
      throw new ValidationError(
        `Category "${expenseData.category_name}" does not exist in event budget`
      );
    }

    event.budget.expenses = [newExpense, ...event.budget.expenses];

    const activity: ActivityLogItem = {
      id: `act_${Date.now()}`,
      user: user.name,
      action: 'added_expense',
      detail: `Added expense for "${expenseData.vendor_name}" of ${event.budget.currency} ${expenseData.amount.toLocaleString()} in ${expenseData.category_name}`,
      timestamp: new Date().toISOString(),
    };

    const updated = await eventRepository.update(eventId, {
      budget: event.budget,
      activity_log: [activity, ...event.activity_log],
    });

    if (!updated) throw new NotFoundError('Failed updating budget');
    return updated.budget;
  }

  public async updateCategoryAllocation(
    eventId: string,
    categoryNameOrId: string,
    newAllocated: number,
    locked: boolean,
    user: { id: string; name: string }
  ): Promise<FullEventPlan['budget']> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const targetIndex = event.budget.categories.findIndex(
      (c: BudgetCategory) => c.name === categoryNameOrId || c.id === categoryNameOrId
    );
    if (targetIndex === -1) {
      throw new ValidationError(`Category "${categoryNameOrId}" not found`);
    }

    // Set lock & value
    event.budget.categories[targetIndex].amount = Math.round(newAllocated);
    event.budget.categories[targetIndex].is_locked = locked;
    event.budget.categories[targetIndex].source = 'user';
    event.budget.categories[targetIndex].edited_at = new Date().toISOString();

    // Deterministically rebalance all unlocked categories so sum === total_budget
    event.budget.categories = rebalanceBudgetWithLocks(
      event.budget.categories,
      event.budget.total_budget,
      categoryNameOrId
    );

    // Audit sanity check
    const validation = validateBudgetTotals(event.budget);
    if (!validation.isValid) {
      throw new ValidationError(`Budget calculation constraint failed: ${validation.message}`);
    }

    const activity: ActivityLogItem = {
      id: `act_${Date.now()}`,
      user: user.name,
      action: 'updated_budget',
      detail: `Adjusted allocation for ${categoryNameOrId} to ${event.budget.currency} ${newAllocated.toLocaleString()} (Locked: ${locked})`,
      timestamp: new Date().toISOString(),
    };

    const updated = await eventRepository.update(eventId, {
      budget: event.budget,
      activity_log: [activity, ...event.activity_log],
    });

    if (!updated) throw new NotFoundError('Failed updating budget');
    return updated.budget;
  }
}

export const budgetService = new BudgetService();
