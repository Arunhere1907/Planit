import { BudgetCategory, Task } from "../types/index.js";

/**
 * Computes exact category amounts from percentages against the total budget.
 * Guarantees that the sum of category amounts matches totalBudget to the exact integer.
 */
export function calculateBudgetSplitFromPercents(
  totalBudget: number,
  categories: Array<{ name: string; percent: number; reasoning: string }>
): BudgetCategory[] {
  if (categories.length === 0) return [];

  // Normalize percentages so they sum to 100
  const rawSum = categories.reduce((acc, c) => acc + c.percent, 0);
  const normalizedCats = categories.map((c) => ({
    ...c,
    percent: rawSum > 0 ? (c.percent / rawSum) * 100 : 100 / categories.length,
  }));

  let allocatedSum = 0;
  const result: BudgetCategory[] = [];

  for (let i = 0; i < normalizedCats.length; i++) {
    const cat = normalizedCats[i];
    const amount = Math.round((cat.percent / 100) * totalBudget);
    allocatedSum += amount;

    result.push({
      id: `b-${i + 1}-${Date.now()}`,
      name: cat.name,
      percent: Number(cat.percent.toFixed(1)),
      amount,
      reasoning: cat.reasoning,
      is_locked: false,
      source: "ai",
      edited_at: new Date().toISOString(),
    });
  }

  // Adjust rounding difference on last or largest category so sum(amount) === totalBudget
  const diff = totalBudget - allocatedSum;
  if (diff !== 0 && result.length > 0) {
    const contingency =
      result.find((c) => c.name.toLowerCase().includes("contingency")) || result[0];
    contingency.amount += diff;
    contingency.percent = Number(((contingency.amount / totalBudget) * 100).toFixed(1));
  }

  return result;
}

/**
 * Rebalances unlocked categories proportionally when a user edits an amount in one category.
 * Locked categories are strictly preserved.
 */
export function rebalanceBudgetCategories(
  totalBudget: number,
  categories: BudgetCategory[],
  editedCategoryId: string,
  newAmount: number
): BudgetCategory[] {
  const clampedAmount = Math.max(0, Math.min(newAmount, totalBudget));

  const targetIndex = categories.findIndex((c) => c.id === editedCategoryId);
  if (targetIndex === -1) return categories;

  const updatedCategories = categories.map((c) => ({ ...c }));
  const targetCat = updatedCategories[targetIndex];
  targetCat.amount = clampedAmount;
  targetCat.source = "user" as const;
  targetCat.edited_at = new Date().toISOString();

  // Sum of all locked categories (excluding target if target was locked)
  const lockedCats = updatedCategories.filter((c) => c.is_locked && c.id !== editedCategoryId);
  const totalLockedAmount = lockedCats.reduce((acc, c) => acc + c.amount, 0);

  // Available remainder to distribute amongst other unlocked categories
  const remainder = totalBudget - clampedAmount - totalLockedAmount;
  const unlockedOthers = updatedCategories.filter(
    (c) => !c.is_locked && c.id !== editedCategoryId
  );

  if (unlockedOthers.length === 0) {
    const currentSum = updatedCategories.reduce((acc, c) => acc + c.amount, 0);
    return updatedCategories.map((c) => ({
      ...c,
      percent: currentSum > 0 ? Number(((c.amount / currentSum) * 100).toFixed(1)) : 0,
    }));
  }

  const previousUnlockedSum = unlockedOthers.reduce((acc, c) => acc + c.amount, 0);

  let distributedSum = 0;
  for (let i = 0; i < unlockedOthers.length; i++) {
    const cat = unlockedOthers[i];
    let allocatedAmount;

    if (remainder <= 0) {
      allocatedAmount = 0;
    } else if (previousUnlockedSum > 0) {
      allocatedAmount = Math.round((cat.amount / previousUnlockedSum) * remainder);
    } else {
      allocatedAmount = Math.round(remainder / unlockedOthers.length);
    }

    cat.amount = allocatedAmount;
    distributedSum += allocatedAmount;
  }

  // Rounding gap adjustment
  const roundingGap = remainder - distributedSum;
  if (roundingGap !== 0 && unlockedOthers.length > 0) {
    unlockedOthers[0].amount += roundingGap;
  }

  // Recalculate percent for all categories based on totalBudget
  for (const c of updatedCategories) {
    c.percent = Number(((c.amount / totalBudget) * 100).toFixed(1));
  }

  return updatedCategories;
}

/**
 * Computes exact backwards calendar dates from the event date.
 */
