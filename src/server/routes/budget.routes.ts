import { Router } from 'express';
import { getBudget, addExpense, updateCategoryAllocation } from '../controllers/budget.controller.js';
import { validateBody } from '../middleware/validate.js';
import { ExpenseItemSchema } from '../../shared/schemas/zod-schemas.js';
import { requireRole } from '../middleware/demo-user.js';
import { z } from 'zod';

const router = Router();

const UpdateAllocationSchema = z.object({
  allocated: z.number().int().nonnegative(),
  isLocked: z.boolean().optional()
});

router.get('/:id/budget', getBudget);
router.post(
  '/:id/budget/expenses',
  requireRole('owner', 'editor'),
  validateBody(ExpenseItemSchema.omit({ id: true })),
  addExpense
);
router.put(
  '/:id/budget/categories/:categoryName',
  requireRole('owner', 'editor'),
  validateBody(UpdateAllocationSchema),
  updateCategoryAllocation
);

export default router;
