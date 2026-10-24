import { Request, Response } from 'express';
import { budgetService } from '../services/budget.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { CONSTANTS } from '../config/constants.js';

export const getBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await budgetService.getBudget(req.params.id);
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ data: budget });
});

export const addExpense = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  const budget = await budgetService.addExpense(req.params.id, req.body, user);
  res.status(CONSTANTS.HTTP_STATUS.CREATED).json({ data: budget });
});

export const updateCategoryAllocation = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user || { id: 'user_owner_1', name: 'Aarav Patel' };
  const { allocated, isLocked } = req.body;
  const budget = await budgetService.updateCategoryAllocation(
    req.params.id,
    req.params.categoryName,
    allocated,
    Boolean(isLocked),
    user
  );
  res.status(CONSTANTS.HTTP_STATUS.OK).json({ data: budget });
});