export function calculateBackwardsDueDates(
  eventDateStr: string,
  tasks: Array<{
    title: string;
    role: string;
    priority: "high" | "medium" | "low";
    phase: Task["phase"];
    offset_days: number;
    linked_vendor: string;
    notes?: string;
  }>
): Task[] {
  const eventDate = new Date(eventDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysUntilEvent = Math.max(
    1,
    Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );

  return tasks.map((t, idx) => {
    let effectiveOffset = t.offset_days;
    if (daysUntilEvent < 180 && t.offset_days > daysUntilEvent) {
      effectiveOffset = Math.max(1, Math.round((t.offset_days / 180) * daysUntilEvent));
    }

    const taskDate = new Date(eventDate);
    taskDate.setDate(taskDate.getDate() - effectiveOffset);

    // Guardrail: no task dated after the event
    if (taskDate.getTime() > eventDate.getTime()) {
      taskDate.setTime(eventDate.getTime());
    }

    let determinedPhase: "6+ months" | "3 months" | "1 month" | "1 week" | "Day before" | "Day-of";
    if (effectiveOffset >= 180) determinedPhase = "6+ months";
    else if (effectiveOffset >= 90) determinedPhase = "3 months";
    else if (effectiveOffset >= 30) determinedPhase = "1 month";
    else if (effectiveOffset >= 7) determinedPhase = "1 week";
    else if (effectiveOffset >= 1) determinedPhase = "Day before";
    else determinedPhase = "Day-of";

    return {
      id: `task-${idx + 1}-${Date.now()}`,
      title: t.title,
      due_date: taskDate.toISOString().split("T")[0],
      phase: determinedPhase,
      status: "pending" as const,
      assignee: t.role,
      linked_vendor: t.linked_vendor || "General",
      priority: t.priority,
      notes: t.notes || "",
      source: "ai" as const,
      edited_at: new Date().toISOString(),
    };
  });
}

/**
 * Budget sanity benchmark check:
 * Compares per-guest cost with regional industry norms.
 */
export function checkBudgetSanity(
  totalBudget: number,
  guestCount: number,
  eventType: string,
  city: string
): { isSane: boolean; perGuest: number; benchmarkRange: [number, number]; feedback: string } {
  const guests = Math.max(1, guestCount);
  const perGuest = Math.round(totalBudget / guests);

  let benchmarkMin;
  let benchmarkMax;

  if (eventType === "birthday") {
    benchmarkMin = 800;
    benchmarkMax = 2500;
  } else if (eventType === "community") {
    benchmarkMin = 300;
    benchmarkMax = 1200;
  } else {
    // Wedding
    benchmarkMin =
      city.toLowerCase().includes("mumbai") || city.toLowerCase().includes("delhi")
        ? 4000
        : 3000;
    benchmarkMax = 8000;
  }

  const isSane = perGuest >= benchmarkMin * 0.7;
  let feedback = `Per guest allocation is ₹${perGuest.toLocaleString("en-IN")}. Industry benchmark for ${eventType} in ${city} is ₹${benchmarkMin.toLocaleString("en-IN")} - ₹${benchmarkMax.toLocaleString("en-IN")}.`;

  if (perGuest < benchmarkMin) {
    feedback += ` Note: Budget is lean. Consider prioritizing catering & venue while simplifying floral decor and entertainment.`;
  } else if (perGuest > benchmarkMax) {
    feedback += ` Generous budget per head! Allows for luxury culinary upgrades, imported floral styling, and top-tier cinematic photography.`;
  }

  return { isSane, perGuest, benchmarkRange: [benchmarkMin, benchmarkMax], feedback };
}

export const DEFAULT_BUDGET_SPLITS: Record<string, Array<{ name: string; percent: number; reasoning: string }>> = {
  wedding: [
    { name: "Venue & Facilities", percent: 30.0, reasoning: "Lawn/hall rental, green rooms, and venue infrastructure." },
    { name: "Catering & Beverages", percent: 32.0, reasoning: "Full-course feast with welcome beverages, live food stations, and dessert." },
    { name: "Decor & Floral Design", percent: 12.0, reasoning: "Mandap/stage setup, entry arch, and fresh floral artistry." },
    { name: "Photography & Video", percent: 9.0, reasoning: "Candid photography, traditional videography, and drone footage." },
    { name: "Music, DJ & Entertainment", percent: 5.0, reasoning: "Sound systems, DJ, and folk or live performers." },
    { name: "Attire, Hair & Makeup", percent: 4.0, reasoning: "Bridal/groom styling, draping, and professional makeup." },
    { name: "Invitations & Stationery", percent: 1.5, reasoning: "Digital RSVP portal, formal cards, and welcome boards." },
    { name: "Transport & Logistics", percent: 1.5, reasoning: "Guest shuttles, vintage car, and tempo luggage logistics." },
    { name: "Rituals & Miscellaneous", percent: 2.0, reasoning: "Ceremonial samagri, priest dakshina, and tokens." },
    { name: "Contingency Fund", percent: 3.0, reasoning: "Unforeseen overtime or unexpected guest expansion buffer." },
  ],
  birthday: [
    { name: "Venue & Space Rental", percent: 28.0, reasoning: "Private lounge/hall or rooftop space rental." },
    { name: "Food, Cake & Drinks", percent: 35.0, reasoning: "Multi-course appetizers, gourmet cake, and beverage bar." },
    { name: "Themed Decor & Balloons", percent: 15.0, reasoning: "Custom backdrop, neon signage, and balloon garlands." },
    { name: "Entertainment & Games", percent: 10.0, reasoning: "Host emcee, music playlist/DJ, and interactive games." },
    { name: "Photography & Reels", percent: 6.0, reasoning: "Event photographer and social media reel creator." },
    { name: "Favors & Return Gifts", percent: 4.0, reasoning: "Personalized souvenirs for attendees." },
    { name: "Contingency Buffer", percent: 2.0, reasoning: "Buffer for additional food or extended hours." },
  ],
  community: [
    { name: "Venue & Public Permits", percent: 25.0, reasoning: "Grounds, community hall, municipal and sound permits." },
    { name: "Community Refreshments & Food", percent: 30.0, reasoning: "Prasad/buffet, water stations, and tea/coffee stalls." },
    { name: "Stage, Sound & Lighting", percent: 20.0, reasoning: "Stage platform, public address system, and ambient lighting." },
    { name: "Decor, Seating & Signage", percent: 12.0, reasoning: "Chairs, tentage, welcome banners, and directional signage." },
    { name: "Security, Sanitation & First Aid", percent: 8.0, reasoning: "Waste bins, security personnel, and basic first-aid setup." },
    { name: "Contingency & Reserve", percent: 5.0, reasoning: "Inclement weather backup or utility buffer." },
  ],
};

export function calculateDefaultBudget(totalBudget: number, eventType: string = "wedding", currency: string = "INR") {
  const splits = DEFAULT_BUDGET_SPLITS[eventType] || DEFAULT_BUDGET_SPLITS.wedding;
  const categories = calculateBudgetSplitFromPercents(totalBudget, splits);
  return {
    total_budget: totalBudget,
    currency,
    categories,
    expenses: [],
  };
}

export function validateBudgetTotals(budget: { total_budget: number; categories: BudgetCategory[] }): { isValid: boolean; message: string } {
  const sum = budget.categories.reduce((acc, c) => acc + c.amount, 0);
  const diff = Math.abs(sum - budget.total_budget);
  if (diff > 5) {
    return { isValid: false, message: `Sum of category allocations (₹${sum}) does not match total budget (₹${budget.total_budget})` };
  }
  return { isValid: true, message: "Valid" };
}

export function rebalanceBudgetWithLocks(
  categories: BudgetCategory[],
  totalBudget: number,
  targetCategoryNameOrId: string
): BudgetCategory[] {
  const targetCat = categories.find((c) => c.name === targetCategoryNameOrId || c.id === targetCategoryNameOrId);
  if (!targetCat) return categories;
  return rebalanceBudgetCategories(totalBudget, categories, targetCat.id, targetCat.amount);
}

export function generateDefaultTimeline(eventDateStr: string, _eventType: string = "wedding"): Task[] {
  const tasks = [
    { title: "Finalize and secure main venue contract with advance", role: "Organizer", priority: "high" as const, phase: "6+ months" as const, offset_days: 180, linked_vendor: "Venue" },
    { title: "Finalize catering menu tasting and guest count tiers", role: "Food Lead", priority: "high" as const, phase: "3 months" as const, offset_days: 90, linked_vendor: "Catering" },
    { title: "Book candid photography and cinematic videographer", role: "Organizer", priority: "medium" as const, phase: "3 months" as const, offset_days: 75, linked_vendor: "Photography" },
    { title: "Approve stage backdrop and floral decor theme", role: "Decor Lead", priority: "medium" as const, phase: "1 month" as const, offset_days: 30, linked_vendor: "Decor" },
    { title: "Send digital RSVP invitations with schedule details", role: "Communication Lead", priority: "high" as const, phase: "1 month" as const, offset_days: 28, linked_vendor: "Invitations" },
    { title: "Conduct full sound check and DJ playlist review", role: "Entertainment Lead", priority: "medium" as const, phase: "1 week" as const, offset_days: 7, linked_vendor: "Music" },
    { title: "Reconfirm finalized guest headcount with caterer", role: "Food Lead", priority: "high" as const, phase: "1 week" as const, offset_days: 5, linked_vendor: "Catering" },
    { title: "Walk through venue, backup power, and weather check", role: "Logistics Lead", priority: "high" as const, phase: "Day before" as const, offset_days: 1, linked_vendor: "Venue" },
    { title: "Day-of vendor arrival and ceremony timeline coordination", role: "Lead Emcee", priority: "high" as const, phase: "Day-of" as const, offset_days: 0, linked_vendor: "General" },
  ];
  return calculateBackwardsDueDates(eventDateStr, tasks);
}

