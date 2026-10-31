import React from 'react';
import { Printer, X } from 'lucide-react';
import type { FullEventPlan } from '../types';
import { formatExactINR, formatDate } from '../lib/formatters';

interface PrintablePlanModalProps {
  plan: FullEventPlan;
  onClose: () => void;
}

export const PrintablePlanModal: React.FC<PrintablePlanModalProps> = ({ plan, onClose }) => {
  const { profile, budget, timeline, vendors, ideas: _ideas, risks } = plan;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-8 my-auto overflow-y-auto max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:p-0 print:m-0">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Printable Event Master Dossier (PDF Ready)
            </h3>
            <p className="text-xs text-slate-500">
              Comprehensive plan for suppliers, hosts & coordinators
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print to PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="space-y-8 text-slate-900">
          {/* Section 1: Cover Header */}
          <div className="border-b-2 border-slate-900 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                  PlanIt GenAI Event Blueprint
                </span>
                <h1 className="text-3xl font-black tracking-tight font-serif text-slate-900 mt-1">
                  {profile.title}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  {profile.vibe_theme} • {profile.culture_tradition}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-bold uppercase">Event Date</div>
                <div className="text-lg font-extrabold text-slate-900">
                  {formatDate(profile.date)}
                </div>
                <div className="text-xs text-slate-500">
                  {profile.city} • {profile.guest_count} Guests
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Financial Summary & Category Split */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
                1. Budget Allocation ({formatExactINR(budget.total_budget)})
              </h2>
            </div>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2 border">Category</th>
                  <th className="p-2 border w-24">Allocation</th>
                  <th className="p-2 border w-16">Share</th>
                  <th className="p-2 border">Strategic Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {budget.categories.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="p-2 border font-bold">{c.name}</td>
                    <td className="p-2 border font-mono">{formatExactINR(c.amount)}</td>
                    <td className="p-2 border font-mono">{c.percent}%</td>
                    <td className="p-2 border text-slate-600 font-light">{c.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Day-of Run of Show */}
          <div className="space-y-3 page-break-before">
            <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
              2. Day-of Run of Show (Hour-by-Hour Protocol)
            </h2>
            <div className="border border-slate-200 divide-y text-xs">
              {timeline.run_of_show.map((ros, idx) => (
                <div key={idx} className="p-2.5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold w-20 text-rose-700">{ros.time}</span>
                    <div>
                      <div className="font-bold text-slate-900">{ros.title}</div>
                      <div className="text-[11px] text-slate-500">{ros.notes}</div>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-600 shrink-0">
                    <div>{ros.location}</div>
                    <div className="font-semibold text-slate-700">{ros.owner}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Vendor Registry & Balances */}
          <div className="space-y-3">
            <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
              3. Vendor Registry & Status
            </h2>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2 border">Vendor / Business</th>
                  <th className="p-2 border">Category</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Quote</th>
                  <th className="p-2 border">Advance</th>
                  <th className="p-2 border">Balance Due</th>
                  <th className="p-2 border">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} className="border-b">
                    <td className="p-2 border font-bold">
                      {v.name}
                      <div className="text-[10px] text-slate-500 font-normal">{v.contact}</div>
                    </td>
                    <td className="p-2 border">{v.category}</td>
                    <td className="p-2 border capitalize font-semibold">
                      {v.status.replace('_', ' ')}
                    </td>
                    <td className="p-2 border font-mono">{formatExactINR(v.quote)}</td>
                    <td className="p-2 border font-mono text-emerald-700">
                      {formatExactINR(v.advance_paid)}
                    </td>
                    <td className="p-2 border font-mono text-rose-700">
                      {formatExactINR(v.balance)}
                    </td>
                    <td className="p-2 border font-mono">{formatDate(v.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 5: Risk & Contingency Protocols */}
          <div className="space-y-3">
            <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
              4. Key Risks & Concrete Backup Plans
            </h2>
            <div className="space-y-2.5 text-xs">
              {risks.map((r) => (
                <div key={r.id} className="p-3 bg-slate-50 border rounded-lg space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      {r.title} ({r.severity.toUpperCase()} SEVERITY)
                    </span>
                    <span className="text-slate-500">{r.category}</span>
                  </div>
                  <p className="text-slate-700 font-light">
                    <strong>Mitigation:</strong> {r.mitigation}
                  </p>
                  <p className="text-rose-700 font-medium">
                    <strong>Backup Plan:</strong> {r.backup_plan}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Document Footer */}
          <div className="pt-6 border-t text-center text-[10px] text-slate-400">
            Generated with PlanIt GenAI Event Planning Assistant • Confidential Master Document
          </div>
        </div>
      </div>
    </div>
  );
};
