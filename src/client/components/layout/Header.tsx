import React from 'react';
import {
  Calendar,
  Bell,
  FileDown,
  RefreshCw,
  RotateCcw,
  UserCheck
} from 'lucide-react';
import { EventProfile } from '../../../shared/types/index.js';
import { useDemoUser, DEMO_USERS_LIST } from '../../context/DemoUserContext.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';

interface HeaderProps {
  currentProfile?: EventProfile;
  eventsList: Array<{ id: string; title: string; city: string }>;
  onSelectEvent: (eventId: string) => void;
  onOpenNewEventModal: () => void;
  onOpenReplanModal: () => void;
  onOpenPrintModal: () => void;
  onOpenNotificationModal: () => void;
  onResetDatabase: () => void;
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
  setActiveTab
}) => {
  const { currentUser, switchUser } = useDemoUser();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'budget', label: 'Budget & Expenses' },
    { id: 'timeline', label: 'Timeline & Milestones' },
    { id: 'vendors', label: 'Vendors & Places' },
    { id: 'ideas', label: 'Creative Ideas' },
    { id: 'invitations', label: 'Invitations & Copy' },
    { id: 'risks', label: 'Risk Matrix' },
    { id: 'collaborators', label: 'Team & Activity' }
  ];

  // Calculate days left
  const daysLeft = currentProfile?.date
    ? Math.ceil(
        (new Date(currentProfile.date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
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
                  <Badge variant="primary" size="sm">
                    GenAI
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block font-medium">Event Planning Assistant</p>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block" />

            {/* Event Dropdown Selector */}
            <div className="relative">
              <select
                value={eventsList.find(e => e.title === currentProfile?.title)?.id || eventsList[0]?.id || ''}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    onOpenNewEventModal();
                  } else {
                    onSelectEvent(e.target.value);
                  }
                }}
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs sm:text-sm font-semibold rounded-lg pl-3 pr-8 py-1.5 border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
              >
                {eventsList.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.city})
                  </option>
                ))}
                <option value="new">+ Intake / New Event...</option>
              </select>
            </div>
          </div>

          {/* Quick Metrics, Role Switcher, & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Countdown Badge */}
            {currentProfile && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-800">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>{daysLeft > 0 ? `${daysLeft} days to go` : 'Event is today!'}</span>
              </div>
            )}

            {/* Demo User Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-500 ml-1" />
              <select
                value={currentUser.id}
                onChange={(e) => switchUser(e.target.value)}
                title="Switch demo user role to test permissions"
                aria-label="Demo User Role Switcher"
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer pr-1"
              >
                {DEMO_USERS_LIST.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
              <Badge
                variant={
                  currentUser.role === 'owner'
                    ? 'primary'
                    : currentUser.role === 'editor'
                    ? 'warning'
                    : 'default'
                }
                size="sm"
              >
                {currentUser.role.toUpperCase()}
              </Badge>
            </div>

            {/* Replan Button */}
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
              onClick={onOpenReplanModal}
              title="Replan when budget or guests shift"
              className="hidden sm:inline-flex"
            >
              Replan
            </Button>

            {/* Export Document Button */}
            <Button
              variant="primary"
              size="sm"
              icon={<FileDown className="w-3.5 h-3.5" />}
              onClick={onOpenPrintModal}
              title="Export complete plan dossier"
            >
              <span className="hidden sm:inline">Export Plan</span>
            </Button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotificationModal}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Reminders & Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Reset In-Memory Seed Button */}
            <button
              onClick={onResetDatabase}
              title="Reset dummy data back to default initial seed"
              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Strict Indigo Active State, NO RED!) */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-1.5 border-t border-slate-100 text-xs sm:text-sm font-medium">
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
