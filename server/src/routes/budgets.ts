import { Router } from 'express';
import { validationError } from '../errors.js';
import { isMonth } from '../lib/dates.js';
import type { BudgetService } from '../services/budgetService.js';
import type { Budget, MonthBudgets } from '../types.js';

const MONTH_MESSAGE = 'month is required and must be YYYY-MM';

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function parseMonth(month: unknown): string {
  if (typeof month !== 'string' || !isMonth(month)) {
    throw validationError(MONTH_MESSAGE);
  }
  return month;
}

function parseBudget(item: unknown, index: number): Budget {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    throw validationError(`items[${index}] must be an object`);
  }
  const { categoryId, amountMinor } = item as Record<string, unknown>;
  if (!isPositiveInteger(categoryId)) {
    throw validationError(`items[${index}].categoryId is required and must be a positive integer`);
  }
  // BR-17: a budget is a whole number of đồng, at least 1; null removes it.
  if (amountMinor !== null && !isPositiveInteger(amountMinor)) {
    throw validationError(`items[${index}].amountMinor must be a whole number greater than 0, or null`);
  }
  return { categoryId, amountMinor };
}

function parseBudgetChange(body: unknown): MonthBudgets {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw validationError('request body must be a JSON object');
  }
  const { month, items } = body as Record<string, unknown>;
  const parsedMonth = parseMonth(month);
  if (!Array.isArray(items) || items.length === 0) {
    throw validationError('items is required and must be a non-empty array');
  }
  const budgets = items.map(parseBudget);
  const seen = new Set<number>();
  for (const budget of budgets) {
    if (seen.has(budget.categoryId)) {
      throw validationError(`categoryId ${budget.categoryId} is listed more than once`);
    }
    seen.add(budget.categoryId);
  }
  return { month: parsedMonth, items: budgets };
}

export function budgetsRouter(budgets: BudgetService): Router {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(budgets.getBudgets(parseMonth(req.query.month)));
  });

  router.get('/over', (req, res) => {
    res.json(budgets.getOverBudget(parseMonth(req.query.month)));
  });

  router.put('/', (req, res) => {
    res.json(budgets.setBudgets(parseBudgetChange(req.body)));
  });

  return router;
}
