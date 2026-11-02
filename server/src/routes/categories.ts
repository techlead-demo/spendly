import { Router } from 'express';
import { validationError } from '../errors.js';
import type { CategoryService } from '../services/categoryService.js';

function parseId(id: string): number {
  const value = /^[1-9]\d*$/.test(id) ? Number(id) : NaN;
  if (!Number.isSafeInteger(value)) {
    throw validationError('id must be a positive integer');
  }
  return value;
}

/** The `name` of an add or rename body; BR-23 (trimming, length, uniqueness) is checked by the service. */
function parseName(body: unknown): string {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw validationError('request body must be a JSON object');
  }
  const { name } = body as Record<string, unknown>;
  if (typeof name !== 'string') {
    throw validationError('name is required and must be a string');
  }
  return name;
}

export function categoriesRouter(categories: CategoryService): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ items: categories.listCategories() });
  });

  router.post('/', (req, res) => {
    res.status(201).json(categories.addCategory(parseName(req.body)));
  });

  router.patch('/:id', (req, res) => {
    const id = parseId(req.params.id);
    res.json(categories.renameCategory(id, parseName(req.body)));
  });

  router.post('/:id/retire', (req, res) => {
    res.json(categories.retireCategory(parseId(req.params.id)));
  });

  router.post('/:id/restore', (req, res) => {
    res.json(categories.restoreCategory(parseId(req.params.id)));
  });

  return router;
}
