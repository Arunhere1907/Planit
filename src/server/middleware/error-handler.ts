import { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "../errors/app-error.js";
import { logger } from "../utils/logger.js";

/**
 * Central Express Error Handler
 * Standardizes all error responses to: { error: { code, message, details? } }
 * 
 * Security measures:
 * - Never exposes stack traces or internal details in production
 * - Scrubs sensitive data from error details
 * - Logs errors securely without exposing secrets
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Sanitize error details before sending to client
 * Remove any potential sensitive data
 */
function sanitizeErrorDetails(details: unknown): unknown {
  if (!details) return undefined;

  // In production, be extra cautious with error details
  if (isProduction) {
    // Only allow simple objects with known-safe fields
    if (typeof details === 'object' && details !== null && !Array.isArray(details)) {
      const safeDetails: Record<string, unknown> = {};
      const obj = details as Record<string, unknown>;
      
      // Only include validation errors and similar safe details
      if (obj.field) safeDetails.field = String(obj.field).substring(0, 100);
      if (obj.code) safeDetails.code = String(obj.code).substring(0, 50);
      
      return Object.keys(safeDetails).length > 0 ? safeDetails : undefined;
    }
    
    // Don't expose any other details in production
    return undefined;
  }

  // In development, show more details for debugging
  return details;
}

/**
 * Central Express Error Handler
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Log request details for debugging (but scrub sensitive headers)
  const safeHeaders = { ...req.headers };
  delete safeHeaders.authorization;
  delete safeHeaders['x-api-key'];
  delete safeHeaders.cookie;

  if (err instanceof AppError) {
    logger.warn(`AppError [${err.code}] ${err.statusCode} on ${req.method} ${req.path}: ${err.message}`, {
      statusCode: err.statusCode,
      code: err.code,
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 200),
    });
    
    // Sanitize details before sending to client
    const safeDetails = sanitizeErrorDetails(err.details);
    
    const response: {
      error: {
        code: string;
        message: string;
        statusCode: number;
        details?: unknown;
      };
    } = {
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      },
    };
    
    if (safeDetails) {
      response.error.details = safeDetails;
    }
    
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unforeseen runtime errors
  const standardError = err instanceof Error ? err : new Error(String(err));
  
  // Log full error server-side (logger will scrub sensitive data and omit stack in prod)
  logger.error(`Unhandled Exception on ${req.method} ${req.path}`, {
    error: standardError,
    ip: req.ip,
    userAgent: req.get('user-agent')?.substring(0, 200),
  });

  // NEVER expose internal error details, stack traces, or error messages in production
  const clientMessage = isProduction
    ? "An internal server error occurred. Please try again."
    : standardError.message; // In dev, show actual error for debugging

  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: clientMessage,
      statusCode: 500,
      // Stack trace NEVER included in response (security risk)
    },
  });
}
