import { Router } from 'express';
import { validationError } from '../errors.js';
import { isDate, isMonth } from '../lib/dates.js';
import type { ExpenseFilter } from '../repositories/expenseRepository.js';
import { NOTE_MAX_LENGTH, type ExpenseService } from '../services/expenseService.js';
import type { NewExpense } from '../types.js';

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

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function parseId(id: string): number {
  const value = /^[1-9]\d*$/.test(id) ? Number(id) : NaN;
  if (!Number.isSafeInteger(value)) {
    throw validationError('id must be a positive integer');
  }
  return value;
}

function parseNewExpense(body: unknown): NewExpense {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw validationError('request body must be a JSON object');
  }
  const { date, amountMinor, categoryId, note } = body as Record<string, unknown>;
  if (typeof date !== 'string' || !isDate(date)) {
    throw validationError('date is required and must be a valid YYYY-MM-DD date');
  }
  if (!isPositiveInteger(amountMinor)) {
    throw validationError('amountMinor is required and must be a whole number greater than 0');
  }
  if (!isPositiveInteger(categoryId)) {
    throw validationError('categoryId is required and must be a positive integer');
  }
  if (note !== undefined && note !== null && typeof note !== 'string') {
    throw validationError('note must be a string or null');
  }
  // BR-11: the note is trimmed, at most NOTE_MAX_LENGTH characters, and a blank note is no note.
  const trimmed = note?.trim() ?? '';
  if (trimmed.length > NOTE_MAX_LENGTH) {
    throw validationError(`note must be at most ${NOTE_MAX_LENGTH} characters`);
  }
  return { date, amountMinor, categoryId, note: trimmed === '' ? null : trimmed };
}

export function expensesRouter(expenses: ExpenseService): Router {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(expenses.listExpenses(parseListQuery(req.query)));
  });

  router.post('/', (req, res) => {
    res.status(201).json(expenses.createExpense(parseNewExpense(req.body)));
  });

  router.get('/:id', (req, res) => {
    res.json(expenses.getExpense(parseId(req.params.id)));
  });

  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    res.json(expenses.updateExpense(id, parseNewExpense(req.body)));
  });

  router.delete('/:id', (req, res) => {
    expenses.deleteExpense(parseId(req.params.id));
    res.status(204).end();
  });

  router.post('/:id/restore', (req, res) => {
    res.json(expenses.restoreExpense(parseId(req.params.id)));
  });

  return router;
}
