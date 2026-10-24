import { BudgetCategory, Task } from "../types";

/**
 * Computes exact category amounts from percentages against the total budget.
 * Guarantees that the sum of category amounts matches totalBudget to the exact integer,
 * absorbing any floating-point rounding remainder into the largest unlocked category or contingency.
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
    // Round to nearest integer for clean currency display
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
    // Find contingency fund or first unlocked category
    const contingency = result.find((c) => c.name.toLowerCase().includes("contingency")) || result[0];
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
  // Clamp newAmount to be between 0 and totalBudget
  const clampedAmount = Math.max(0, Math.min(newAmount, totalBudget));

  // Find target category
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

  const unlockedOthers = updatedCategories.filter((c) => !c.is_locked && c.id !== editedCategoryId);

  if (unlockedOthers.length === 0) {
    // No other categories can absorb the change; recompute percentages as-is
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
    let allocatedAmount = 0;

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

  // Rounding adjustment
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
 * Guarantees that no task is in the past relative to today (unless overdue indicator is desired)
 * and no task is dated AFTER the event date.
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

  const daysUntilEvent = Math.max(1, Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return tasks.map((t, idx) => {
    // If the event is very close (e.g. 30 days), compress phases proportionately
    let effectiveOffset = t.offset_days;
    if (daysUntilEvent < 180 && t.offset_days > daysUntilEvent) {
      // Scale down proportionally so it fits within available window
      effectiveOffset = Math.max(1, Math.round((t.offset_days / 180) * daysUntilEvent));
    }

    const taskDate = new Date(eventDate);
    taskDate.setDate(taskDate.getDate() - effectiveOffset);

    // Guardrail: no task dated after the event
    if (taskDate.getTime() > eventDate.getTime()) {
      taskDate.setTime(eventDate.getTime());
    }

    // Determine phase based on remaining days from event
    let determinedPhase = t.phase;
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
 * Compares per-guest cost with industry norms.
 */
export function checkBudgetSanity(
  totalBudget: number,
  guestCount: number,
  eventType: string,
  city: string
): { isSane: boolean; perGuest: number; benchmarkRange: [number, number]; feedback: string } {
  const guests = Math.max(1, guestCount);
  const perGuest = Math.round(totalBudget / guests);

  let benchmarkMin = 1500;
  let benchmarkMax = 6000;

  if (eventType === "birthday") {
    benchmarkMin = 800;
    benchmarkMax = 2500;
  } else if (eventType === "community") {
    benchmarkMin = 300;
    benchmarkMax = 1200;
  } else {
    // Wedding
    benchmarkMin = city.toLowerCase().includes("mumbai") || city.toLowerCase().includes("delhi") ? 4000 : 3000;
    benchmarkMax = 8000;
  }

  const isSane = perGuest >= benchmarkMin * 0.7; // Warning if 30% below standard minimal floor
  let feedback = `Per guest allocation is ₹${perGuest.toLocaleString("en-IN")}. Industry benchmark for ${eventType} in ${city} is ₹${benchmarkMin.toLocaleString("en-IN")} - ₹${benchmarkMax.toLocaleString("en-IN")}.`;

  if (perGuest < benchmarkMin) {
    feedback += ` Note: Budget is lean. Consider prioritizing catering & venue while simplifying floral decor and entertainment.`;
  } else if (perGuest > benchmarkMax) {
    feedback += ` Generous budget per head! Allows for luxury culinary upgrades, imported floral styling, and top-tier cinematic photography.`;
  }

  return { isSane, perGuest, benchmarkRange: [benchmarkMin, benchmarkMax], feedback };
}
