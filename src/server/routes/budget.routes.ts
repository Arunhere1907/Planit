import { Router } from 'express';
import { getBudget, addExpense, updateCategoryAllocation } from '../controllers/budget.controller.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { ExpenseItemSchema } from '../../shared/schemas/zod-schemas.js';
import { BudgetCategoryUpdateSchema, CategoryNameParamSchema, EventIdParamSchema } from '../validation/request-schemas.js';
import { requireEventAccess, requireEventRole } from '../middleware/demo-user.js';

const router = Router();

router.get('/:id/budget', validateParams(EventIdParamSchema), requireEventAccess(), getBudget);
router.post(
  '/:id/budget/expenses',
  validateParams(EventIdParamSchema),
  requireEventRole('owner', 'editor'),
  validateBody(ExpenseItemSchema.omit({ id: true })),
  addExpense
);
router.put(
  '/:id/budget/categories/:categoryName',
  validateParams(CategoryNameParamSchema),
  requireEventRole('owner', 'editor'),
  validateBody(BudgetCategoryUpdateSchema),
  updateCategoryAllocation
);

export default router;
