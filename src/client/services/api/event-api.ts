import { apiFetch } from './client.js';
import {
  EventPlan,
  EventProfile,
  EventBudget,
  TimelineTask,
  Vendor,
  CreativeIdea,
  EventMessage,
  RiskItem,
  ExpenseItem,
  TaskStatus,
  VendorCategory
} from '../../../shared/types/index.js';

export const eventApi = {
  // Events
  getAllEvents: () => apiFetch<EventPlan[]>('/api/events'),
  getEventById: (id: string) => apiFetch<EventPlan>(`/api/events/${id}`),
  createEvent: (profile: EventProfile) =>
    apiFetch<EventPlan>('/api/events', {
      method: 'POST',
      body: JSON.stringify(profile)
    }),
  updateProfile: (id: string, patch: Partial<EventProfile>) =>
    apiFetch<EventPlan>(`/api/events/${id}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    }),
  addComment: (id: string, data: { section: string; targetId?: string; content: string }) =>
    apiFetch<any>(`/api/events/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  markNotificationRead: (eventId: string, notifId: string) =>
    apiFetch<void>(`/api/events/${eventId}/notifications/${notifId}/read`, {
      method: 'PATCH'
    }),

  // Intake NLP
  extractIntake: (input: string) =>
    apiFetch<{ profile: EventProfile; followUpQuestions: string[]; confidence: number }>(
      '/api/intake/extract',
      {
        method: 'POST',
        body: JSON.stringify({ input })
      }
    ),

  // Budget
  addExpense: (eventId: string, expense: Omit<ExpenseItem, 'id' | 'createdAt'>) =>
    apiFetch<EventBudget>(`/api/events/${eventId}/budget/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense)
    }),
  updateCategoryAllocation: (
    eventId: string,
    categoryName: string,
    allocated: number,
    isLocked?: boolean
  ) =>
    apiFetch<EventBudget>(`/api/events/${eventId}/budget/categories/${categoryName}`, {
      method: 'PUT',
      body: JSON.stringify({ allocated, isLocked })
    }),

  // Timeline
  updateTaskStatus: (eventId: string, taskId: string, status: TaskStatus) =>
    apiFetch<TimelineTask>(`/api/events/${eventId}/timeline/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  addTask: (eventId: string, task: Omit<TimelineTask, 'id'>) =>
    apiFetch<TimelineTask>(`/api/events/${eventId}/timeline/tasks`, {
      method: 'POST',
      body: JSON.stringify(task)
    }),

  // Vendors
  searchVendors: (params: { category?: VendorCategory; city?: string; query?: string; maxResults?: number }) => {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.set('category', params.category);
    if (params.city) searchParams.set('city', params.city);
    if (params.query) searchParams.set('query', params.query);
    if (params.maxResults) searchParams.set('maxResults', String(params.maxResults));
    return apiFetch<Vendor[]>(`/api/vendors/search?${searchParams.toString()}`);
  },

  // AI Features
  generateIdeas: (eventId: string) =>
    apiFetch<CreativeIdea[]>(`/api/events/${eventId}/ideas/generate`, { method: 'POST' }),
  generateInvitations: (eventId: string) =>
    apiFetch<EventMessage[]>(`/api/events/${eventId}/invitations/generate`, { method: 'POST' }),
  analyzeRisks: (eventId: string) =>
    apiFetch<RiskItem[]>(`/api/events/${eventId}/risks/analyze`, { method: 'POST' }),

  // Dev / Debug
  resetDatabase: () =>
    apiFetch<{ success: boolean; message: string }>('/api/dev/reset', { method: 'POST' })
};
