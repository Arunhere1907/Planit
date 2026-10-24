import { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "../errors/app-error.js";
import { logger } from "../utils/logger.js";

/**
 * Central Express Error Handler
 * Standardizes all error responses to: { error: { code, message, details? } }
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.code}] ${err.statusCode} on ${req.method} ${req.path}: ${err.message}`);
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle unforeseen runtime errors
  const standardError = err instanceof Error ? err : new Error(String(err));
  logger.error(`Unhandled Exception on ${req.method} ${req.path}`, standardError);

  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: "An internal server error occurred. Please try again.",
    },
  });
}
