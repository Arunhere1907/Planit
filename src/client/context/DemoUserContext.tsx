import React, { createContext, useContext, useState } from 'react';
import type { UserRole } from '../../shared/types/index.js';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  title: string;
}

export const DEMO_USERS_LIST: DemoUser[] = [
  {
    id: 'user-demo-1',
    name: 'Aarav Patel',
    email: 'aarav.patel@example.com',
    role: 'owner',
    avatar: 'AP',
    title: 'Lead Host / Event Owner',
  },
  {
    id: 'user-demo-2',
    name: 'Diya Shah',
    email: 'diya.shah@example.com',
    role: 'editor',
    avatar: 'DS',
    title: 'Co-Planner / Editor',
  },
  {
    id: 'user-demo-3',
    name: 'Uncle Kirit',
    email: 'kiritbhai@example.com',
    role: 'viewer',
    avatar: 'UK',
    title: 'Family Elder / Viewer Only',
  },
];

interface DemoUserContextType {
  currentUser: DemoUser;
  switchUser: (userId: string) => void;
  canEdit: boolean;
  isOwner: boolean;
}

const DemoUserContext = createContext<DemoUserContextType | undefined>(undefined);

/**
 * Demo User Provider - Manages client-side user selection
 *
 * SECURITY MODEL:
 * - localStorage stores ONLY user ID and role (no secrets, passwords, or tokens)
 * - Client-side role (canEdit, isOwner) is for UI convenience ONLY
 * - Server NEVER trusts client-side role - validates every request against event membership
 * - All mutations require server-side authorization via requireEventRole() middleware
 * - Tampering with localStorage CANNOT bypass server authorization or access other users' data
 * - This is a demo/prototype system - production would use real authentication (JWT, session, OAuth)
 */
export const DemoUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<DemoUser>(() => {
    const saved = localStorage.getItem('planit_demo_user');
    return DEMO_USERS_LIST.find((u) => u.id === saved) || DEMO_USERS_LIST[0];
  });

  const switchUser = (userId: string) => {
    const found = DEMO_USERS_LIST.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('planit_demo_user', found.id);
      localStorage.setItem('planit_user_role', found.role);
    }
  };

  // NOTE: These are UI hints only - server enforces actual permissions
  const canEdit = currentUser.role === 'owner' || currentUser.role === 'editor';
  const isOwner = currentUser.role === 'owner';

  return (
    <DemoUserContext.Provider value={{ currentUser, switchUser, canEdit, isOwner }}>
      {children}
    </DemoUserContext.Provider>
  );
};

export function useDemoUser(): DemoUserContextType {
  const context = useContext(DemoUserContext);
  if (!context) {
    throw new Error('useDemoUser must be used within a DemoUserProvider');
  }
  return context;
}
