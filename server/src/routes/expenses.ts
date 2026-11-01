import { Router } from 'express';
import { validationError } from '../errors.js';
import { isMonth } from '../lib/dates.js';
import type { ExpenseFilter } from '../repositories/expenseRepository.js';
import type { ExpenseService } from '../services/expenseService.js';

function parseListQuery(query: Record<string, unknown>): ExpenseFilter {
  const { month, categoryId } = query;
  if (typeof month !== 'string' || !isMonth(month)) {
    throw validationError('month is required and must be YYYY-MM');
  }
  if (categoryId === undefined) {
    return { month };
  }
  if (typeof categoryId !== 'string' || !/^[1-9]\d*$/.test(categoryId)) {
    throw validationError('categoryId must be a positive integer');
  }
  return { month, categoryId: Number(categoryId) };
}

export function expensesRouter(expenses: ExpenseService): Router {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(expenses.listExpenses(parseListQuery(req.query)));
  });

  return router;
}
