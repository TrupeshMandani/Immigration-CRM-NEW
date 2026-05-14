/**
 * Cross-tenant isolation test suite.
 *
 * Provisions two firms with parallel data, then calls every authenticated
 * GET endpoint as Firm A and asserts that Firm B's data never appears in
 * the response.
 *
 * HOW TO ADD A NEW ENDPOINT
 * ─────────────────────────
 * 1. Migrate the module to Postgres (adds firm_id FK, covered by RLS).
 * 2. Mount the router on `app` below.
 * 3. Seed data for both firms in provisionTwoFirmsWithData() (multitenant.ts).
 * 4. Remove the describe.skip and write the assertions.
 * See apps/backend/README.md → "Cross-Tenant Testing" for the full guide.
 *
 * DELIBERATE BREAK TEST (manual)
 * ────────────────────────────────
 * To verify the suite catches a real leak, temporarily edit usersRouter to
 * use the raw `db` import instead of `req.db`:
 *
 *   import { db } from '../../db/postgres';          // ← bypass
 *   const rows = await db.select().from(users);       // ← no RLS context
 *
 * `pnpm test` must FAIL with "expected 2 to equal 1".  Revert afterwards.
 */
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { sql as pgClient } from '../db/postgres';
import { users } from '../db/schema/users';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { usersRouter } from '../modules/users/users.route';
import { studentsRouter } from '../modules/students/students.routes';
import { documentsRouter } from '../modules/documents/documents.routes';
import { tasksRouter } from '../modules/tasks/tasks.routes';
import {
  provisionTwoFirmsWithData,
  teardownFirms,
  type TwoFirmFixture,
} from './fixtures/multitenant';

// ---------------------------------------------------------------------------
// Shared JWT auth stub (mirrors real auth.js minus the MongoDB lookup).
// ---------------------------------------------------------------------------
function jwtAuthStub(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.slice(7);
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

// ---------------------------------------------------------------------------
// Minimal test Express app.
// Only Postgres-backed routes are mounted here.  MongoDB-backed routes are
// covered by describe.skip blocks below — enable them as each module is
// migrated to Postgres.
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

// Stack: JWT stub → tenant context (opens RLS tx) → route handler
app.use('/api/users', jwtAuthStub, tenantContextMiddleware, usersRouter);
app.use('/api/students', jwtAuthStub, tenantContextMiddleware, studentsRouter);
app.use('/api/documents', jwtAuthStub, tenantContextMiddleware, documentsRouter);
app.use('/api/tasks', jwtAuthStub, tenantContextMiddleware, tasksRouter);

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
let fixture: TwoFirmFixture;

beforeAll(async () => {
  fixture = await provisionTwoFirmsWithData();
});

afterAll(async () => {
  await teardownFirms(fixture.firmA.id, fixture.firmB.id);
  await pgClient.end();
});

// ---------------------------------------------------------------------------
// GET /api/users  [Postgres + RLS — active]
// ---------------------------------------------------------------------------
describe('Cross-tenant isolation: GET /api/users', () => {
  it('Firm A token → 200 with only Firm A rows', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${fixture.jwtA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const row of res.body) {
      expect(row.firm_id).toBe(fixture.firmA.id);
    }
  });

  it('Firm A token → response contains NO Firm B rows', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${fixture.jwtA}`);

    const firmIds: string[] = res.body.map((r: { firm_id: string }) => r.firm_id);
    expect(firmIds).not.toContain(fixture.firmB.id);
  });

  it('Firm B token → 200 with only Firm B rows', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${fixture.jwtB}`);

    expect(res.status).toBe(200);
    for (const row of res.body) {
      expect(row.firm_id).toBe(fixture.firmB.id);
    }
  });

  it('No token → 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/students  [Postgres + RLS — active since Prompt 09]
// ---------------------------------------------------------------------------
describe('Cross-tenant isolation: GET /api/students', () => {
  it('Firm A token → 200 with only Firm A students', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${fixture.jwtA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const row of res.body) {
      expect(row.firm_id).toBe(fixture.firmA.id);
    }
  });

  it('Firm A token → contains NO Firm B students', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${fixture.jwtA}`);

    const firmIds: string[] = res.body.map((r: { firm_id: string }) => r.firm_id);
    expect(firmIds).not.toContain(fixture.firmB.id);
  });

  it('Firm B token → 200 with only Firm B students', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${fixture.jwtB}`);

    expect(res.status).toBe(200);
    for (const row of res.body) {
      expect(row.firm_id).toBe(fixture.firmB.id);
    }
  });

  it('No token → 401', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/documents/student/:studentId  [Postgres + RLS — active since Prompt 10]
// ---------------------------------------------------------------------------
describe('Cross-tenant isolation: GET /api/documents/student/:id', () => {
  it('Firm A token → 200 with only Firm A documents', async () => {
    const res = await request(app)
      .get(`/api/documents/student/${fixture.studentA.id}`)
      .set('Authorization', `Bearer ${fixture.jwtA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const row of res.body) {
      expect(row.firm_id).toBe(fixture.firmA.id);
    }
  });

  it('Firm A token → contains NO Firm B documents', async () => {
    // Try to read Firm B student's documents with Firm A token.
    // RLS will return [] because firm_id doesn't match.
    const res = await request(app)
      .get(`/api/documents/student/${fixture.studentB.id}`)
      .set('Authorization', `Bearer ${fixture.jwtA}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0); // Firm B student is invisible to Firm A
  });

  it('No token → 401', async () => {
    const res = await request(app).get(
      `/api/documents/student/${fixture.studentA.id}`,
    );
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/tasks  [Postgres + RLS — active since Prompt 12]
// ---------------------------------------------------------------------------
describe('Cross-tenant isolation: GET /api/tasks', () => {
  it('Firm A token → 200 with only Firm A tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${fixture.jwtA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.tasks)).toBe(true);
    expect(res.body.tasks.length).toBeGreaterThan(0);

    // Every task returned must belong to Firm A's student or document
    // (tasks don't expose firm_id directly, but we can check the seeded task id)
    const ids: string[] = res.body.tasks.map((t: { id: string }) => t.id);
    expect(ids).toContain(fixture.taskA.id);
  });

  it('Firm A token → contains NO Firm B tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${fixture.jwtA}`);

    const ids: string[] = res.body.tasks.map((t: { id: string }) => t.id);
    expect(ids).not.toContain(fixture.taskB.id);
  });

  it('Firm B token → 200 with only Firm B tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${fixture.jwtB}`);

    expect(res.status).toBe(200);
    const ids: string[] = res.body.tasks.map((t: { id: string }) => t.id);
    expect(ids).toContain(fixture.taskB.id);
    expect(ids).not.toContain(fixture.taskA.id);
  });

  it('No token → 401', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });
});

describe.skip('Cross-tenant isolation: GET /api/notifications [pending — Prompt 09]', () => {
  it('Firm A token returns only Firm A notifications', () => {
    // TODO: enable after notifications table migrated to Postgres.
  });

  it('contains no Firm B notifications', () => {});
});

describe.skip('Cross-tenant isolation: GET /api/recommendations [pending — Prompt 09]', () => {
  it('Firm A token returns only Firm A recommendations', () => {
    // TODO: enable after recommendations migrated to Postgres.
  });
});
