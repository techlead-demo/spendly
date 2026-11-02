import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { errorHandler, notFoundHandler } from './errors.js';
import { createCategoryRepository } from './repositories/categoryRepository.js';
import { createExpenseRepository } from './repositories/expenseRepository.js';
import { categoriesRouter } from './routes/categories.js';
import { expensesRouter } from './routes/expenses.js';
import { summaryRouter } from './routes/summary.js';
import { createExpenseService } from './services/expenseService.js';

/** Builds the Express app on top of an open database. Tests call this with an in-memory database. */
export function createApp(db: DatabaseSync): express.Express {
  const categories = createCategoryRepository(db);
  const expenses = createExpenseService(createExpenseRepository(db), categories);

  const app = express();
  app.use(express.json());

  const api = express.Router();
  api.use('/categories', categoriesRouter(categories));
  api.use('/expenses', expensesRouter(expenses));
  api.use('/summary', summaryRouter(expenses));
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
