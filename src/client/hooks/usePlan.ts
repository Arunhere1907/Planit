import { useState, useEffect, useCallback } from 'react';
import { FullEventPlan, EventProfile, Expense, TaskStatus, Task } from '../../shared/types/index.js';
import { eventApi } from '../services/api/event-api.js';

export function usePlan() {
  const [plans, setPlans] = useState<FullEventPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await eventApi.getAllEvents();
      if (Array.isArray(data) && data.length > 0) {
        setPlans(data);
        setActivePlanId((prevId) => {
          if (prevId && data.some((p) => p.profile.id === prevId)) {
            return prevId;
          }
          return data[0].profile.id;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed loading events';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const activePlan = plans.find((p) => p.profile.id === activePlanId) || plans[0] || null;

  const switchPlan = (id: string) => {
    setActivePlanId(id);
  };

  const createEvent = async (profile: EventProfile): Promise<FullEventPlan> => {
    const created = await eventApi.createEvent(profile);
    setPlans((prev) => [created, ...prev]);
    setActivePlanId(created.profile.id);
    return created;
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    if (!activePlan) return;
    const updatedBudget = await eventApi.addExpense(activePlan.profile.id, expense);
    setPlans((prev) =>
      prev.map((p) => (p.profile.id === activePlan.profile.id ? { ...p, budget: updatedBudget } : p))
    );
  };

  const updateAllocation = async (categoryName: string, allocated: number, isLocked?: boolean) => {
    if (!activePlan) return;
    const updatedBudget = await eventApi.updateCategoryAllocation(
      activePlan.profile.id,
      categoryName,
      allocated,
      isLocked
    );
    setPlans((prev) =>
      prev.map((p) => (p.profile.id === activePlan.profile.id ? { ...p, budget: updatedBudget } : p))
    );
  };

  const toggleTaskStatus = async (taskId: string) => {
    if (!activePlan) return;
    const task = activePlan.timeline.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';

    const updatedTask = await eventApi.updateTaskStatus(activePlan.profile.id, taskId, nextStatus);
    setPlans((prev) =>
      prev.map((p) =>
        p.profile.id === activePlan.profile.id
          ? {
              ...p,
              timeline: {
                ...p.timeline,
                tasks: p.timeline.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
              },
            }
          : p
      )
    );
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    if (!activePlan) return;
    const created = await eventApi.addTask(activePlan.profile.id, task);
    setPlans((prev) =>
      prev.map((p) =>
        p.profile.id === activePlan.profile.id
          ? {
              ...p,
              timeline: {
                ...p.timeline,
                tasks: [...p.timeline.tasks, created].sort(
                  (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                ),
              },
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
    setPlans,
    activePlan,
    activePlanId,
    setActivePlanId,
    isLoading,
    error,
    switchPlan,
    createEvent,
    addExpense,
    updateAllocation,
    toggleTaskStatus,
    addTask,
    refreshPlan: fetchPlans,
    resetDatabase,
  };
}
