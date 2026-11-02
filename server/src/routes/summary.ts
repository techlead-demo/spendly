import { Router } from 'express';
import { validationError } from '../errors.js';
import { isMonth } from '../lib/dates.js';
import type { ExpenseService } from '../services/expenseService.js';

function parseMonth(query: Record<string, unknown>): string {
  const { month } = query;
  if (typeof month !== 'string' || !isMonth(month)) {
    throw validationError('month is required and must be YYYY-MM');
  }
  return month;
}

export function summaryRouter(expenses: ExpenseService): Router {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(expenses.summarizeMonth(parseMonth(req.query)));
  });

  return router;
}
