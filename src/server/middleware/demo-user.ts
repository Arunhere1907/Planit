import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../shared/types/index.js';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const DEMO_USERS: Record<string, AuthenticatedUser> = {
  'user-demo-1': {
    id: 'user-demo-1',
    name: 'Aarav Patel',
    email: 'aarav.patel@example.com',
    role: 'owner',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  'user_owner_1': {
    id: 'user-demo-1',
    name: 'Aarav Patel',
    email: 'aarav.patel@example.com',
    role: 'owner',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  'user-demo-2': {
    id: 'user-demo-2',
    name: 'Diya Shah',
    email: 'diya.shah@example.com',
    role: 'editor',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
  },
  'user_editor_1': {
    id: 'user-demo-2',
    name: 'Diya Shah',
    email: 'diya.shah@example.com',
    role: 'editor',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
  },
  'user-demo-3': {
    id: 'user-demo-3',
    name: 'Uncle Kirit',
    email: 'kiritbhai@example.com',
    role: 'viewer',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
  'user_viewer_1': {
    id: 'user-demo-3',
    name: 'Uncle Kirit',
    email: 'kiritbhai@example.com',
    role: 'viewer',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
};


/**
 * Resolves the acting user from the x-demo-user-id header, default to owner
 */
export function demoUserMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const headerUserId = req.header('x-demo-user-id') || 'user_owner_1';
  const user = DEMO_USERS[headerUserId] || DEMO_USERS['user_owner_1'];
  req.user = user;
  next();
}

/**
 * Middleware that requires one of the allowed roles
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Action requires role in [${allowedRoles.join(', ')}], current role is '${req.user.role}'`
        )
      );
    }
    next();
  };
}
