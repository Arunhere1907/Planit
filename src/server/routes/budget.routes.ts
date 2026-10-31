import { Router } from 'express';
import {
  getBudget,
  addExpense,
  updateCategoryAllocation,
} from '../controllers/budget.controller.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { ExpenseItemSchema } from '../../shared/schemas/zod-schemas.js';
import { EventIdParamSchema } from '../validation/request-schemas.js';
import { requireEventAccess, requireEventRole } from '../middleware/demo-user.js';
import { z } from 'zod';

const router = Router();

// Category ID param schema (for /category/:categoryId route)
const CategoryIdParamSchema = z
  .object({
    id: z.string().min(1),
    categoryId: z.string().min(1),
  })
  .strict();

router.get('/:id/budget', validateParams(EventIdParamSchema), requireEventAccess(), getBudget);

// Support both /expenses (API client) and /expense (test convention)
router.post(
  ['/:id/budget/expenses', '/:id/budget/expense'],
  validateParams(EventIdParamSchema),
  requireEventRole('owner', 'editor'),
  validateBody(ExpenseItemSchema.omit({ id: true })),
  addExpense
);

// Support both /categories/:name (API client) and /category/:id (test convention)
router.patch(
  ['/:id/budget/categories/:categoryName', '/:id/budget/category/:categoryId'],
  validateParams(CategoryIdParamSchema),
  requireEventRole('owner', 'editor'),
  updateCategoryAllocation
);

export default router;
