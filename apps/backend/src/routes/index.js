const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { tenantContextMiddleware } = require("../middleware/tenantContext");

// ---------------------------------------------------------------------------
// Public routes — no auth, no tenant context
// /api/auth/*    login, register, token refresh
// /api/contact/* contact-form submissions
// ---------------------------------------------------------------------------
router.use("/auth", require("../modules/auth/auth.route").authRouter);
router.use("/contact", require("../modules/contact/contact.route"));

// ---------------------------------------------------------------------------
// Protected routes — authenticateToken runs first (sets req.context),
// then tenantContextMiddleware opens a transaction scoped to req.context.firmId
// and attaches it as req.db.
//
// Individual route files also call authenticateToken on their own routes
// (double-auth is harmless). Do NOT add SSE / streaming routes here — see
// the comment in tenantContext.ts about long-lived connections.
// ---------------------------------------------------------------------------
const protectedRouter = express.Router();
protectedRouter.use(authenticateToken);
protectedRouter.use(tenantContextMiddleware);

protectedRouter.use("/users", require("../modules/users/users.route").usersRouter);
protectedRouter.use("/documents", require("../modules/documents/documents.routes").documentsRouter);

// Applicants: new Postgres-backed CRUD runs first.
// Requests for paths the new router doesn't handle (/:aiKey, /required-documents,
// /tasks, etc.) fall through to the legacy Mongoose-backed router below.
protectedRouter.use("/applicants", require("../modules/applicants/applicants.routes").applicantsRouter);
protectedRouter.use("/applicants", require("../modules/applicants/applicant.route"));
// Task module — Postgres-backed (replaces Mongoose task.routes.js).
protectedRouter.use("/tasks", require("../modules/tasks/tasks.routes").tasksRouter);
// Notifications module — Postgres-backed (replaces Mongoose notification.route.js).
protectedRouter.use("/notifications", require("../modules/notifications/notifications.routes").notificationsRouter);
protectedRouter.use("/recommendations", require("../AI/ai-recommendation/recommendation.route"));
// New AI module: orchestrator + ai_jobs ledger + multi-provider router
protectedRouter.use("/ai", require("../modules/ai/ai.routes").aiRouter);
protectedRouter.use("/files", require("./file.routes"));
// Billing module — Stripe Connect, invoices, trust ledger, retainer agreements
protectedRouter.use("/billing", require("../modules/billing/billing.routes").billingRouter);

router.use("/", protectedRouter);

// ---------------------------------------------------------------------------
// Webhook routes — public (no auth), raw body handled upstream in index.js.
// ---------------------------------------------------------------------------
router.use("/webhooks", require("../modules/billing/webhook.routes").webhookRouter);

router.get("/", (req, res) => res.json({ message: "API root ready" }));

module.exports = router;
