import React, { useState } from "react";
import { RefreshCw, Check, ArrowRight, X, Loader2 } from "lucide-react";
import { FullEventPlan, BudgetCategory, Task, EventProfile } from "../types";
import { formatExactINR, formatDate } from "../lib/formatters";

interface ReplanModalProps {
  plan: FullEventPlan;
  onApplyReplan: (updatedProfile: EventProfile, updatedCategories: BudgetCategory[], updatedTasks: Task[]) => void;
  onClose: () => void;
}

export const ReplanModal: React.FC<ReplanModalProps> = ({ plan, onApplyReplan, onClose }) => {
  const { profile, budget, timeline: _timeline } = plan;

  const [newDate, setNewDate] = useState(profile.date);
  const [newBudget, setNewBudget] = useState(profile.total_budget);
  const [newGuests, setNewGuests] = useState(profile.guest_count);

  const [isSimulating, setIsSimulating] = useState(false);
  const [diffGenerated, setDiffGenerated] = useState(false);

  // Proposed Diffs
  const [proposedCategories, setProposedCategories] = useState<BudgetCategory[]>([]);
  const [proposedTasks, setProposedTasks] = useState<Task[]>([]);
  const [_acceptedItems, setAcceptedItems] = useState<Record<string, boolean>>({});

  const handleRunReplanPipeline = async () => {
    setIsSimulating(true);

    const updatedProfile: EventProfile = {
      ...profile,
      date: newDate,
      total_budget: newBudget,
      guest_count: newGuests,
    };

    try {
      // 1. Recompute budget categories via API
      const budgetRes = await fetch("/api/budget/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: updatedProfile }),
      });
      const budgetData = await budgetRes.json();

      // 2. Recompute timeline backwards tasks via API
      const timelineRes = await fetch("/api/timeline/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: updatedProfile }),
      });
      const timelineData = await timelineRes.json();

      setProposedCategories(budgetData.categories || []);
      setProposedTasks(timelineData.tasks || []);

      // Default accept all
      const initialAccepts: Record<string, boolean> = {};
      (budgetData.categories || []).forEach((c: BudgetCategory) => (initialAccepts[`cat-${c.id}`] = true));
      (timelineData.tasks || []).forEach((t: Task) => (initialAccepts[`task-${t.id}`] = true));
      setAcceptedItems(initialAccepts);

      setDiffGenerated(true);
    } catch (e) {
      console.warn("Replan pipeline error:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApplyAll = () => {
    const updatedProfile: EventProfile = {
      ...profile,
      date: newDate,
      total_budget: newBudget,
      guest_count: newGuests,
    };

    // Filter by accepted items or apply whole set
    onApplyReplan(updatedProfile, proposedCategories, proposedTasks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 my-auto max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Replanning Pipeline & Diff Review</h3>
              <p className="text-xs text-slate-500">
                Propose and review ripple updates to budget and timeline
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!diffGenerated ? (
          <div className="space-y-4 my-4 flex-1">
            <p className="text-xs text-slate-600 leading-relaxed font-light">
              Adjust any key parameter below. PlanIt will run a deterministic re-computation of budget categories and backwards date milestones for your review.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                />
                <span className="text-[10px] text-slate-400">Current: {profile.date}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Budget (INR)</label>
                <input
                  type="number"
                  step="10000"
                  value={newBudget}
                  onChange={(e) => setNewBudget(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono"
                />
                <span className="text-[10px] text-slate-400">Current: {formatExactINR(profile.total_budget)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Guest Count</label>
                <input
                  type="number"
                  value={newGuests}
                  onChange={(e) => setNewGuests(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                />
                <span className="text-[10px] text-slate-400">Current: {profile.guest_count} guests</span>
              </div>
            </div>

            <div className="pt-4 text-center">
              <button
                onClick={handleRunReplanPipeline}
                disabled={isSimulating}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    <span>Calculating Impact Across Categories & Dates...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Generate Reviewable Diff</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 my-4 flex-1 overflow-y-auto pr-1">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <div>
                <strong>Diff Ready:</strong> Budget updated from {formatExactINR(profile.total_budget)} → {formatExactINR(newBudget)}. Date shifted to {formatDate(newDate)}.
              </div>
              <button
                onClick={() => setDiffGenerated(false)}
                className="text-[11px] font-bold underline"
              >
                Edit Values
              </button>
            </div>

            {/* Budget Diff Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Proposed Category Amounts
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {proposedCategories.slice(0, 5).map((cat) => {
                  const oldCat = budget.categories.find((c) => c.name === cat.name);
                  return (
                    <div key={cat.id} className="p-2.5 bg-slate-50 flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{cat.name}</span>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-slate-400 line-through">
                          {oldCat ? formatExactINR(oldCat.amount) : "—"}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-emerald-700">{formatExactINR(cat.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline Shift Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Shifted Milestone Deadlines
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {proposedTasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="p-2.5 bg-slate-50 flex items-center justify-between">
                    <span className="font-semibold text-slate-900 truncate max-w-xs">{task.title}</span>
                    <span className="font-mono font-bold text-indigo-700">{formatDate(task.due_date)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Discard
              </button>

              <button
                onClick={handleApplyAll}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Accept & Apply All Changes</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
