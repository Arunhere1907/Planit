import { useState, useEffect, useCallback } from 'react';
import { EventPlan, EventProfile, ExpenseItem, TaskStatus, TimelineTask } from '../../shared/types/index.js';
import { eventApi } from '../services/api/event-api.js';

export function usePlan() {
  const [plans, setPlans] = useState<EventPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await eventApi.getAllEvents();
      setPlans(data);
      if (data.length > 0 && !activePlanId) {
        setActivePlanId(data[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed loading events');
    } finally {
      setIsLoading(false);
    }
  }, [activePlanId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const activePlan = plans.find(p => p.id === activePlanId) || plans[0] || null;

  const switchPlan = (id: string) => {
    setActivePlanId(id);
  };

  const createEvent = async (profile: EventProfile): Promise<EventPlan> => {
    const created = await eventApi.createEvent(profile);
    setPlans(prev => [created, ...prev]);
    setActivePlanId(created.id);
    return created;
  };

  const addExpense = async (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => {
    if (!activePlan) return;
    const updatedBudget = await eventApi.addExpense(activePlan.id, expense);
    setPlans(prev =>
      prev.map(p => (p.id === activePlan.id ? { ...p, budget: updatedBudget } : p))
    );
  };

  const updateAllocation = async (categoryName: string, allocated: number, isLocked?: boolean) => {
    if (!activePlan) return;
    const updatedBudget = await eventApi.updateCategoryAllocation(
      activePlan.id,
      categoryName,
      allocated,
      isLocked
    );
    setPlans(prev =>
      prev.map(p => (p.id === activePlan.id ? { ...p, budget: updatedBudget } : p))
    );
  };

  const toggleTaskStatus = async (taskId: string) => {
    if (!activePlan) return;
    const task = activePlan.timeline.find(t => t.id === taskId);
    if (!task) return;
    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';

    const updatedTask = await eventApi.updateTaskStatus(activePlan.id, taskId, nextStatus);
    setPlans(prev =>
      prev.map(p =>
        p.id === activePlan.id
          ? {
              ...p,
              timeline: p.timeline.map(t => (t.id === taskId ? updatedTask : t))
            }
          : p
      )
    );
  };

  const addTask = async (task: Omit<TimelineTask, 'id'>) => {
    if (!activePlan) return;
    const created = await eventApi.addTask(activePlan.id, task);
    setPlans(prev =>
      prev.map(p =>
        p.id === activePlan.id
          ? {
              ...p,
              timeline: [...p.timeline, created].sort(
                (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
              )
            }
          : p
      )
    );
  };

  const resetDatabase = async () => {
    await eventApi.resetDatabase();
    await fetchPlans();
  };

  return {
    plans,
    activePlan,
    activePlanId,
    isLoading,
    error,
    switchPlan,
    createEvent,
    addExpense,
    updateAllocation,
    toggleTaskStatus,
    addTask,
    refreshPlan: fetchPlans,
    resetDatabase
  };
}
