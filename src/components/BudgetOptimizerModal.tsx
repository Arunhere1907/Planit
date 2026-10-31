import React, { useState } from "react";
import { Sliders, ArrowRight, X, Loader2 } from "lucide-react";
import type { BudgetCategory, EventProfile } from "../types";
import { formatExactINR } from "../lib/formatters";

interface BudgetOptimizerModalProps {
  categories: BudgetCategory[];
  profile: EventProfile;
  onApplyScenario: (updatedCategories: BudgetCategory[]) => void;
  onClose: () => void;
}

interface OptimizerCutProposal {
  category_name: string;
  cut_percent: number;
  specific_action: string;
}

interface OptimizerScenario {
  name: string;
  description: string;
  total_savings: number;
  experience_impact: string;
  proposed_cuts: OptimizerCutProposal[];
}

export const BudgetOptimizerModal: React.FC<BudgetOptimizerModalProps> = ({
  categories,
  profile,
  onApplyScenario,
  onClose,
}) => {
  const [selectedCutPercent, setSelectedCutPercent] = useState<number>(15);
  const [isLoading, setIsLoading] = useState(false);
  const [scenarios, setScenarios] = useState<OptimizerScenario[]>([
    {
      name: "Minimal Impact (Surgical Polish)",
      description: "Trims non-essential print stationery and exotic out-of-season blooms while keeping gourmet catering and candid photography 100% untouched.",
      total_savings: Math.round(profile.total_budget * 0.1),
      experience_impact: "Low",
      proposed_cuts: [
        { category_name: "Decor & Floral Design", cut_percent: 15, specific_action: "Opt for indigenous fresh marigolds and brass diyas instead of imported orchids." },
        { category_name: "Invitations & Stationery", cut_percent: 50, specific_action: "Shift 80% of guest list to interactive digital WhatsApp cards." },
      ],
    },
    {
      name: "Balanced Value (Recommended)",
      description: "Saves the target 15% through smart menu course restructuring and combined sound packages.",
      total_savings: Math.round(profile.total_budget * 0.15),
      experience_impact: "Medium",
      proposed_cuts: [
        { category_name: "Catering & Beverages", cut_percent: 10, specific_action: "Consolidate duplicate live dessert counters and standardize mocktail bar." },
        { category_name: "Venue & Facilities", cut_percent: 10, specific_action: "Negotiate inclusive green rooms and power generator diesel waiver." },
        { category_name: "Photography & Video", cut_percent: 8, specific_action: "Keep 2 lead candid cameras with drone, streamline standard prints." },
      ],
    },
    {
      name: "Aggressive Optimization (Maximum Buffer)",
      description: "Bold structural streamlining creating major financial breathing room.",
      total_savings: Math.round(profile.total_budget * 0.22),
      experience_impact: "High",
      proposed_cuts: [
        { category_name: "Music, DJ & Entertainment", cut_percent: 30, specific_action: "Switch to acoustic folk performers and curated playlist." },
        { category_name: "Transport & Logistics", cut_percent: 40, specific_action: "Designate centralized shuttle pickup points instead of individual cabs." },
      ],
    },
  ]);

  const handleFetchScenarios = async (pct: number) => {
    setSelectedCutPercent(pct);
    setIsLoading(true);
    try {
      const res = await fetch("/api/optimizer/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: `Cut ${pct}% from total event budget`,
          targetPercent: pct,
          currentCategories: categories,
          profile,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.scenarios && data.scenarios.length > 0) {
          setScenarios(data.scenarios);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch fresh optimizer scenarios, keeping deterministic baseline:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (scenario: OptimizerScenario) => {
    const updated = categories.map((cat) => {
      const cutRule = scenario.proposed_cuts.find(
        (c) => c.category_name.toLowerCase() === cat.name.toLowerCase()
      );
      if (cutRule) {
        const cutFactor = (100 - cutRule.cut_percent) / 100;
        const newAmt = Math.round(cat.amount * cutFactor);
        return {
          ...cat,
          amount: newAmt,
          percent: Number(((newAmt / profile.total_budget) * 100).toFixed(1)),
          reasoning: `${cat.reasoning} [Optimizer: ${cutRule.specific_action}]`,
          source: "ai" as const,
          edited_at: new Date().toISOString(),
        };
      }
      return cat;
    });

    onApplyScenario(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 my-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 rounded-xl text-white shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">AI Budget Optimizer</h3>
              <p className="text-xs text-slate-500">Intelligent value engineering & targeted scenario trims</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Goal Selector */}
        <div className="my-5">
          <div className="block text-xs font-bold text-slate-700 mb-2" role="group" aria-label="Select optimization goal">Select Optimization Goal:</div>
          <div className="grid grid-cols-3 gap-2.5">
            {[10, 15, 20].map((pct) => (
              <button
                key={pct}
                onClick={() => handleFetchScenarios(pct)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  selectedCutPercent === pct
                    ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>Cut {pct}%</span>
                <span className={selectedCutPercent === pct ? "text-amber-100 text-[11px]" : "text-slate-500 text-[11px]"}>
                  Save ~{formatExactINR((pct / 100) * profile.total_budget)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Scenarios List */}
        <div className="space-y-3.5 mb-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span>Analyzing market benchmarks and generating value trade-offs...</span>
            </div>
          ) : (
            scenarios.map((sc, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{sc.name}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sc.experience_impact === "Low"
                            ? "bg-emerald-100 text-emerald-800"
                            : sc.experience_impact === "Medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {sc.experience_impact} Guest Impact
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{sc.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-500">Savings</span>
                    <div className="text-sm font-black text-emerald-600">
                      -{formatExactINR(sc.total_savings)}
                    </div>
                  </div>
                </div>

                {/* Proposed cuts breakdown */}
                <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">Specific Trade-offs:</div>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {sc.proposed_cuts?.map((cut, cIdx: number) => (
                      <li key={cIdx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>
                          <strong>{cut.category_name} (-{cut.cut_percent}%):</strong> {cut.specific_action}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleApply(sc)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                  >
                    <span>Apply Scenario</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
