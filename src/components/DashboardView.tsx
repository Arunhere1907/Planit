import React, { useState } from "react";
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Volume2,
  ChevronRight,
  Plus,
} from "lucide-react";
import type { FullEventPlan } from "../types";
import { formatExactINR, formatDate, getDaysRemaining } from "../lib/formatters";

interface DashboardViewProps {
  plan: FullEventPlan;
  onNavigateTab: (tab: string) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onOpenAddExpenseModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  plan,
  onNavigateTab,
  onToggleTaskStatus,
  onOpenAddExpenseModal,
}) => {
  const { profile, budget, timeline, vendors, risks } = plan;
  const daysLeft = getDaysRemaining(profile.date);

  // Budget calculations
  const totalBudget = budget.total_budget;
  const spentAmount = budget.expenses
    .filter((e) => e.status === "paid")
    .reduce((acc, e) => acc + e.amount, 0);
  const pendingExpenseAmount = budget.expenses
    .filter((e) => e.status === "pending")
    .reduce((acc, e) => acc + e.amount, 0);

  const spentPercent = totalBudget > 0 ? (spentAmount / totalBudget) * 100 : 0;

  // Task metrics
  const completedTasks = timeline.tasks.filter((t) => t.status === "completed").length;
  const totalTasks = timeline.tasks.length;
  const todayStr = new Date().toISOString().split("T")[0];

  const overdueTasks = timeline.tasks.filter(
    (t) => t.status !== "completed" && t.due_date < todayStr
  );
  const upcomingTasks = timeline.tasks
    .filter((t) => t.status !== "completed" && t.due_date >= todayStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);

  // Vendor Pipeline counts
  const vendorCounts = {
    not_started: vendors.filter((v) => v.status === "not_started").length,
    contacted: vendors.filter((v) => v.status === "contacted").length,
    quote_received: vendors.filter((v) => v.status === "quote_received").length,
    booked: vendors.filter((v) => v.status === "booked").length,
    paid: vendors.filter((v) => v.status === "paid").length,
  };

  // High risks
  const highRisks = risks.filter((r) => r.severity === "high");

  // Daily digest state
  const [digest] = useState<string | null>(
    `Good morning! You're on track for ${profile.title}. With ${daysLeft} days to go, 3 critical items require attention: confirm caterer tasting, review floral design blueprint, and verify sound curfew permits.`
  );
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeakDigest = () => {
    if (!digest) return;
    if ("speechSynthesis" in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(digest);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Main heading for dashboard */}
      <h1 className="sr-only" tabIndex={-1}>
        Event Dashboard - {profile.title}
      </h1>
      
      {/* Overdue alert banner if any (semantic warning/danger) */}
      {overdueTasks.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                {overdueTasks.length} task{overdueTasks.length > 1 ? "s are" : " is"} past due date!
              </p>
              <p className="text-xs text-amber-700">
                Action required: {overdueTasks[0].title} (due {formatDate(overdueTasks[0].due_date)})
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab("timeline")}
            className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            Review Tasks <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Welcome Card with Indigo & Amber theme */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-indigo-500/20 to-transparent blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
                {profile.type}
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-indigo-400" /> {profile.city}
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-400" /> {profile.guest_count} guests
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif text-white">
              {profile.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-light">
              {profile.vibe_theme} • {profile.dietary_mix}
            </p>
          </div>

          {/* Countdown & Quick Action */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-4 rounded-xl border border-white/15">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight">
                {daysLeft}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Days Left</div>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="space-y-1 text-xs">
              <div className="text-slate-300">Target Date:</div>
              <div className="font-bold text-white flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {formatDate(profile.date)}
              </div>
            </div>
          </div>
        </div>

        {/* AI Daily Concierge Briefing */}
        {digest && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-slate-200 leading-relaxed max-w-3xl">
                <strong className="text-amber-300">Daily Concierge:</strong> {digest}
              </p>
            </div>
            <button
              onClick={handleSpeakDigest}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                isSpeaking
                  ? "bg-indigo-600 text-white animate-pulse"
                  : "bg-white/15 hover:bg-white/25 text-white"
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isSpeaking ? "Stop Voice" : "Listen Briefing"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Top 4 Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Budget Gauge */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Budget Utilized</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold">
              {spentPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatExactINR(spentAmount)}
            </span>
            <span className="text-xs text-slate-500 font-medium">of {formatExactINR(totalBudget)}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
            <div
              className={`h-full transition-all ${
                spentPercent >= 100
                  ? "bg-red-600"
                  : spentPercent >= 90
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, spentPercent)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>Committed: {formatExactINR(spentAmount + pendingExpenseAmount)}</span>
            <button
              onClick={() => onNavigateTab("budget")}
              className="font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Manage
            </button>
          </div>
        </div>

        {/* Metric 2: Timeline Tasks */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Milestones Completed</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-bold">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {completedTasks}
            </span>
            <span className="text-xs text-slate-500 font-medium">of {totalTasks} total tasks</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>{totalTasks - completedTasks} remaining</span>
            <button
              onClick={() => onNavigateTab("timeline")}
              className="font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              View Schedule
            </button>
          </div>
        </div>

        {/* Metric 3: Vendor Status */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Booked Vendors</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 font-bold">
              {vendorCounts.booked + vendorCounts.paid}/{vendors.length}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {vendorCounts.booked + vendorCounts.paid}
            </span>
            <span className="text-xs text-slate-500 font-medium">confirmed</span>
          </div>
          {/* Mini pipeline dots */}
          <div className="mt-3 flex gap-1 h-2">
            {vendors.map((v, i) => (
              <div
                key={v.id || i}
                className={`h-full flex-1 rounded-sm ${
                  v.status === "paid"
                    ? "bg-emerald-500"
                    : v.status === "booked"
                    ? "bg-indigo-600"
                    : v.status === "quote_received"
                    ? "bg-amber-400"
                    : "bg-slate-200"
                }`}
                title={`${v.name}: ${v.status}`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>{vendorCounts.not_started + vendorCounts.contacted} in negotiation</span>
            <button
              onClick={() => onNavigateTab("vendors")}
              className="font-bold text-amber-700 hover:underline cursor-pointer"
            >
              Pipeline
            </button>
          </div>
        </div>

        {/* Metric 4: High Priority Risk Alerts (Red for danger) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Critical Risks</span>
            <span className={`p-1.5 rounded-lg font-bold ${
              highRisks.length > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
            }`}>
              {highRisks.length} High
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {risks.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">total monitored</span>
          </div>
          <div className="mt-3 text-xs text-slate-600 line-clamp-1">
            {highRisks.length > 0 ? (
              <span className="text-red-600 font-medium flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                {highRisks[0].title}
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">All contingencies secured</span>
            )}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>Permit & weather alerts</span>
            <button
              onClick={() => onNavigateTab("risks")}
              className="font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Contingencies
            </button>
          </div>
        </div>
      </div>

      {/* 2-Column Main Section: Next Tasks vs Financial & Vendor Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Next 5 Tasks + Day-of Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Tasks Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Immediate Action Items</h3>
                <p className="text-xs text-slate-500">Next critical tasks computed from backwards timeline</p>
              </div>
              <button
                onClick={() => onNavigateTab("timeline")}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                View all ({timeline.tasks.length}) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No upcoming tasks pending! All current milestones completed.
                </div>
              ) : (
                upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleTaskStatus(task.id)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                        title="Mark complete"
                      >
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 hover:border-emerald-500" />
                      </button>
                      <div className="space-y-1">
                        <div className="text-xs sm:text-sm font-semibold text-slate-900">
                          {task.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-medium text-slate-700">Role: {task.assignee}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> Due {formatDate(task.due_date)}
                          </span>
                          <span>•</span>
                          <span className="text-slate-500">{task.linked_vendor}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        task.priority === "high"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : task.priority === "medium"
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Day-of Run of Show Teaser */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Day-of Run of Show (Schedule)</h3>
                <p className="text-xs text-slate-500">Hour-by-hour ceremonial sequence & operational handoffs</p>
              </div>
              <button
                onClick={() => onNavigateTab("timeline")}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                Open Full Schedule <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timeline.run_of_show.slice(0, 4).map((item, index) => (
                <div key={item.id || index} className="relative group">
                  <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {item.time}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-900">{item.title}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 italic">{item.location} ({item.owner})</span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-slate-500 mt-0.5 font-light">{item.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Recent Expenses + Vendor Payments Due */}
        <div className="space-y-6">
          {/* Recent Expenses Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Expenses</h3>
                <p className="text-[11px] text-slate-500">Tracked payments & deposits</p>
              </div>
              <button
                onClick={onOpenAddExpenseModal}
                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {budget.expenses.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">No expenses recorded yet.</div>
              ) : (
                budget.expenses.slice(0, 4).map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{exp.vendor_name}</div>
                      <div className="text-[11px] text-slate-500">{exp.category_name} • {formatDate(exp.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900">{formatExactINR(exp.amount)}</div>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          exp.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {exp.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => onNavigateTab("budget")}
              className="mt-3 w-full py-2 text-center text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              View Full Expense Ledger →
            </button>
          </div>

          {/* Upcoming Vendor Balances Due */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upcoming Balances Due</h3>
                <p className="text-[11px] text-slate-500">Contract milestone payables</p>
              </div>
              <button
                onClick={() => onNavigateTab("vendors")}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Vendors
              </button>
            </div>

            <div className="space-y-2.5">
              {vendors
                .filter((v) => v.balance > 0)
                .slice(0, 3)
                .map((v) => (
                  <div
                    key={v.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 truncate max-w-[160px]">{v.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> Due {formatDate(v.due_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-700">{formatExactINR(v.balance)}</div>
                      <div className="text-[10px] text-slate-500">of {formatExactINR(v.quote)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
