import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema } from "zod";
import { ValidationError } from "../errors/app-error.js";

/**
 * Reusable middleware to validate req.body against a Zod schema
 * Rejects unknown fields by default for security
 */
export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues || [];
      const formatted = issues.map((e: { path: PropertyKey[]; message: string }) => `${e.path.map(String).join(".")}: ${e.message}`).join(", ");
      return next(new ValidationError(`Validation failed: ${formatted}`, result.error.format()));
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validate req.params against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const issues = result.error.issues || [];
      const formatted = issues.map((e: { path: PropertyKey[]; message: string }) => `${e.path.map(String).join(".")}: ${e.message}`).join(", ");
      return next(new ValidationError(`Invalid parameters: ${formatted}`, result.error.format()));
    }
    req.params = result.data as typeof req.params;
    next();
  };
}

/**
 * Validate req.query against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error.issues || [];
      const formatted = issues.map((e: { path: PropertyKey[]; message: string }) => `${e.path.map(String).join(".")}: ${e.message}`).join(", ");
      return next(new ValidationError(`Invalid query parameters: ${formatted}`, result.error.format()));
    }
    req.query = result.data as typeof req.query;
    next();
  };
}

/**
 * Combined validation for body, params, and query
 */
export function validate(config: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}): RequestHandler[] {
  const middlewares: RequestHandler[] = [];
  
  if (config.body) {
    middlewares.push(validateBody(config.body));
  }
  if (config.params) {
    middlewares.push(validateParams(config.params));
  }
  if (config.query) {
    middlewares.push(validateQuery(config.query));
  }
  
  return middlewares;
}
