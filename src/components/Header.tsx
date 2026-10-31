import React, { useState } from "react";
import {
  Calendar,
  Bell,
  FileDown,
  RefreshCw,
  RotateCcw,
  UserCheck
} from "lucide-react";
import type { EventProfile } from "../types";
import { getDaysRemaining } from "../lib/formatters";

interface HeaderProps {
  currentProfile: EventProfile;
  eventsList: EventProfile[];
  onSelectEvent: (eventId: string) => void;
  onOpenNewEventModal: () => void;
  onOpenReplanModal: () => void;
  onOpenPrintModal: () => void;
  onOpenNotificationModal: () => void;
  onResetDatabase?: () => void;
  unreadNotificationsCount: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProfile,
  eventsList,
  onSelectEvent,
  onOpenNewEventModal,
  onOpenReplanModal,
  onOpenPrintModal,
  onOpenNotificationModal,
  onResetDatabase,
  unreadNotificationsCount,
  activeTab,
  setActiveTab,
}) => {
  const daysLeft = getDaysRemaining(currentProfile.date);

  const [activeUserRole, setActiveUserRole] = useState<string>(() => {
    return localStorage.getItem("planit_user_role") || "owner";
  });

  const handleRoleChange = (role: string) => {
    setActiveUserRole(role);
    localStorage.setItem("planit_user_role", role);
    const userId = role === "owner" ? "user_owner_1" : role === "editor" ? "user_editor_1" : "user_viewer_1";
    localStorage.setItem("planit_demo_user", userId);
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "budget", label: "Budget & Expenses" },
    { id: "timeline", label: "Timeline & Run-of-Show" },
    { id: "vendors", label: "Vendors & Places" },
    { id: "ideas", label: "Curated Ideas" },
    { id: "invitations", label: "Invitations & Copy" },
    { id: "risks", label: "Risk Advisor" },
    { id: "collaborators", label: "Team & Log" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Event Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-amber-500 flex items-center justify-center shadow-xs text-white font-black text-xl tracking-wider">
                P
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 tracking-tight text-lg">PlanIt</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    GenAI
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block font-medium">Event Planning Intelligence</p>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block" />

            {/* Event Dropdown Selector */}
            <div className="relative">
              <select
                value={currentProfile.id}
                onChange={(e) => {
                  if (e.target.value === "new") {
                    onOpenNewEventModal();
                  } else {
                    onSelectEvent(e.target.value);
                  }
                }}
                aria-label="Select event"
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs sm:text-sm font-semibold rounded-lg pl-3 pr-8 py-1.5 border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[200px] sm:max-w-[280px] truncate"
              >
                {eventsList.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.city})
                  </option>
                ))}
                <option value="new">+ Create / Intake New Event...</option>
              </select>
            </div>
          </div>

          {/* Quick Metrics, Role Switcher & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Demo User Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-500 ml-1" />
              <select
                value={activeUserRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                title="Switch demo user role to test permissions"
                aria-label="Demo User Role Switcher"
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer pr-1"
              >
                <option value="owner">Aarav (Owner)</option>
                <option value="editor">Diya (Editor)</option>
                <option value="viewer">Kirit (Viewer)</option>
              </select>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                  activeUserRole === "owner"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : activeUserRole === "editor"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {activeUserRole}
              </span>
            </div>

            {/* Countdown Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-800">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>{daysLeft > 0 ? `${daysLeft} days to go` : "Event is today!"}</span>
            </div>

            {/* Replan Button */}
            <button
              onClick={onOpenReplanModal}
              title="Replan when budget, guests or date changes"
              aria-label="Replan event when budget, guests, or date changes"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Replan</span>
            </button>

            {/* Export Document Button */}
            <button
              onClick={onOpenPrintModal}
              title="Export complete plan to PDF or print"
              aria-label="Export complete plan to PDF or print"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Export Plan</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotificationModal}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Reminders & Notifications"
              aria-label={`Reminders and notifications${unreadNotificationsCount > 0 ? ` (${unreadNotificationsCount} unread)` : ''}`}
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full ring-2 ring-white animate-pulse" aria-hidden="true" />
              )}
            </button>

            {/* Reset In-Memory Seed Button */}
            {onResetDatabase && (
              <button
                onClick={onResetDatabase}
                title="Reset database to initial seed data"
                aria-label="Reset database to initial seed data"
                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Strictly Indigo Active State, NO RED!) */}
        <nav 
          className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-1.5 border-t border-slate-100 text-xs sm:text-sm font-medium"
          aria-label="Main navigation"
          role="navigation"
        >
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative whitespace-nowrap px-3 py-2 rounded-lg transition-all cursor-pointer font-medium ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs after:content-[''] after:absolute after:bottom-0.5 after:left-3 after:right-3 after:h-[3px] after:bg-indigo-600 after:rounded-full"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
