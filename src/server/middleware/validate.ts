import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../errors/app-error.js";

/**
 * Reusable middleware to validate req.body against a Zod schema
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
