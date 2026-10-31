import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../../shared/types/index.js';
import { ForbiddenError, UnauthorizedError, NotFoundError } from '../errors/app-error.js';
import { eventRepository } from '../repositories/index.js';

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
  const headerRole = req.header('x-demo-user-role') as UserRole | undefined;
  let user = DEMO_USERS[headerUserId] || DEMO_USERS['user_owner_1'];
  if (headerRole) {
    user = { ...user, role: headerRole };
  }
  req.user = user;
  next();
}

/**
 * Middleware that requires one of the allowed roles (for global actions)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    const effectiveRole = (req.header('x-demo-user-role') as UserRole) || req.user.role;
    if (!allowedRoles.includes(effectiveRole)) {
      return next(
        new ForbiddenError(
          `Insufficient permissions: Action requires role in [${allowedRoles.join(', ')}], current role is '${effectiveRole}'`
        )
      );
    }
    next();
  };
}

/**
 * IDOR Protection: Verify user is a member/owner of the event before allowing access
 * This middleware prevents users from accessing events they don't belong to
 * 
 * @param requiredRoles - Optional roles required for the action (e.g., ['owner', 'editor'])
 */
export function requireEventAccess(requiredRoles?: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      // Extract event ID from params (supports :id, :eventId patterns)
      const eventId = req.params.id || req.params.eventId;
      if (!eventId) {
        return next(new Error('Event ID parameter missing'));
      }

      // Fetch the event
      const event = await eventRepository.findById(eventId);
      if (!event) {
        return next(new NotFoundError(`Event with id '${eventId}' not found`));
      }

      // Check if user is a collaborator/member of this event
      // Safe to use non-null assertion: req.user existence is checked above (line 113)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const member = event.collaborators?.find((c) => c.id === req.user!.id);
      if (!member) {
        return next(
          new ForbiddenError(`You do not have access to event '${eventId}'`)
        );
      }

      // If specific roles are required, verify the user's role within THIS event
      if (requiredRoles && requiredRoles.length > 0) {
        const effectiveRole = (req.header('x-demo-user-role') as UserRole) || member.role;
        if (!requiredRoles.includes(effectiveRole)) {
          return next(
            new ForbiddenError(
              `Insufficient permissions: Action requires role in [${requiredRoles.join(', ')}] for this event. Your role: '${effectiveRole}'`
            )
          );
        }
      }

      // Attach event-specific role to request for downstream use
      req.user.role = member.role;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Combined middleware: Check event access AND require specific roles
 * This is the recommended approach for most routes
 */
export function requireEventRole(...allowedRoles: UserRole[]) {
  return requireEventAccess(allowedRoles);
}
