import { Router } from 'express';
import type { CategoryRepository } from '../repositories/categoryRepository.js';

export function categoriesRouter(categories: CategoryRepository): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ items: categories.findAll() });
  });

  return router;
}
