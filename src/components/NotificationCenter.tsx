import React, { useState } from "react";
import {
  Bell,
  X,
} from "lucide-react";
import type { FullEventPlan } from "../types";
import { formatDate, formatExactINR } from "../lib/formatters";

interface NotificationCenterProps {
  plan: FullEventPlan;
  onClose: () => void;
  onMarkTaskDone: (taskId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  plan,
  onClose,
  onMarkTaskDone,
}) => {
  const { profile: _profile, timeline, vendors, budget: _budget } = plan;
  const todayStr = new Date().toISOString().split("T")[0];

  // Auto-generate notifications based on live data
  const [snoozedIds, setSnoozedIds] = useState<string[]>([]);

  const notifications = [
    // 1. Overdue or upcoming tasks
    ...timeline.tasks
      .filter((t) => t.status !== "completed" && !snoozedIds.includes(t.id))
      .slice(0, 4)
      .map((t) => ({
        id: t.id,
        type: "task" as const,
        title: `Task Reminder: ${t.title}`,
        detail: `Assigned to ${t.assignee} • Due ${formatDate(t.due_date)}`,
        isOverdue: t.due_date < todayStr,
        actionLabel: "Mark Done",
        actionFn: () => onMarkTaskDone(t.id),
      })),

    // 2. Pending vendor payments
    ...vendors
      .filter((v) => v.balance > 0 && !snoozedIds.includes(`v-${v.id}`))
      .slice(0, 2)
      .map((v) => ({
        id: `v-${v.id}`,
        type: "payment" as const,
        title: `Balance Due: ${v.name}`,
        detail: `Amount: ${formatExactINR(v.balance)} • Due by ${formatDate(v.due_date)}`,
        isOverdue: false,
        actionLabel: "Snooze 3d",
        actionFn: () => setSnoozedIds((prev) => [...prev, `v-${v.id}`]),
      })),

    // 3. Risk notification
    {
      id: "risk-notif-1",
      type: "risk" as const,
      title: "Logistics Alert: 10 PM Sound Curfew",
      detail: "Police noise monitoring in effect. Ensure baraat finishes by 7:30 PM.",
      isOverdue: false,
      actionLabel: "Acknowledged",
      actionFn: () => setSnoozedIds((prev) => [...prev, "risk-notif-1"]),
    },
  ];

  const handleSnooze = (id: string) => {
    setSnoozedIds([...snoozedIds, id]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-end">
      <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Notification Center</h3>
                <p className="text-xs text-slate-500">Milestone dues, reminders & alerts</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                All caught up! No pending reminders.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                    notif.isOverdue
                      ? "bg-red-50/60 border-red-200"
                      : notif.type === "payment"
                      ? "bg-amber-50/60 border-amber-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-slate-900">{notif.title}</div>
                    {notif.isOverdue && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        Overdue
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 font-light">{notif.detail}</div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleSnooze(notif.id)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Snooze
                    </button>
                    <button
                      onClick={notif.actionFn}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold text-[11px] rounded-lg border border-slate-200 shadow-2xs transition-colors"
                    >
                      {notif.actionLabel}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
