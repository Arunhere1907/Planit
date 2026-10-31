import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async route handler to catch errors and pass them to the central error middleware
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
