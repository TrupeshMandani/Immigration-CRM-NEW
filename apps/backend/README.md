# Immigration CRM — Backend

Express + TypeScript API server. Uses MongoDB (Mongoose) for existing data and Postgres + Drizzle ORM for new multi-tenant data. Row-Level Security enforces tenant isolation at the database engine level.

## Getting started

```bash
cp .env.example .env   # fill in secrets
pnpm install
pnpm db:migrate        # create tables + RLS policy + icrm_app role
pnpm dev               # tsx watch
```

## Cross-Tenant Testing

Every Postgres-backed GET endpoint must have a test in
`src/__tests__/cross-tenant.test.ts` that proves it cannot return data
belonging to a different firm.

### How it works

`provisionTwoFirmsWithData()` (in `src/__tests__/fixtures/multitenant.ts`)
creates two isolated firms in Postgres, seeds one admin user in each, and
returns signed JWTs for both.  The test hits the endpoint as Firm A and asserts
that zero Firm B rows appear in the response.

The assertion works because:
1. `tenantContextMiddleware` opens a Postgres transaction, calls
   `SET LOCAL ROLE icrm_app` + `set_app_context(firmId)`, and attaches the
   transaction to `req.db`.
2. The RLS policy `tenant_isolation` on the `users` table filters every query
   by `app.current_firm_id`.
3. `req.db` is the only way for a route handler to read/write tenant data.

### Adding a new endpoint to the suite

When you migrate a MongoDB module to Postgres and add a new authenticated GET
route, follow these steps:

**1. Add a firm_id column + RLS to the new table**

In `src/db/schema/<table>.ts`:
```typescript
firm_id: text('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
```
Generate and apply the migration (`pnpm db:generate && pnpm db:migrate`), then
add the table to `0002_rls_users.sql` (or a new `000X_rls_<table>.sql`):
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <table>
  USING (firm_id = current_setting('app.current_firm_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO icrm_app;
```

**2. Seed the new model in `multitenant.ts`**

Inside `provisionTwoFirmsWithData()` add:
```typescript
const [recordA] = await seedInFirm(firmA.id, (tx) =>
  tx.insert(myTable).values({ firm_id: firmA.id, ...fields }).returning().then(r => r[0])
);
const [recordB] = await seedInFirm(firmB.id, (tx) =>
  tx.insert(myTable).values({ firm_id: firmB.id, ...fields }).returning().then(r => r[0])
);
// Add recordA / recordB to the returned TwoFirmFixture object.
```

**3. Mount the router in the test app**

In `cross-tenant.test.ts`, add:
```typescript
import { myRouter } from '../modules/my-module/my.route';
app.use('/api/my-route', jwtAuthStub, tenantContextMiddleware, myRouter);
```

**4. Remove the describe.skip and write assertions**

```typescript
describe('Cross-tenant isolation: GET /api/my-route', () => {
  it('Firm A token returns only Firm A data', async () => {
    const res = await request(app)
      .get('/api/my-route')
      .set('Authorization', `Bearer ${fixture.jwtA}`);

    expect(res.status).toBe(200);
    for (const row of res.body) {
      expect(row.firm_id).toBe(fixture.firmA.id);
    }
  });

  it('contains no Firm B data', async () => {
    const res = await request(app)
      .get('/api/my-route')
      .set('Authorization', `Bearer ${fixture.jwtA}`);
    const firmIds = res.body.map((r: { firm_id: string }) => r.firm_id);
    expect(firmIds).not.toContain(fixture.firmB.id);
  });
});
```

**5. Deliberately break and verify**

To confirm the test actually catches a real leak, temporarily change the route
handler to bypass `req.db` and use the raw `db` import directly:
```typescript
import { db } from '../../db/postgres'; // bypass RLS
const rows = await db.select().from(myTable); // no firm context
```
Run `pnpm test` — it must **fail**.  Revert the change; the test must **pass**.

### Running the full suite

```bash
pnpm test
```

The suite is also run automatically by GitHub Actions on every pull request and
push to `main` (see `.github/workflows/ci.yml`).
