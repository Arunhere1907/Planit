import { z } from 'zod';

/**
 * Security-focused validation schemas for request validation
 * - Enforce max lengths to prevent DoS
 * - Validate formats and enums
 * - Reject unknown fields
 */

// Common field validations
const MAX_TEXT_LENGTH = 5000; // For chat messages, notes, etc.
const MAX_NAME_LENGTH = 200;
const MAX_ID_LENGTH = 100;

// ID format validation (alphanumeric, hyphens, underscores)
const idPattern = /^[a-zA-Z0-9_-]+$/;
const IdSchema = z.string().min(1).max(MAX_ID_LENGTH).regex(idPattern, 'Invalid ID format');

// Date validation (ISO 8601)
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format');

// Event Profile Validation (for intake/creation)
export const EventProfileInputSchema = z.object({
  type: z.enum(['wedding', 'birthday', 'community', 'general']),
  title: z.string().min(1, 'Title required').max(MAX_NAME_LENGTH),
  date: DateSchema,
  city: z.string().min(1, 'City required').max(MAX_NAME_LENGTH),
  guest_count: z.number().int().min(1, 'Must have at least 1 guest').max(100000),
  total_budget: z.number().min(0, 'Budget cannot be negative').max(1000000000), // 1 billion max
  currency: z.string().length(3).default('INR'), // ISO 4217
  vibe_theme: z.string().max(MAX_NAME_LENGTH).optional().default(''),
  culture_tradition: z.string().max(MAX_NAME_LENGTH).optional().default(''),
  dietary_mix: z.string().max(MAX_NAME_LENGTH).optional().default(''),
  indoor_outdoor: z.enum(['indoor', 'outdoor', 'hybrid']).optional().default('outdoor'),
  priorities: z.array(z.string().max(MAX_NAME_LENGTH)).max(20).optional().default([]),
  constraints: z.string().max(MAX_TEXT_LENGTH).optional().default(''),
}).strict(); // Reject unknown fields

// Chat/Intake Message Validation
export const IntakeChatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(MAX_TEXT_LENGTH).optional(),
  input: z.string().min(1, 'Input cannot be empty').max(MAX_TEXT_LENGTH).optional(),
  userInput: z.string().min(1, 'User input cannot be empty').max(MAX_TEXT_LENGTH).optional(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(MAX_TEXT_LENGTH),
    })
  ).max(50).optional(), // Limit conversation history
}).refine(
  (data) => Boolean((data.message && data.message.trim().length > 0) || (data.input && data.input.trim().length > 0) || (data.userInput && data.userInput.trim().length > 0)),
  { message: 'Message, input, or userInput cannot be empty' }
);

// Task Update Validation
export const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(MAX_NAME_LENGTH).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due_date: DateSchema.optional(),
  notes: z.string().max(MAX_TEXT_LENGTH).optional(),
  assignee: z.string().max(MAX_NAME_LENGTH).optional(),
  linked_vendor: z.string().max(MAX_NAME_LENGTH).optional(),
}).strict();

// Vendor Update Validation
export const VendorUpdateSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH).optional(),
  category: z.string().max(MAX_NAME_LENGTH).optional(),
  contact: z.string().max(MAX_NAME_LENGTH).optional(),
  quote: z.number().min(0).max(1000000000).optional(),
  advance_paid: z.number().min(0).max(1000000000).optional(),
  balance: z.number().min(0).max(1000000000).optional(),
  status: z.enum(['shortlisted', 'contacted', 'booked', 'paid', 'confirmed']).optional(),
  notes: z.string().max(MAX_TEXT_LENGTH).optional(),
  due_date: DateSchema.optional(),
}).strict();

// Budget Category Update Validation
export const BudgetCategoryUpdateSchema = z.object({
  categoryName: z.string().min(1).max(MAX_NAME_LENGTH),
  amount: z.number().min(0, 'Amount cannot be negative').max(1000000000).optional(),
  percent: z.number().min(0).max(100).optional(),
  is_locked: z.boolean().optional(),
  reasoning: z.string().max(MAX_TEXT_LENGTH).optional(),
}).strict();

// Expense Creation Validation
export const ExpenseCreateSchema = z.object({
  category_id: IdSchema,
  description: z.string().min(1, 'Description required').max(MAX_NAME_LENGTH),
  amount: z.number().min(0, 'Amount cannot be negative').max(1000000000),
  status: z.enum(['pending', 'paid']).default('pending'),
  paid_date: DateSchema.optional(),
  notes: z.string().max(MAX_TEXT_LENGTH).optional(),
}).strict();

// Vendor Search Validation
export const VendorSearchSchema = z.object({
  category: z.string().max(MAX_NAME_LENGTH).optional(),
  city: z.string().max(MAX_NAME_LENGTH).optional(),
  query: z.string().max(MAX_NAME_LENGTH).optional(),
  maxResults: z.number().int().min(1).max(50).optional(),
}).strict();

// Replan Validation
export const ReplanRequestSchema = z.object({
  newDate: DateSchema.optional(),
  newBudget: z.number().min(0).max(1000000000).optional(),
  newGuests: z.number().int().min(1).max(100000).optional(),
}).strict();

// Params validation
export const EventIdParamSchema = z.object({
  id: IdSchema,
}).strict();

export const TaskIdParamSchema = z.object({
  id: IdSchema,
  taskId: IdSchema,
}).strict();

export const VendorIdParamSchema = z.object({
  id: IdSchema,
  vendorId: IdSchema,
}).strict();

export const CategoryNameParamSchema = z.object({
  id: IdSchema,
  categoryName: z.string().min(1).max(MAX_NAME_LENGTH),
}).strict();

// Query validation
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
}).strict();

/**
 * Sanitization helpers
 */

// Remove potential script tags, SQL injection patterns
export function sanitizeString(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// Validate URL is from trusted domain (for Places API results)
export function isTrustedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const trustedDomains = ['google.com', 'googleapis.com', 'gstatic.com', 'maps.google.com'];
    return trustedDomains.some((domain) => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// Sanitize filename for downloads
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .substring(0, 255);
}
