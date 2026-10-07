import { Router } from 'express';
import { optionalAuth, protect, adminOnly, publicCache } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reorderSchema } from '../validators/common.js';

// Public reads (cached), admin-only writes. /reorder is declared before /:id on purpose.
export function buildCrudRouter(crud, { create, update }) {
  const router = Router();
  const admin = [protect, adminOnly];
  router.get('/', optionalAuth, publicCache(60), crud.list);
  router.patch('/reorder', ...admin, validate(reorderSchema), crud.reorder);
  router.get('/:id', optionalAuth, publicCache(60), crud.getOne);
  router.post('/', ...admin, validate(create), crud.create);
  router.put('/:id', ...admin, validate(update), crud.update);
  router.delete('/:id', ...admin, crud.remove);
  return router;
}
