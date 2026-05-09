const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { tenantContextMiddleware } = require("../middleware/tenantContext");

// ---------------------------------------------------------------------------
// Public routes — no auth, no tenant context
// /api/auth/*    login, register, token refresh
// /api/contact/* contact-form submissions
// ---------------------------------------------------------------------------
router.use("/auth", require("../modules/auth/auth.route"));
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
protectedRouter.use("/upload", require("../modules/upload/upload.routes"));

// Students: new Postgres-backed CRUD runs first.
// Requests for paths the new router doesn't handle (/:aiKey, /required-documents,
// /tasks, etc.) fall through to the legacy Mongoose-backed router below.
protectedRouter.use("/students", require("../modules/students/students.routes").studentsRouter);
protectedRouter.use("/students", require("../modules/students/student.route"));
protectedRouter.use("/tasks", require("../modules/tasks/task.routes"));
protectedRouter.use("/notifications", require("../modules/notifications/notification.route"));
protectedRouter.use("/recommendations", require("../AI/ai-recommendation/recommendation.route"));
protectedRouter.use("/ai", require("./ai.routes"));
protectedRouter.use("/files", require("./file.routes"));

router.use("/", protectedRouter);

router.get("/", (req, res) => res.json({ message: "API root ready" }));

module.exports = router;
