import { Router, Request, Response } from 'express';
import { users } from '../../db/schema/users';

export const usersRouter = Router();

// GET /api/users — returns all users visible to the current firm.
// RLS on the users table (enforced via req.db from tenantContextMiddleware)
// ensures only rows matching the request's firm_id are returned.
usersRouter.get('/', async (req: Request, res: Response) => {
  const rows = await req.db.select().from(users);
  res.json(rows);
});
