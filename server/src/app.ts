import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { errorHandler, notFoundHandler } from './errors.js';
import { createBudgetRepository } from './repositories/budgetRepository.js';
import { createCategoryRepository } from './repositories/categoryRepository.js';
import { createExpenseRepository } from './repositories/expenseRepository.js';
import { budgetsRouter } from './routes/budgets.js';
import { categoriesRouter } from './routes/categories.js';
import { expensesRouter } from './routes/expenses.js';
import { createBudgetService } from './services/budgetService.js';
import { createExpenseService } from './services/expenseService.js';

export interface AppOptions {
  /** Clock for rules that depend on today (BR-18); tests pass a fixed date. */
  now?: () => Date;
}

/** Builds the Express app on top of an open database. Tests call this with an in-memory database. */
export function createApp(db: DatabaseSync, { now = () => new Date() }: AppOptions = {}): express.Express {
  const categories = createCategoryRepository(db);
  const expenses = createExpenseService(createExpenseRepository(db), categories);
  const budgets = createBudgetService(createBudgetRepository(db), categories, now);

  const app = express();
  app.use(express.json());

  const api = express.Router();
  api.use('/categories', categoriesRouter(categories));
  api.use('/expenses', expensesRouter(expenses));
  api.use('/budgets', budgetsRouter(budgets));
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
