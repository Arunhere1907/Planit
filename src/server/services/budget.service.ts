import { eventRepository } from '../repositories/index.js';
import { EventBudget, ExpenseItem, ActivityLogEntry } from '../../shared/types/index.js';
import { rebalanceBudgetWithLocks, validateBudgetTotals } from '../../shared/utils/deterministic-math.js';
import { NotFoundError, ValidationError } from '../errors/app-error.js';

export class BudgetService {
  public async getBudget(eventId: string): Promise<EventBudget> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');
    return event.budget;
  }

  public async addExpense(
    eventId: string,
    expenseData: Omit<ExpenseItem, 'id' | 'createdAt'>,
    user: { id: string; name: string }
  ): Promise<EventBudget> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const newExpense: ExpenseItem = {
      ...expenseData,
      id: `exp_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    const targetCategory = event.budget.categories.find(c => c.category === expenseData.category);
    if (!targetCategory) {
      throw new ValidationError(`Category "${expenseData.category}" does not exist in event budget`);
    }

    targetCategory.spent = Math.round(targetCategory.spent + expenseData.amount);
    event.budget.expenses.push(newExpense);

    // Recalculate totals deterministically
    event.budget.totalSpent = event.budget.categories.reduce((acc, cat) => acc + cat.spent, 0);

    const activity: ActivityLogEntry = {
      id: `act_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      action: 'added_expense',
      details: `Added expense "${expenseData.description}" of ${event.budget.currency} ${expenseData.amount.toLocaleString()} in ${expenseData.category}`,
      timestamp: new Date().toISOString()
    };

    const updated = await eventRepository.update(eventId, {
      budget: event.budget,
      activityLog: [activity, ...event.activityLog]
    });

    if (!updated) throw new NotFoundError('Failed updating budget');
    return updated.budget;
  }

  public async updateCategoryAllocation(
    eventId: string,
    categoryName: string,
    newAllocated: number,
    locked: boolean,
    user: { id: string; name: string }
  ): Promise<EventBudget> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found');

    const targetIndex = event.budget.categories.findIndex(c => c.category === categoryName);
    if (targetIndex === -1) {
      throw new ValidationError(`Category "${categoryName}" not found`);
    }

    // Set lock & value
    event.budget.categories[targetIndex].allocated = Math.round(newAllocated);
    event.budget.categories[targetIndex].isLocked = locked;

    // Deterministically rebalance all unlocked categories so sum === totalBudget
    event.budget.categories = rebalanceBudgetWithLocks(
      event.budget.categories,
      event.budget.totalBudget,
      categoryName
    );

    // Audit sanity check
    const validation = validateBudgetTotals(event.budget);
    if (!validation.isValid) {
      throw new ValidationError(`Budget calculation constraint failed: ${validation.message}`);
    }

    const activity: ActivityLogEntry = {
      id: `act_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      action: 'updated_budget',
      details: `Adjusted allocation for ${categoryName} to ${event.budget.currency} ${newAllocated.toLocaleString()} (Locked: ${locked})`,
      timestamp: new Date().toISOString()
    };

    const updated = await eventRepository.update(eventId, {
      budget: event.budget,
      activityLog: [activity, ...event.activityLog]
    });

    if (!updated) throw new NotFoundError('Failed updating budget');
    return updated.budget;
  }
}

export const budgetService = new BudgetService();
