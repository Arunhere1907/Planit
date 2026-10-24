import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../../shared/types/index.js';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
}

export const DEMO_USERS_LIST: DemoUser[] = [
  {
    id: 'user_owner_1',
    name: 'Aarav Patel',
    email: 'aarav@planit.demo',
    role: 'owner',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'user_editor_1',
    name: 'Diya Shah',
    email: 'diya@planit.demo',
    role: 'editor',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'user_viewer_1',
    name: 'Uncle Kirit',
    email: 'kirit@planit.demo',
    role: 'viewer',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
  }
];

interface DemoUserContextType {
  currentUser: DemoUser;
  switchUser: (userId: string) => void;
  canEdit: boolean;
  isOwner: boolean;
}

const DemoUserContext = createContext<DemoUserContextType | undefined>(undefined);

export const DemoUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<DemoUser>(() => {
    const saved = localStorage.getItem('planit_demo_user');
    return DEMO_USERS_LIST.find(u => u.id === saved) || DEMO_USERS_LIST[0];
  });

  const switchUser = (userId: string) => {
    const found = DEMO_USERS_LIST.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('planit_demo_user', found.id);
    }
  };

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
