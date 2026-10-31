import { apiFetch } from './client.js';
import type {
  FullEventPlan,
  EventProfile,
  BudgetCategory,
  Expense,
  Task,
  TaskStatus,
  VendorPlace,
  IdeaItem,
  InvitationItem,
  RiskItem,
  VendorCategory,
  EventComment,
} from '../../../shared/types/index.js';

export const eventApi = {
  // Events
  getAllEvents: () => apiFetch<FullEventPlan[]>('/api/events'),
  getEventById: (id: string) => apiFetch<FullEventPlan>(`/api/events/${id}`),
  createEvent: (profile: EventProfile) =>
    apiFetch<FullEventPlan>('/api/events', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),
  updateProfile: (id: string, patch: Partial<EventProfile>) =>
    apiFetch<FullEventPlan>(`/api/events/${id}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  addComment: (id: string, data: { section: string; targetId?: string; content: string }) =>
    apiFetch<EventComment>(`/api/events/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  markNotificationRead: (eventId: string, notifId: string) =>
    apiFetch<void>(`/api/events/${eventId}/notifications/${notifId}/read`, {
      method: 'PATCH',
    }),

  // Intake NLP
  extractIntake: (input: string) =>
    apiFetch<{ profile: EventProfile; follow_up_questions: string[]; confidence: number }>(
      '/api/intake/extract',
      {
        method: 'POST',
        body: JSON.stringify({ input }),
      }
    ),

  // Budget
  generateBudget: (profile: EventProfile) =>
    apiFetch<{ categories: BudgetCategory[]; strategic_notes?: string }>('/api/budget/generate', {
      method: 'POST',
      body: JSON.stringify({ profile }),
    }),
  addExpense: (eventId: string, expense: Omit<Expense, 'id'>) =>
    apiFetch<FullEventPlan['budget']>(`/api/events/${eventId}/budget/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    }),
  updateCategoryAllocation: (
    eventId: string,
    categoryName: string,
    allocated: number,
    isLocked?: boolean
  ) =>
    apiFetch<FullEventPlan['budget']>(
      `/api/events/${eventId}/budget/categories/${encodeURIComponent(categoryName)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ allocated, isLocked }),
      }
    ),

  // Timeline
  generateTimeline: (profile: EventProfile) =>
    apiFetch<{ tasks: Task[]; run_of_show: FullEventPlan['timeline']['run_of_show'] }>(
      '/api/timeline/generate',
      {
        method: 'POST',
        body: JSON.stringify({ profile }),
      }
    ),
  updateTaskStatus: (eventId: string, taskId: string, status: TaskStatus) =>
    apiFetch<Task>(`/api/events/${eventId}/timeline/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  addTask: (eventId: string, task: Omit<Task, 'id'>) =>
    apiFetch<Task>(`/api/events/${eventId}/timeline/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  // Vendors
  searchVendors: (params: {
    category?: VendorCategory;
    city?: string;
    query?: string;
    maxResults?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.set('category', params.category);
    if (params.city) searchParams.set('city', params.city);
    if (params.query) searchParams.set('query', params.query);
    if (params.maxResults) searchParams.set('maxResults', String(params.maxResults));
    return apiFetch<{ data: VendorPlace[]; vendors: VendorPlace[] }>(
      `/api/vendors/search?${searchParams.toString()}`
    );
  },

  // AI Features
  generateIdeas: (profile: EventProfile) =>
    apiFetch<{ ideas: IdeaItem[] }>('/api/ideas/generate', {
      method: 'POST',
      body: JSON.stringify({ profile }),
    }),
  generateInvitations: (profile: EventProfile) =>
    apiFetch<{ variants: InvitationItem[]; invitations: InvitationItem[] }>(
      '/api/invitations/generate',
      {
        method: 'POST',
        body: JSON.stringify({ profile }),
      }
    ),
  analyzeRisks: (profile: EventProfile) =>
    apiFetch<{ risks: RiskItem[] }>('/api/risks/generate', {
      method: 'POST',
      body: JSON.stringify({ profile }),
    }),

  // Dev / Debug
  resetDatabase: () =>
    apiFetch<{ success: boolean; message: string }>('/api/dev/reset', { method: 'POST' }),
};
