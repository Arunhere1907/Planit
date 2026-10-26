import React, { useState } from "react";
import {
  CloudRain,
  AlertTriangle,
  Scale,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { RiskItem, EventProfile } from "../types";
import { checkBudgetSanity } from "../lib/deterministicMath";

interface RiskAdvisorViewProps {
  risks: RiskItem[];
  profile: EventProfile;
  totalBudget: number;
  onUpdateRisks: (risks: RiskItem[]) => void;
}

export const RiskAdvisorView: React.FC<RiskAdvisorViewProps> = ({
  risks,
  profile,
  totalBudget,
  onUpdateRisks,
}) => {
  const [isReevaluating, setIsReevaluating] = useState(false);

  // Deterministic sanity calculation
  const sanity = checkBudgetSanity(totalBudget, profile.guest_count, profile.type, profile.city);

  const handleReevaluate = async () => {
    setIsReevaluating(true);
    try {
      const res = await fetch("/api/risks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          budgetData: { total_budget: totalBudget },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.risks && data.risks.length > 0) {
          onUpdateRisks(data.risks);
        }
      }
    } catch (e) {
      console.warn("Failed to reevaluate risks:", e);
    } finally {
      setIsReevaluating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Main heading for risk advisor view */}
      <h1 className="sr-only" tabIndex={-1}>
        Risk Advisor - {profile.title}
      </h1>
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Risk & Contingency Advisor</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Proactive Safeguards
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitors seasonal weather hazards, sound curfews, civic fire compliance, dietary segregation, and per-head budget sanity.
          </p>
        </div>

        <button
          onClick={handleReevaluate}
          disabled={isReevaluating}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors shadow-2xs"
        >
          {isReevaluating ? (
            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
          ) : (
            <RefreshCw className="w-4 h-4 text-slate-500" />
          )}
          <span>Re-evaluate Risks</span>
        </button>
      </div>

      {/* Top Cards: Budget Sanity Benchmark & Weather Outlook */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Budget Sanity Check */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Budget Sanity Benchmark</h3>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                sanity.isSane
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {sanity.isSane ? "Verified Viable" : "Lean Budget Warning"}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              ₹{sanity.perGuest.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-slate-500">per guest allocation ({profile.guest_count} guests)</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-light bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            {sanity.feedback}
          </p>
        </div>

        {/* Card 2: Seasonal Climate Logistics */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">Regional Climate & Weather Insight</h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              December Season
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Day Temp</span>
              <div className="font-bold text-slate-800 mt-0.5">28°C Pleasant</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Night Temp</span>
              <div className="font-bold text-slate-800 mt-0.5">13°C Chilly</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Lawn Dew Risk</span>
              <div className="font-bold text-amber-700 mt-0.5">High (&gt; 9:30 PM)</div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-light">
            Ahmedabad winter evenings feature heavy grass dew. Seating areas require wooden sub-flooring under carpets to prevent dampness.
          </p>
        </div>
      </div>

      {/* Ranked Risk Matrix */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900">Ranked Risk Contingency Matrix</h3>

        <div className="space-y-3.5">
          {risks.map((risk) => (
            <div
              key={risk.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3 border-l-4 ${
                risk.severity === "high"
                  ? "border-l-rose-500"
                  : risk.severity === "medium"
                  ? "border-l-amber-500"
                  : "border-l-blue-500"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {risk.category}
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">{risk.title}</h4>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      risk.severity === "high"
                        ? "bg-rose-100 text-rose-800"
                        : risk.severity === "medium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {risk.severity} Severity
                  </span>

                  <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {risk.likelihood} Likelihood
                  </span>
                </div>
              </div>

              {/* Root Cause Why */}
              <p className="text-xs text-slate-600 leading-relaxed font-light">
                <strong className="text-slate-800 font-semibold">Root Cause:</strong> {risk.why}
              </p>

              {/* Preventative Mitigation & Concrete Backup Plan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-xs">
                  <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Preventative Mitigation:
                  </div>
                  <p className="text-emerald-950 leading-relaxed font-light">{risk.mitigation}</p>
                </div>

                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-xs">
                  <div className="font-bold text-amber-900 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Concrete Backup Plan (Fallback):
                  </div>
                  <p className="text-amber-950 leading-relaxed font-light">{risk.backup_plan}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
