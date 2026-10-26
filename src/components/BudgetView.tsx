import React, { useState } from "react";
import {
  Lock,
  Unlock,
  AlertTriangle,
  Plus,
  FileDown,
  Sliders,
  Trash2,
} from "lucide-react";
import { BudgetCategory, Expense, EventProfile } from "../types";
import { formatExactINR, formatDate } from "../lib/formatters";
import { rebalanceBudgetCategories } from "../lib/deterministicMath";

interface BudgetViewProps {
  categories: BudgetCategory[];
  expenses: Expense[];
  profile: EventProfile;
  onUpdateCategories: (categories: BudgetCategory[]) => void;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onOpenOptimizerModal: () => void;
  onExportCSV: () => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  categories,
  expenses,
  profile,
  onUpdateCategories,
  onAddExpense,
  onDeleteExpense,
  onOpenOptimizerModal,
  onExportCSV,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"allocation" | "expenses">("allocation");

  // New Expense modal state
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpCategory, setNewExpCategory] = useState(categories[0]?.id || "");
  const [newExpVendor, setNewExpVendor] = useState("");
  const [newExpAmount, setNewExpAmount] = useState<number>(10000);
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [newExpStatus, setNewExpStatus] = useState<"paid" | "pending">("paid");
  const [newExpNotes, setNewExpNotes] = useState("");

  const totalBudget = profile.total_budget;
  const totalAllocated = categories.reduce((sum, c) => sum + c.amount, 0);

  // Group expenses by category
  const expensesByCategory: Record<string, { totalSpent: number; totalPending: number }> = {};
  for (const exp of expenses) {
    if (!expensesByCategory[exp.category_name]) {
      expensesByCategory[exp.category_name] = { totalSpent: 0, totalPending: 0 };
    }
    if (exp.status === "paid") {
      expensesByCategory[exp.category_name].totalSpent += exp.amount;
    } else {
      expensesByCategory[exp.category_name].totalPending += exp.amount;
    }
  }

  const totalSpent = expenses
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + e.amount, 0);

  const budgetUtilization = (totalSpent / totalBudget) * 100;
  const isOverBudget = totalSpent > totalBudget;
  const isNearBudgetLimit = totalSpent >= totalBudget * 0.9 && !isOverBudget;

  // Handle Lock toggle
  const toggleLock = (categoryId: string) => {
    const updated = categories.map((c) =>
      c.id === categoryId ? { ...c, is_locked: !c.is_locked } : c
    );
    onUpdateCategories(updated);
  };

  // Handle Amount change with proportional rebalancing in code
  const handleAmountChange = (categoryId: string, rawValue: string) => {
    const num = parseInt(rawValue) || 0;
    const rebalanced = rebalanceBudgetCategories(totalBudget, categories, categoryId, num);
    onUpdateCategories(rebalanced);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpVendor || newExpAmount <= 0) return;

    const matchedCategory = categories.find((c) => c.id === newExpCategory) || categories[0];
    const newExpenseItem: Expense = {
      id: `exp-${Date.now()}`,
      category_id: matchedCategory.id,
      category_name: matchedCategory.name,
      vendor_name: newExpVendor,
      amount: newExpAmount,
      date: newExpDate,
      status: newExpStatus,
      notes: newExpNotes,
    };

    onAddExpense(newExpenseItem);
    setShowAddExpense(false);
    setNewExpVendor("");
    setNewExpAmount(10000);
    setNewExpNotes("");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Main heading for budget view */}
      <h1 className="sr-only" tabIndex={-1}>
        Budget and Expenses - {profile.title}
      </h1>
      
      {/* Global Overspend Warning Banner */}
      {isOverBudget && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-900">Budget Exceeded!</h3>
              <p className="text-xs text-red-700 mt-1">
                Total expenses ({formatExactINR(totalSpent)}) have exceeded your budget of {formatExactINR(totalBudget)} by{" "}
                <span className="font-bold">{formatExactINR(totalSpent - totalBudget)}</span>. Consider using the AI Budget Optimizer to rebalance.
              </p>
            </div>
          </div>
        </div>
      )}

      {isNearBudgetLimit && !isOverBudget && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">Approaching Budget Limit</h3>
              <p className="text-xs text-amber-700 mt-1">
                You've spent {budgetUtilization.toFixed(1)}% of your total budget. Only {formatExactINR(totalBudget - totalSpent)} remaining.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner: Total Allocation, Optimizer & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">AI Budget Planner</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Deterministic Math Guaranteed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sum of all categories strictly equals total budget ({formatExactINR(totalBudget)}). Editing unlocked items rebalances the rest proportionally.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenOptimizerModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>AI Budget Optimizer</span>
          </button>

          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs: Category Allocation vs Expense Ledger (Strict Indigo Active Tab) */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("allocation")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === "allocation"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Category Allocations ({categories.length})
        </button>
        <button
          onClick={() => setActiveSubTab("expenses")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === "expenses"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Expense Tracker & Ledger</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {expenses.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Category Allocation Table & Rebalancing */}
      {activeSubTab === "allocation" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Lock</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 w-32">Percent (%)</th>
                    <th className="py-3 px-4 w-44">Allocated (INR)</th>
                    <th className="py-3 px-4 hidden md:table-cell">AI Rationale & Trade-offs</th>
                    <th className="py-3 px-4 w-36">Spending Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((cat) => {
                    const spentInfo = expensesByCategory[cat.name] || { totalSpent: 0, totalPending: 0 };
                    const actualSpent = spentInfo.totalSpent;
                    const spendRatio = cat.amount > 0 ? (actualSpent / cat.amount) * 100 : 0;
                    const isOverspent = actualSpent > cat.amount;
                    const isNearLimit = actualSpent >= cat.amount * 0.9 && !isOverspent;

                    return (
                      <tr
                        key={cat.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          cat.is_locked ? "bg-slate-50/40" : ""
                        }`}
                      >
                        {/* Lock / Unlock Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleLock(cat.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              cat.is_locked
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            }`}
                            title={cat.is_locked ? "Category locked against rebalance" : "Click to lock this category"}
                          >
                            {cat.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                        </td>

                        {/* Category Name & Source */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{cat.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span>Source: {cat.source}</span>
                            {cat.source === "user" && <span className="text-indigo-600 font-semibold">• Edited</span>}
                          </div>
                        </td>

                        {/* Percent */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {cat.percent.toFixed(1)}%
                        </td>

                        {/* Amount Input with Inline Rebalance */}
                        <td className="py-3 px-4">
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
                            <input
                              type="number"
                              step="1000"
                              value={cat.amount}
                              onChange={(e) => handleAmountChange(cat.id, e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 focus:border-indigo-500 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </td>

                        {/* Reasoning */}
                        <td className="py-3 px-4 hidden md:table-cell text-xs text-slate-600 leading-relaxed max-w-sm">
                          {cat.reasoning}
                        </td>

                        {/* Spent Progress Bar */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-medium text-slate-600">
                              <span>{formatExactINR(actualSpent)}</span>
                              <span
                                className={`font-bold ${
                                  isOverspent
                                    ? "text-red-600"
                                    : isNearLimit
                                    ? "text-amber-600"
                                    : "text-slate-500"
                                }`}
                              >
                                {spendRatio.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  isOverspent
                                    ? "bg-red-600"
                                    : isNearLimit
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, spendRatio)}%` }}
                              />
                            </div>
                            {isOverspent && (
                              <div className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> Over budget!
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900 text-xs sm:text-sm">
                  <tr>
                    <td className="py-3 px-4 text-center"></td>
                    <td className="py-3 px-4">Total Planned</td>
                    <td className="py-3 px-4 font-mono">
                      {categories.reduce((acc, c) => acc + c.percent, 0).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-indigo-600 font-black">
                      {formatExactINR(totalAllocated)}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-xs text-slate-500">
                      Total event ceiling: {formatExactINR(totalBudget)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      Spent: {formatExactINR(totalSpent)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Expense Tracker Ledger */}
      {activeSubTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recorded Expenses & Invoices</h3>
              <p className="text-xs text-slate-500">Track actual vendor payments, deposits, and pending balances</p>
            </div>
            <button
              onClick={() => setShowAddExpense(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Expense
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Vendor / Payee</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No expenses recorded yet. Click "Add New Expense" to record a payment.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{exp.vendor_name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {exp.category_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">{formatDate(exp.date)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {formatExactINR(exp.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            exp.status === "paid"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {exp.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {exp.notes || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete expense entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Record New Expense</h3>
            <p className="text-xs text-slate-500 mb-4">Log invoice, advance deposit or vendor payment</p>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="expense-category" className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  id="expense-category"
                  value={newExpCategory}
                  onChange={(e) => setNewExpCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Limit: {formatExactINR(c.amount)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="expense-vendor" className="block font-bold text-slate-700 mb-1">Vendor / Payee Name</label>
                <input
                  id="expense-vendor"
                  type="text"
                  required
                  placeholder="e.g. Royal Caterers, DJ Beats"
                  value={newExpVendor}
                  onChange={(e) => setNewExpVendor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expense-amount" className="block font-bold text-slate-700 mb-1">Amount (INR)</label>
                  <input
                    id="expense-amount"
                    type="number"
                    step="500"
                    required
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-bold focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="expense-status" className="block font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    id="expense-status"
                    value={newExpStatus}
                    onChange={(e) => setNewExpStatus(e.target.value as "paid" | "pending")}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value="paid">Paid (Cleared)</option>
                    <option value="pending">Pending (Milestone)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="expense-date" className="block font-bold text-slate-700 mb-1">Date</label>
                <input
                  id="expense-date"
                  type="date"
                  value={newExpDate}
                  onChange={(e) => setNewExpDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label htmlFor="expense-notes" className="block font-bold text-slate-700 mb-1">Notes / Invoice #</label>
                <textarea
                  id="expense-notes"
                  rows={2}
                  placeholder="e.g. Token advance 25% paid via UPI"
                  value={newExpNotes}
                  onChange={(e) => setNewExpNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
