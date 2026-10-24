/**
 * Shared Domain Interfaces for PlanIt
 */

export type EventType = "wedding" | "birthday" | "community" | "general";
export type UserRole = "owner" | "editor" | "viewer";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  title: string;
}

export interface EventProfile {
  id: string;
  title: string;
  type: EventType;
  date: string; // ISO format YYYY-MM-DD
  city: string;
  guest_count: number;
  total_budget: number;
  currency: string;
  vibe_theme: string;
  culture_tradition: string;
  dietary_mix: string;
  indoor_outdoor: "indoor" | "outdoor" | "hybrid";
  priorities: string[];
  constraints: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  amount: number;
  percent: number;
  reasoning: string;
  is_locked?: boolean;
  source: "ai" | "user";
  edited_at: string;
}

export interface Expense {
  id: string;
  category_id: string;
  category_name: string;
  vendor_name: string;
  amount: number;
  date: string;
  status: "paid" | "pending";
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  due_date: string;
  phase: "6+ months" | "3 months" | "1 month" | "1 week" | "Day before" | "Day-of";
  status: "pending" | "in_progress" | "completed";
  assignee: string;
  linked_vendor: string;
  priority: "high" | "medium" | "low";
  notes?: string;
  source?: "ai" | "user";
  edited_at?: string;
}

export interface RunOfShowItem {
  id: string;
  time: string;
  title: string;
  owner: string;
  location: string;
  notes: string;
}

export type VendorStatus = "not_started" | "contacted" | "quote_received" | "booked" | "paid";

export interface VendorItem {
  id: string;
  name: string;
  category: string;
  contact: string;
  quote: number;
  advance_paid: number;
  balance: number;
  due_date: string;
  status: VendorStatus;
  place_id?: string;
  notes?: string;
  source?: "ai" | "user";
  edited_at?: string;
}

export interface VendorPlace {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string;
  rating: number;
  user_ratings_total: number;
  price_level: number;
  approx_cost: number;
  per_plate?: number;
  address: string;
  phone: string;
  website: string;
  google_maps_url: string;
  image: string;
  reviews: Array<{ author: string; rating: number; text: string }>;
  highlights: string[];
  red_flags: string[];
}

export interface IdeaItem {
  id: string;
  category: string;
  title: string;
  description: string;
  cost_range: string;
  effort_level: "Low" | "Medium" | "High";
  tags: string[];
  saved: boolean;
}

export interface RiskItem {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  likelihood: "high" | "medium" | "low";
  category: "Weather" | "Permits & Legal" | "Food & Safety" | "Timeline" | "Financial" | "General";
  why: string;
  mitigation: string;
  backup_plan: string;
}

export interface InvitationItem {
  id: string;
  type: string;
  language: string;
  tone: string;
  content: string;
  share_url?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ActivityLogItem {
  id: string;
  user: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  eventId: string;
  title: string;
  message: string;
  type: "alert" | "reminder" | "info";
  read: boolean;
  createdAt: string;
}

export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  section: string;
  targetId?: string;
  content: string;
  createdAt: string;
}

export interface FullEventPlan {
  profile: EventProfile;
  budget: {
    total_budget: number;
    currency: string;
    categories: BudgetCategory[];
    expenses: Expense[];
  };
  timeline: {
    tasks: Task[];
    run_of_show: RunOfShowItem[];
  };
  vendors: VendorItem[];
  ideas: IdeaItem[];
  risks: RiskItem[];
  invitations: InvitationItem[];
  collaborators: Collaborator[];
  activity_log: ActivityLogItem[];
  notifications?: AppNotification[];
  comments?: EventComment[];
}

// Canonical Type Aliases for Service & API Compatibility
export type EventPlan = FullEventPlan;
export type EventBudget = FullEventPlan['budget'];
export type TimelineTask = Task;
export type TaskStatus = Task['status'];
export type EventVendor = VendorItem;
export type Vendor = VendorPlace;
export type VendorCategory = string;
export type CreativeIdea = IdeaItem;
export type EventMessage = InvitationItem;
export type ExpenseItem = Expense;
export type EventMember = Collaborator;
export type ActivityLogEntry = ActivityLogItem;

