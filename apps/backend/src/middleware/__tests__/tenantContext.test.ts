/**
 * Integration test: tenantContextMiddleware wires RLS into every request.
 *
 * Uses a minimal Express app so we don't need MongoDB running.
 * Auth is stubbed: the real authenticateToken verifies the JWT and looks up
 * the user in MongoDB, then sets req.context. Here we do just the JWT decode
 * step — the tenant isolation behaviour we're testing lives entirely in
 * tenantContextMiddleware and Postgres.
 */
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db, sql as pgClient } from '../../db/postgres';
import { firms } from '../../db/schema/firms';
import { users } from '../../db/schema/users';
import { tenantContextMiddleware } from '../tenantContext';

// ---------------------------------------------------------------------------
// Minimal JWT auth stub — decodes token and sets req.context.
// Mirrors what auth.js does, minus the Mongoose lookup.
// ---------------------------------------------------------------------------
function jwtAuthStub(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return void res.status(401).json({ message: 'No token' });

  try {
    const secret =
      process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? '';
    const decoded = jwt.verify(token, secret) as Record<string, string>;
    req.context = {
      firmId: decoded.firm_id,
      userId: decoded.user_id,
      role: decoded.role,
    };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

/** Signs a short-lived token carrying firm_id. */
function issueToken(firmId: string, userId: string, role = 'admin') {
  const secret =
    process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? '';
  return jwt.sign({ firm_id: firmId, user_id: userId, role }, secret, {
    expiresIn: '15m',
  });
}

// ---------------------------------------------------------------------------
// Build the minimal test app once — reused across all tests.
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

// Stack: JWT stub → tenant context → route handler.
app.get(
  '/test/users',
  jwtAuthStub,
  tenantContextMiddleware,
  async (req: Request, res: Response) => {
    const rows = await req.db.select().from(users);
    res.json(rows);
  },
);

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
let firmAId: string;
let firmBId: string;
let tokenA: string;
let tokenB: string;

beforeAll(async () => {
  const tag = Date.now();

  const [firmA] = await db
    .insert(firms)
    .values({ name: 'Tenant Test Firm A', slug: `tenant-a-${tag}` })
    .returning();
  firmAId = firmA.id;

  const [firmB] = await db
    .insert(firms)
    .values({ name: 'Tenant Test Firm B', slug: `tenant-b-${tag}` })
    .returning();
  firmBId = firmB.id;

  // Users must be inserted inside withFirmContext (RLS WITH CHECK requires it).
  const { withFirmContext } = await import('../../db/postgres');

  await withFirmContext(firmAId, (tx) =>
    tx.insert(users).values({
      firm_id: firmAId,
      email: `alice-${tag}@firma.test`,
      password_hash: 'hash-a',
      role: 'admin',
    }),
  );

  await withFirmContext(firmBId, (tx) =>
    tx.insert(users).values({
      firm_id: firmBId,
      email: `bob-${tag}@firmb.test`,
      password_hash: 'hash-b',
      role: 'admin',
    }),
  );

  tokenA = issueToken(firmAId, 'user-a-id');
  tokenB = issueToken(firmBId, 'user-b-id');
});

afterAll(async () => {
  if (firmAId) await db.delete(firms).where(eq(firms.id, firmAId));
  if (firmBId) await db.delete(firms).where(eq(firms.id, firmBId));
  await pgClient.end();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('tenantContextMiddleware: RLS-scoped request db', () => {
  it('Firm A token returns only Firm A user', async () => {
    const res = await request(app)
      .get('/test/users')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].firm_id).toBe(firmAId);
  });

  it('Firm B token returns only Firm B user', async () => {
    const res = await request(app)
      .get('/test/users')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].firm_id).toBe(firmBId);
  });

  it('No token returns 401', async () => {
    const res = await request(app).get('/test/users');
    expect(res.status).toBe(401);
  });
});
