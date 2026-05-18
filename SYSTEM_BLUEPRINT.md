# IMMIGRATION CRM — SYSTEM BLUEPRINT

> Single-file architectural blueprint for the entire `apps/` workspace.  
> Generated: 2026‑05‑17 · Scope: every service, every endpoint, every tool, every wire.  
> Read top‑to‑bottom: the biggest picture first → individual subsystems → per-feature traces → appendices.

---

## TABLE OF CONTENTS

0. [How to read this document](#0--how-to-read-this-document)
1. [System at a glance (PORTS · APPS · DATA)](#1--system-at-a-glance)
2. [DIAGRAM #1 — How the four apps are wired together](#2--diagram-1--how-the-four-apps-are-wired-together-the-connector)
3. [DIAGRAM #2 — BACKEND internal architecture](#3--diagram-2--backend-internal-architecture-apifbusbackend)
4. [DIAGRAM #3 — CONSULTANT‑WEB internal architecture](#4--diagram-3--consultant-web-internal-architecture-appsconsultant-web)
5. [DIAGRAM #4 — MCP SERVER internal architecture](#5--diagram-4--mcp-server-internal-architecture-appsmcp-server)
6. [Feature wiring traces (frontend → backend → DB → realtime)](#6--feature-wiring-traces-end-to-end-per-feature)
7. [Appendix A — Port map & env vars](#a--appendix-a--port-map--env-vars)
8. [Appendix B — Postgres schema (tables → relationships)](#b--appendix-b--postgres-schema)
9. [Appendix C — Background workers & queues](#c--appendix-c--background-workers--queues)
10. [Appendix D — Realtime channels & socket events](#d--appendix-d--realtime-channels--socket-events)
11. [Appendix E — Complete REST surface (one table)](#e--appendix-e--complete-rest-surface)
12. [Appendix F — Known gaps / architectural drift](#f--appendix-f--known-gaps--architectural-drift)

---

## 0 — How to read this document

- The repo is a **pnpm monorepo** (`pnpm-workspace.yaml` → `apps/*`, `packages/*`).
- Four runtime apps live under `apps/`:
  - `apps/backend/` — the core HTTP API + workers + websockets (the brain).
  - `apps/consultant-web/` — the React SPA (the UI both admins and students log into).
  - `apps/mcp-server/` — the AI agent gateway (OpenAI function-calling → backend tools).
  - `apps/marketing/` — the Next.js public marketing site (not deeply wired into the CRM).
- Two infra services (via `docker-compose.dev.yml`):
  - **Postgres 16** — single source of truth for tenants, students, docs, tasks, billing.
  - **Redis 7** — backs BullMQ queues + Socket.IO multi-process adapter.
- Three external cloud dependencies: **AWS S3** (files), **Stripe Connect** (billing), **OpenAI + Anthropic** (AI), **Firebase Auth** (student passwordless login), **SMTP** (email).

The diagrams use [Mermaid](https://mermaid.js.org/) — Cursor and GitHub render them inline.

---

## 1 — System at a glance

| App | Path | Port | Stack | Role |
|-----|------|------|-------|------|
| Backend API | `apps/backend/` | **4000** | Express 5 + Drizzle/Postgres + Socket.IO + BullMQ | Source of truth, REST, sockets, AI workers, billing |
| Consultant Web | `apps/consultant-web/` | **5173** (Vite default) | React 19 + Vite 7 + React Query + socket.io-client | The SPA used by admins **and** students |
| MCP Server | `apps/mcp-server/` | **3002** | Express + OpenAI SDK + AsyncLocalStorage | AI agent that calls backend tools |
| Marketing | `apps/marketing/` | **3000** (Next default) | Next.js 15 + Tailwind | Public marketing site |
| Postgres | docker | **5433→5432** | Postgres 16 | All tenant data |
| Redis | docker | **6379** | Redis 7 | BullMQ + Socket.IO adapter |
| S3 | AWS | — | `@aws-sdk/client-s3` | Document & PDF storage |
| Stripe | external | — | `stripe` SDK | Connect, invoices, payments |
| OpenAI/Anthropic | external | — | `openai`, `@anthropic-ai/sdk` | LLM jobs |
| Firebase | external | — | `firebase-admin` | Student passwordless / Google auth |
| SMTP | external | — | `nodemailer` | Email delivery |

> ALL inter-app traffic uses **HTTP/WS over localhost in dev** and tokens — there is no shared DB connection between apps. The MCP server is **stateless** and pushes every state change back through the backend's REST API.

---

## 2 — DIAGRAM #1 — How the four apps are wired together (the connector)

This is the most important picture. Everything below this section is just zoom-in on one box.

```mermaid
flowchart LR
    subgraph Browser[" Browser "]
        A1["Admin user"]
        A2["Student user"]
        MKT["Visitor on marketing site"]
    end

    subgraph Web["apps/consultant-web · React SPA · :5173"]
        WUI["Pages + Components<br/>(admin/* · student/*)"]
        WAUTH["AuthContext<br/>localStorage{token,user}"]
        WSVC["services/* (axios)<br/>+ lib/api.ts (fetch)"]
        WSOCK["useSocket (socket.io-client)"]
        WCHAT["ChatComponent<br/>(NDJSON reader)"]
        WFB["Firebase Web SDK"]
    end

    subgraph MKTAPP["apps/marketing · Next.js · :3000"]
        MPAGES["Public pages (Landing/About/...)"]
    end

    subgraph BE["apps/backend · Express + Drizzle · :4000"]
        REST["REST /api/*<br/>(auth → tenantContext)"]
        SOCK["Socket.IO server<br/>(JWT handshake)"]
        WORKERS["BullMQ workers:<br/>document-hashing · ai-verify"]
        AICTRL["modules/ai/ai.routes.ts<br/>/api/ai/chat proxy"]
        BILL["billing webhook<br/>/api/webhooks/stripe"]
    end

    subgraph MCP["apps/mcp-server · Express :3002"]
        MROUTE["POST /api/chat"]
        MPROC["chatProcessor<br/>(OpenAI function-calling)"]
        MTOOLS["18 tools<br/>(student / doc / task / email)"]
        MCTX["AsyncLocalStorage<br/>{authHeader, firmId}"]
    end

    subgraph Infra[" Infra / External "]
        PG[("Postgres 16<br/>:5433")]
        RDS[("Redis 7<br/>:6379")]
        S3[("AWS S3 bucket")]
        STRIPE[("Stripe Connect")]
        OPENAI[("OpenAI · Anthropic")]
        FB[("Firebase Auth")]
        SMTP[("SMTP server")]
    end

    A1 & A2 -->|HTTPS| WUI
    MKT -->|HTTPS| MPAGES
    WUI --> WAUTH & WSVC & WSOCK & WCHAT
    WUI -.Firebase ID token.-> WFB
    WFB -->|verifyIdToken| FB

    WSVC -->|Bearer JWT<br/>Authorization| REST
    WSOCK <-->|websocket<br/>auth.token| SOCK
    WCHAT -->|POST /api/ai/chat<br/>+ Bearer + body| AICTRL

    AICTRL -->|axios proxy<br/>POST /api/chat<br/>+ Bearer + X-Firm-Id| MROUTE
    MROUTE --> MCTX --> MPROC
    MPROC -->|chat.completions<br/>+ tools| OPENAI
    MPROC --> MTOOLS
    MTOOLS -->|axios<br/>Bearer + X-Firm-Id| REST

    REST --> PG
    REST --> S3
    REST --> STRIPE
    REST --> FB
    REST --> SMTP
    REST -.enqueue.-> RDS
    SOCK <-.pub/sub adapter.-> RDS

    WORKERS -.consume.-> RDS
    WORKERS --> S3 & PG & OPENAI

    STRIPE -.webhook.-> BILL
    BILL --> PG

    classDef ext fill:#fef9c3,stroke:#ca8a04,color:#713f12
    classDef infra fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    classDef app fill:#dcfce7,stroke:#16a34a,color:#14532d
    class S3,STRIPE,OPENAI,FB,SMTP ext
    class PG,RDS infra
    class Web,BE,MCP,MKTAPP app
```

### How to read this diagram

The system has **two distinct request shapes**:

1. **Normal CRUD requests** (the boring 95%)  
   Browser → React service → `/api/...` on backend → Postgres / S3 / Stripe → JSON back to the browser. The backend enforces tenancy by opening a Postgres transaction in `tenantContextMiddleware`, setting `SET LOCAL ROLE icrm_app` + `set_app_context(firmId)`, attaching that transaction as `req.db`, then committing on success / rolling back on error.

2. **AI chat requests** (the agent loop)  
   Browser → `POST /api/ai/chat` on backend (preserves auth + firm context) → backend proxies via `axios` to `POST http://localhost:3002/api/chat` on the MCP server → MCP server stores `Authorization` + `X-Firm-Id` in `AsyncLocalStorage` → calls OpenAI with the 18-tool registry → OpenAI emits `tool_calls` → each tool's `run()` axios-posts back to the **same backend** (with the original Bearer token) → tool results feed back into a second OpenAI completion → final markdown reply streams back as NDJSON tokens, char-by-char, to the browser.

The MCP server **never touches Postgres directly** — it only talks to the backend's REST API. That keeps RLS enforced.

### Background plane (not request-driven)

Three independent worker loops run inside the backend process (`apps/backend/src/index.js` starts them at boot):

- **`startHashingWorker`** — consumes BullMQ queue `document-hashing`, streams the S3 object, computes SHA‑256, writes `documents.file_hash`.
- **`startVerifyWorker`** — consumes BullMQ queue `ai-verify`, downloads the file, calls `verifyDocumentType` (LLM), writes `documents.ai_verification`, and may call `createAIVerificationTask` which fires a Socket.IO event.
- **Socket.IO server** — JWT‑authenticated on handshake, joins rooms `firm:<id>`, `firm:<id>:user:<uid>`, legacy `user:<uid>` and `admins`. Uses Redis adapter for multi-process scaling. On connect, backfills last 20 unread notifications.

### Stripe inbound (the only public webhook surface)

Stripe → `POST /api/webhooks/stripe` (raw body middleware, signature verification with `STRIPE_WEBHOOK_SECRET`). Handles `invoice.paid` (updates `invoices` + inserts `trust_ledger` deposit) and `account.updated` (updates `firm_stripe_accounts.charges_enabled`).

---

## 3 — DIAGRAM #2 — BACKEND internal architecture (`apps/backend`)

```mermaid
flowchart TB
    HTTP["HTTP req → :4000"] --> CORS["cors · helmet · cookieParser"]
    CORS --> RAW["/api/webhooks/stripe<br/>express.raw()"]
    CORS --> JSON["express.json(10mb)"]
    JSON --> ROUTER["routes/index.js"]

    ROUTER --> PUB["PUBLIC routes (no auth)"]
    ROUTER --> PROT["PROTECTED router<br/>authenticateToken → tenantContextMiddleware"]
    ROUTER --> WH["WEBHOOK router"]

    PUB --> AUTH["/api/auth/*<br/>auth.controller.js<br/>(login · firebase · register · refresh)"]
    PUB --> CONTACT["/api/contact<br/>contact.controller.js"]

    PROT --> USERS["/api/users<br/>users.route.ts"]
    PROT --> STUD["/api/students/*<br/>students.routes.ts (PG CRUD)<br/>+ student.route.js (legacy/extended)"]
    PROT --> DOCS["/api/documents/*<br/>documents.routes.ts"]
    PROT --> UPL["/api/upload<br/>upload.routes.js (multer)"]
    PROT --> TASKS["/api/tasks/*<br/>tasks.routes.ts"]
    PROT --> NOTIF["/api/notifications/*<br/>notifications.routes.ts"]
    PROT --> REC["/api/recommendations/*<br/>recommendation.route.js"]
    PROT --> AI["/api/ai/*<br/>ai.routes.ts"]
    PROT --> FILES["/api/files/temp-upload"]
    PROT --> BILLR["/api/billing/*<br/>(stripe·invoices·trust·retainers)"]

    WH --> STRIPEWH["POST /api/webhooks/stripe<br/>invoice.paid · account.updated"]

    %% Middleware chain detail
    AUTHMW["middleware/auth.js<br/>JWT verify<br/>load user/student<br/>set req.context"]
    TCTX["middleware/tenantContext.ts<br/>BEGIN tx<br/>SET LOCAL ROLE icrm_app<br/>set_app_context(firmId)<br/>attach req.db<br/>commit on res.finish"]
    AUTHMW --> TCTX

    %% Services / business layer
    subgraph SVC["Module services"]
        STSVC["students.service.ts<br/>+ student.controller.js"]
        DSVC["documents.service.ts<br/>S3 presign · finalize"]
        TSVC["tasks.service.ts<br/>+ socket emits"]
        NSVC["notifications.service.ts<br/>insert + socket"]
        AISVC["ai-orchestrator.service.ts<br/>(Anthropic→OpenAI fallback)"]
        BSVC["stripe.service · invoices.service<br/>trust.service · retainers.service"]
        S3SVC["s3.service.js<br/>upload · presign · delete"]
        EMAIL["utils/sendEmail.js<br/>nodemailer"]
    end

    %% Background plane
    subgraph BG["Background plane (started in index.js)"]
        HQ["hashing.queue<br/>'document-hashing'"]
        HW["documents.worker<br/>startHashingWorker → SHA-256"]
        VQ["verify.queue<br/>'ai-verify'"]
        VW["ai.worker<br/>startVerifyWorker → verifyDocumentType<br/>→ createAIVerificationTask"]
        SOCKIO["socket/index.ts<br/>Server + Redis adapter<br/>JWT handshake<br/>rooms: firm:* / user:* / admins"]
    end

    %% DB / external
    PG[("Postgres<br/>db/postgres.ts<br/>+ withFirmContext()<br/>RLS via icrm_app role")]
    REDIS[("Redis<br/>BullMQ + Socket adapter")]
    S3X[("S3")]
    STRIPEX[("Stripe API")]
    FBX[("Firebase Admin")]

    STUD --> STSVC --> PG
    DOCS --> DSVC --> S3X
    DSVC -.enqueue 'verify' & 'hash'.-> VQ & HQ
    UPL --> S3SVC --> S3X
    TASKS --> TSVC --> PG
    TSVC -.emitToFirm.-> SOCKIO
    NOTIF --> NSVC --> PG
    NSVC -.emitToUser.-> SOCKIO
    AI --> AISVC --> PG
    AI -.HTTP proxy.-> MCP["MCP :3002"]
    REC --> AISVC
    BILLR --> BSVC --> STRIPEX
    BSVC --> PG
    STRIPEWH --> BSVC

    HQ --> REDIS
    VQ --> REDIS
    HW --> REDIS
    HW --> PG
    HW --> S3X
    VW --> REDIS
    VW --> S3X
    VW --> AISVC
    VW --> TSVC

    AUTH --> FBX
    AUTH --> PG
    AUTH --> EMAIL

    classDef pub fill:#fef3c7,stroke:#ca8a04
    classDef prot fill:#dcfce7,stroke:#16a34a
    classDef bg fill:#ede9fe,stroke:#7c3aed
    classDef ext fill:#fee2e2,stroke:#dc2626
    class PUB,AUTH,CONTACT pub
    class PROT,USERS,STUD,DOCS,UPL,TASKS,NOTIF,REC,AI,FILES,BILLR prot
    class HQ,HW,VQ,VW,SOCKIO bg
    class PG,REDIS,S3X,STRIPEX,FBX ext
```

### Backend — the boot sequence (`apps/backend/src/index.js`)

```text
1. dotenv → env loaded
2. tsReady() canary (TS bridge)
3. Express app: cors(APP_BASE_URL) → helmet → cookieParser
4. express.raw() for /api/webhooks/stripe (BEFORE express.json)
5. express.json({limit:'10mb'})
6. app.use('/api', require('./routes'))
7. GET /health (pings Postgres + Redis)
8. Global error handler
9. If NODE_ENV !== 'test':
     - startHashingWorker()  → consumes 'document-hashing' queue
     - startVerifyWorker()   → consumes 'ai-verify' queue
10. http.createServer(app) → initSocket(server) → server.listen(PORT=4000)
```

### Backend — `routes/index.js` mount graph (the API tree)

```text
/api
├── /auth                ← PUBLIC
│    POST /login                      → auth.controller.login            (PG users + bcrypt)
│    POST /login-link                 → sendLoginLink                    (Firebase + SMTP)
│    POST /firebase-login             → firebaseLogin                    (verifyIdToken)
│    POST /register                   → registerStudent                  (PG + invite email)
│    POST /register-admin             → registerAdmin                    (PG, only when none exists)
│    POST /refresh                    → refresh                          (httpOnly cookie)
│    GET  /test                       → echo
│    POST /change-password [auth]     → changePassword
│    GET  /profile         [auth]     → getProfile
│
├── /contact             ← PUBLIC
│    POST /                            → submitContact   (pending student row + admin email)
│
├── /webhooks            ← PUBLIC (raw body)
│    POST /stripe                      → invoice.paid · account.updated · payment_intent.succeeded
│
└── (PROTECTED — authenticateToken → tenantContextMiddleware)
    ├── /users
    │    GET  /                        → list firm users via req.db
    │
    ├── /students        (PG CRUD first → falls through to legacy)
    │    students.routes.ts (UUID-only paths):
    │      GET  /
    │      GET  /:id   (if UUID)
    │      POST /
    │      PATCH /:id  (if UUID)
    │      DELETE /:id (if UUID)
    │    student.route.js (legacy, by aiKey):
    │      GET    /registered                                                  [admin]
    │      PUT    /me/profile                                                  [student]
    │      GET    /:aiKey/files
    │      POST   /:aiKey/documents/:documentId/rename
    │      DELETE /:aiKey/documents/:documentId
    │      POST   /                                                            [admin]
    │      GET    /                                                            [admin]
    │      GET    /pending/contacts                                            [admin]
    │      GET    /admin/:id                                                   [admin]
    │      POST   /:id/approve-contact                                         [admin]
    │      POST   /:id/activate                                                [admin]
    │      PUT    /:id                                                         [admin]
    │      DELETE /:id                                                         [admin]
    │      GET    /:aiKey/required-documents
    │      POST   /:aiKey/required-documents                                   [admin]
    │      DELETE /:aiKey/required-documents/:docId                            [admin]
    │      PATCH  /:aiKey/required-documents/:docId                            [admin]
    │      POST   /:aiKey/required-documents/:docId/files     (multer)
    │      POST   /:aiKey/required-documents/files           (multer)  ← unified slot
    │      GET    /:aiKey/required-documents/:docId/files
    │      GET    /:aiKey/required-documents/:docId/files/:fileId/url
    │      DELETE /:aiKey/required-documents/:docId/files/:fileId
    │      POST   /:aiKey/required-documents/:docId/files/:fileId/verify       [admin]
    │      GET    /:aiKey/tasks
    │      POST   /:aiKey/tasks                          [admin · multer]
    │      PATCH  /:aiKey/tasks/:taskId
    │      GET    /:aiKey/tasks/:taskId/attachment
    │      DELETE /:aiKey/tasks/:taskId
    │      GET    /:aiKey
    │
    ├── /documents
    │      POST   /upload-url                  → presigned PUT
    │      GET    /student/:studentId          → list docs
    │      POST   /:id/finalize                → S3 HEAD + enqueue verify (+ optional hash)
    │      GET    /:id/download-url            → presigned GET
    │      DELETE /:id                          → soft delete (row only)
    │
    ├── /upload
    │      POST   /                            [student · multer.array("files",20)]
    │                                          → AI extract + S3 upload + upsert student
    │
    ├── /tasks
    │      GET    /                            → list (supports ?scope=notifications)
    │      POST   /                            → create + emit 'task:created'
    │      POST   /notifications/read          → bulk read
    │      POST   /:taskId/complete            → done + emit
    │      POST   /:taskId/reassign            → assign + emit
    │      PATCH  /:taskId                     → patch + emit
    │      DELETE /:taskId                     → delete
    │
    ├── /notifications
    │      GET    /                            → paginated list (user+firm scoped)
    │      POST   /:id/read                    → mark single
    │      POST   /read-all                    → mark all
    │
    ├── /recommendations  (legacy AI folder)
    │      GET    /:studentId                  → cached / generated list
    │      POST   /generate/:studentId         → OpenAI gpt-4o-mini
    │      PATCH  /enable/:studentId           → 410 (deprecated)
    │
    ├── /ai               (new orchestrator module)
    │      POST   /verify-document/:documentId → enqueue 'ai-verify' (202)
    │      POST   /extract-fields/:documentId  → return existing ai_verification JSON
    │      POST   /recommendations/:studentId  → runAIJob('recommendation')
    │      POST   /chat                        → axios proxy to MCP, stream NDJSON
    │
    ├── /files
    │      POST   /temp-upload                 → multer.single, save to OS tmp, return path
    │
    └── /billing
        Stripe Connect:
          POST /stripe/connect                 → createConnectAccount
          POST /stripe/accounts                → operating + trust subaccounts
          GET  /stripe/onboarding-link
        Invoices:
          GET  /invoices · GET /invoices/:id
          POST /invoices · POST /invoices/:id/send
        Trust ledger:
          POST /trust/deposit · POST /trust/withdrawal
          POST /trust/transfer · GET /trust/reconciliation
        Retainers (digital signatures):
          GET  /retainers/templates
          GET  /retainers · GET /retainers/:id
          POST /retainers · POST /retainers/:id/send · POST /retainers/:id/sign
```

### Backend — every module & every function

> Below is a complete inventory of every function the backend exports, grouped by module. If you're a new dev and you see a feature on the UI, find it here to learn what powers it.

#### `middleware/`

| File | Function | What it does |
|------|----------|--------------|
| `auth.js` | `authenticateToken(req,res,next)` | JWT verify (`JWT_ACCESS_SECRET` → fallback `JWT_SECRET`). For admin/senior/junior roles loads from `users`; for student loads from `students` (aliases `aiKey`, `profile`, `preferences`). Sets `req.context = { firmId, userId, role }`, `req.user`, `req.userId`, `req.userRole`. |
| `auth.js` | `requireAdmin(req,res,next)` | 403 unless `req.userRole ∈ {admin,senior,junior}`. |
| `auth.js` | `requireStudent(req,res,next)` | 403 unless `req.userRole === 'student'`. |
| `tenantContext.ts` | `tenantContextMiddleware` | Skips `/api/auth` & `/api/contact`. Opens Drizzle tx, `SET LOCAL ROLE icrm_app`, `SELECT set_app_context(firmId)`, attaches `req.db = tx`. Commits when `res` finishes 2xx/3xx; rolls back on `res.close` or ≥400. **Do not mount on SSE/WebSockets.** |

#### `modules/auth/auth.controller.js`

| Function | Purpose | External I/O |
|----------|---------|--------------|
| `login` | Email+password admin login. Students get 403 with hint to use email link / Google. | PG `users`, bcrypt, JWT, cookie. |
| `firebaseLogin` | Verifies Firebase ID token (Google OAuth / email link). Upserts student row if first sign-in. Refuses to log in admins via Firebase. | Firebase Admin, PG. |
| `sendLoginLink` | Issues Firebase passwordless sign-in link via `sendStudentInviteEmail`. | Firebase Admin, SMTP. |
| `changePassword` | Admin-only password change with bcrypt + length check. | PG, bcrypt. |
| `registerStudent` | Public student registration: insert pending row, generate `aiKey`, notify admins by email, send invite link. | PG, SMTP, Firebase. |
| `registerAdmin` | Creates the first admin (only when none exists). | PG, bcrypt. |
| `refresh` | Reads httpOnly cookie `refreshToken`, mints new access + rotates refresh. | JWT, PG. |
| `getProfile` | Returns normalized user view (works for admin or student). | PG. |

#### `modules/students/`

`students.routes.ts` → `students.service.ts` (typed, Postgres-only, **firm-scoped via `req.db`**):
- `listStudents(req.db, query)` · `getStudentById` · `getStudentByAiKey` · `createStudent` (zod-validated) · `updateStudent` · `updateStudentStage` · `deleteStudent` (soft `closed`).

`student.route.js` → `student.controller.js` (legacy, by `aiKey`, the real workhorse). Calls touch S3, AI services, notifications, sendEmail:
- `getRegisteredStudents`, `getStudentByKey`, `updateSelfProfile`, `getStudentFiles`, `renameStudentDocument`, `deleteStudentDocument`, `createStudent`, `getAllStudents`, `getPendingContacts`, `getStudentById`, `approveContactRequest`, `activateStudent`, `updateStudent`, `deleteStudent`, `getRequiredDocuments`, `addRequiredDocument`, `deleteRequiredDocument`, `updateRequiredDocumentSettings`, `uploadRequiredDocumentFile`, `listRequiredDocumentFiles`, `getRequiredDocumentFileUrl`, `deleteRequiredDocumentFile`, `verifyRequiredDocumentFile`, `listStudentTasks`, `createStudentTask`, `updateStudentTask`, `getStudentTaskAttachmentUrl`, `deleteStudentTask`.

`student.service.js` extras: `upsertStudent`, `mergePassportDetails`, `normalizePassportDate`, `extractPassportData`.

`student.invite.js`: `sendStudentInviteEmail` — Firebase `generateSignInWithEmailLink` + SMTP.

#### `modules/documents/`

`documents.routes.ts` → `documents.service.ts`:
- `generateUploadUrl(req.db, firmId, studentId, fileName, mimeType)` — insert `documents` row, return presigned PUT.
- `finalizeUpload(req.db, firmId, documentId)` — `S3.headObject`. **Always** enqueues `verify`. If size ≥ 50MB, enqueues `hash` (returns `{status:'hashing_queued'}`), else hashes inline.
- `getDownloadUrl(req.db, firmId, documentId)` — presigned GET.
- `listStudentDocuments(req.db, firmId, studentId)`.
- `deleteDocument(req.db, firmId, documentId)` — DB delete only (S3 object remains).
- `computeS3Hash(s3Key, bucket)` — stream → SHA-256 hex.

`hashing.queue.ts` — `hashingQueue` (BullMQ, queue `document-hashing`, job `hash`).
`documents.worker.ts` — `startHashingWorker()` consumer.

#### `modules/upload/`

`upload.routes.js` — `POST /` student-only multer (20 files, 10MB each).
`upload.controller.js` — `handleUpload` does: extract profile via AI (`AI/ai-file-extract`), upload to S3, upsert student, persist `documents` row, merge important fields by `field-priority`.

#### `modules/tasks/tasks.service.ts`

`formatTask`, `listTasks` (supports `scope=notifications`), `createTask` (insert + `emitToFirm task:created`), `createAIVerificationTask` (used by AI worker), `completeTask` (emit `task:updated`), `reassignTask`, `updateTask`, `deleteTask`, `markTasksRead`.

#### `modules/notifications/`

`notifications.service.ts` — `send(firmId, userId, payload)` inserts then `emitToUser firm:<id>:user:<uid> notification:new`. `markAsRead`, `markAllRead`, `listForUser`.
`email.service.js` — `sendEmailNotification`, `sendBulkEmailNotifications`, `testEmailConfiguration` (nodemailer, with in-file `emailTemplates`).

#### `modules/ai/` (the new orchestrator)

| File | Exports |
|------|---------|
| `ai-orchestrator.service.ts` | `runAIJob(jobType, messages, context)` — Anthropic primary (Haiku for `doc_verify`/`field_extract`/`fraud_screen`, Sonnet for `recommendation`/`chat`), OpenAI fallback (`gpt-4o-mini`/`gpt-4o`). Logs every call into `ai_jobs` table via `withFirmContext`. |
| `classifier.service.ts` | `classifyDocument(text, images)` → `runAIJob('field_extract',...)`. |
| `extract.service.ts` | `extractTextFromFile` (pdf-parse/mammoth), `pdfToImages` (pdf2pic), `extractImportantFields`, `extractProfileWithAI`. |
| `recommendation.service.ts` | `generateUniversityListFromProfile` + fallback list. |
| `verification.service.ts` | `verifyDocumentType(text, images, expectedType)` → `runAIJob('doc_verify',...)`. |
| `verify.queue.ts` | `verifyQueue` (BullMQ `ai-verify`, job `verify`). |
| `ai.worker.ts` | `startVerifyWorker()` — downloads S3 → tmp file → `verifyDocumentType` → updates `documents.ai_verification` → conditionally `createAIVerificationTask`. |
| `ai.routes.ts` | `POST /verify-document/:id` (enqueue, 202), `POST /extract-fields/:id` (returns existing JSON), `POST /recommendations/:id` (call service), `POST /chat` (axios proxy → MCP). |

#### `modules/billing/`

`stripe.service.ts` — `createConnectAccount`, `createOperatingAndTrustAccounts`, `getOnboardingLink`, `syncAccountStatus`. Touches Stripe + `firm_stripe_accounts`.
`invoices.service.ts` — `createInvoice`, `sendInvoice`, `listInvoices`, `getInvoice`, `markPaid`. Touches Stripe Customers/Invoices/InvoiceItems + `invoices` + reads `students` & `firm_stripe_accounts`.
`trust.service.ts` — `recordDeposit`, `recordWithdrawal`, `recordTransfer`, `generateMonthlyReconciliation`. Touches Stripe Balance + `trust_ledger`.
`retainers.service.ts` — `listTemplates`, `createDraft`, `sendForSignature`, `finalizeSignature` (S3 PutObject with Object Lock), `getRetainer`, `listRetainers`. Touches S3 + `retainer_agreements`.
`webhook.routes.ts` — verifies Stripe signature; on `invoice.paid` updates invoices + inserts trust ledger deposit; on `account.updated` updates `firm_stripe_accounts.charges_enabled`.
Templates: `generic_v1.hbs`, `pgwp_v1.hbs`, `study_permit_v1.hbs`.

#### `modules/s3/s3.service.js`

`uploadFileToS3`, `getPresignedUrl` (GET with optional `ResponseContentDisposition`), `listStudentFiles`, `deleteLocalFile`, `deleteS3Object`, `getMimeType`, `s3Client`.

#### `modules/users/users.route.ts`

`GET /` — `req.db.select().from(users)` (RLS scopes to current firm).

#### `modules/contact/`

`contact.controller.js → submitContact` — inserts pending student row, emails admins, generates `aiKey`.

#### `socket/index.ts`

`initSocket(server)`, `getIo`, `emitToFirm`, `emitToUser`, `emitTaskCreated`, `emitTaskUpdated`, `emitNotification`. Auth via `socket.handshake.auth.token` (same JWT). Rooms: `firm:<id>`, `firm:<id>:user:<uid>`, legacy `user:<uid>`, `admins`. Emits on connect: `notification:backfill` (last 20 unread).

#### `AI/` folder (legacy, parallel to `modules/ai`)

`ai.service.js` — `extractImportantFields`, `chatWithAssistant` (OpenAI).
`ai-file-extract/extract.service.js` — `extractProfileWithAI`, `extractTextFromFile`.
`ai-file-extract/document-classifier.js` — `classifyDocument` (OpenAI).
`ai-file-extract/pdf-to-images.js` — `pdfToImages` (pdf2pic).
`ai-file-extract/field-priority.js` — `prioritizeFields`, `formatFieldName`, `FIELD_PRIORITY`.
`ai-document-verify/verification.service.js` — `verifyDocumentType` (legacy OpenAI version, JSON mode).
`ai-recommendation/recommendation.route.js` + `recommendation.controller.js` + `aiRecommendation.service.js` — the recommendations module mounted at `/api/recommendations`.
`assistant/index.js` + `assistant/context-manager.js` — `handleAssistantQuery` streams to MCP; `buildStudentContext` aggregates student data for prompts.

#### `routes/file.routes.js`

`POST /temp-upload` — multer single, writes to OS tmp dir, returns absolute path. Used exclusively by the chat UI so attached files can be referenced by the MCP `uploadDocument` tool.

#### `db/postgres.ts`

`db` (Drizzle), `sql` (raw), `dbSql` alias, `withFirmContext(firmId, fn)`. RLS pattern: every protected request opens a tx, switches to non-superuser role `icrm_app`, calls `set_app_context(firmId)`, then runs queries — RLS policies (added in migrations `0002_rls_users.sql`, `0003_rls_students_documents.sql`) enforce per-firm isolation.

#### `utils/`

`sendEmail.js` (nodemailer), `firebaseAdmin.js` (`getFirebaseAdmin`), `adminRecipients.js` (`getAdminNotificationEmails`), `generateAiKey.js`, `fileName.js` (`buildRequiredDocFileName`, `guessExtension`, `getStudentDisplayName`).

---

## 4 — DIAGRAM #3 — CONSULTANT‑WEB internal architecture (`apps/consultant-web`)

```mermaid
flowchart TB
    ENTRY["main.jsx<br/>QueryClientProvider →<br/>AuthProvider → SocketProvider →<br/>NotificationProvider → App<br/>+ Sonner Toaster"]

    APP["App.jsx<br/>BrowserRouter + Suspense<br/>+ duplicate AuthProvider"]

    ENTRY --> APP

    APP --> PUBLIC["Public pages<br/>Landing · About · Services<br/>Pricing · Contact · Faq<br/>Login · Register"]
    APP --> PR["ProtectedRoute<br/>(role + status checks)"]
    PR --> STU["Student routes"]
    PR --> ADM["Admin routes"]

    subgraph STU["/student/*"]
        SDASH["StudentDashboard"]
        SPROF["StudentProfile"]
        SDOC["Documents (page)"]
        STSK["Tasks (page)"]
        SCH["ChangePassword"]
        SREC["UniversityRecommendations"]
    end

    subgraph ADM["/admin/*"]
        ADASH["AdminDashboard"]
        ALIST["StudentList"]
        ACREATE["CreateStudent"]
        AREQ["ContactRequests"]
        AREG["RegisteredStudents"]
        ADET["StudentDetail"]
        ATSK["Tasks (admin)"]
        ANOT["Notifications"]
        AAI["AIAssistant (chat)"]
    end

    %% Service layer
    subgraph SVC["src/services/* (HTTP)"]
        APIJS["api.js<br/>axios instance<br/>baseURL=VITE_API_URL"]
        APITS["lib/api.ts<br/>typed fetch helper"]
        AUTHSVC["authService · contactService · studentService"]
        AISVC["ai.service.js<br/>chatWithAI · uploadTempFile"]
        MCPAPI["mcpAPI.js (UNUSED)"]
        NOTSVC["notificationService"]
        RECSVC["recommendationService"]
        REQDOC["requireDocService"]
        STSVC["studentTaskService"]
        TASKSVC["taskService"]
        UPSVC["uploadService"]
    end

    %% Hooks + contexts
    AUTHCTX["AuthContext<br/>login · firebase · register<br/>logout · changePassword"]
    SOCKCTX["SocketProvider (useSocket.jsx)<br/>io(VITE_BACKEND_URL)<br/>emit joinRoom · on notification · messagesRead"]
    NOTCTX["NotificationContext<br/>on notification:new (toast)<br/>on notification:backfill (count)"]
    QHOOKS["useStudents · useTasks ·<br/>useNotifications · useViewMode"]

    STU & ADM --> SVC
    STU & ADM --> QHOOKS
    SVC --> APIJS
    SVC --> APITS

    %% Auth flows
    AUTHCTX --> AUTHSVC
    AUTHCTX -.localStorage{token,user}.-> APIJS
    AUTHSVC -->|POST /auth/login| BE
    AUTHCTX -.uses.-> FB["src/firebase/config.js<br/>Firebase Web SDK"]
    FB --> FBA[("Firebase Auth")]

    %% Sockets
    SOCKCTX --> NOTCTX
    SOCKCTX <-->|websocket auth.token| BE
    NOTCTX -.portal toasts.-> UI

    %% Chat / AI
    AAI --> CHATCMP["ChatComponent"]
    CHATCMP -->|files first| UPHELPER["uploadTempFile<br/>POST /files/temp-upload"]
    CHATCMP -->|stream NDJSON| CHATEP["chatWithAI<br/>POST /ai/chat"]
    CHATEP --> BE
    CHATCMP -.unused.-> MCPAPI

    %% File uploads
    SDOC --> DOCMGR["DocumentUpload / DocumentManager<br/>uploadService.* (multipart /upload)"]
    SDOC --> REQUI["RequiredDocuments<br/>requireDocService (multipart .../files)"]
    ADET --> RDA["RequiredDocumentsAdmin<br/>requireDocService"]

    BE["apps/backend :4000<br/>(REST + Socket.IO)"]

    classDef ctx fill:#fef9c3,stroke:#ca8a04
    classDef be fill:#dbeafe,stroke:#2563eb
    class AUTHCTX,SOCKCTX,NOTCTX,ENTRY,APP ctx
    class BE,FBA be
```

### Consultant-web — provider tree & lifecycle

```text
main.jsx
└── QueryClientProvider              (React Query, 30s stale, 1 retry)
    └── AuthProvider                 ← from src/context/AuthContext.jsx
        └── SocketProvider           ← src/hooks/useSocket.jsx
            └── NotificationProvider ← src/context/NotificationContext.jsx
                └── App + <Sonner Toaster richColors position="top-right"/>
                
App.jsx
└── AuthProvider           ⚠ DUPLICATE (outer is also AuthProvider) — see Appendix F
    └── BrowserRouter
        └── Suspense fallback=<Loading/>
            └── <Routes>...</Routes>
```

### Consultant-web — every page

#### Public

| Route | File | What happens |
|-------|------|--------------|
| `/` | `pages/Landing.jsx` | Marketing hero + features. No API. |
| `/about` `/services` `/pricing` `/faq` | static | No API. |
| `/contact` | `pages/Contact.jsx` | Form → `contactService.submit` → `POST /api/contact`. |
| `/login` | `pages/Login.jsx` | Two flows: admin username+password → `authService.login` → `POST /api/auth/login`; student → Firebase `signInWithPopup` or `signInWithEmailLink` → ID token → `authService.firebaseLogin` → `POST /api/auth/firebase-login`. Also sends email link via `POST /api/auth/login-link`. |
| `/register` | `pages/Register.jsx` | Student form → `useAuth.register` → `POST /api/auth/register`. |

#### Student (gated by `ProtectedRoute requireStudent`)

| Route | File | Calls |
|-------|------|-------|
| `/student/dashboard` | `pages/student/StudentDashboard.jsx` | `GET /students/:aiKey` + `GET /students/:aiKey/files` |
| `/student/profile` | `pages/student/StudentProfile.jsx` | `GET /students/:aiKey`, `PUT /students/me/profile` |
| `/student/documents` | `pages/student/Documents.jsx` | Renders `DocumentUpload`, `DocumentManager`, `RequiredDocuments` (student variant) |
| `/student/tasks` | `pages/student/Tasks.jsx` | `GET /students/:aiKey/tasks?markSeen=true`, `PATCH/DELETE`, attachment URL |
| `/student/change-password` | `pages/student/ChangePassword.jsx` | `POST /auth/change-password` |
| `/student/university-recommendations` | `pages/student/UniversityRecommendations.jsx` | `GET/POST /recommendations/...` |

#### Admin (gated by `ProtectedRoute requireAdmin`)

| Route | File | Calls |
|-------|------|-------|
| `/admin/dashboard` | `AdminDashboard.jsx` | `GET /students`, `GET /students/pending/contacts` |
| `/admin/students` (+ `/admin/student-profiles`) | `StudentList.jsx` | `GET /students?…`, `POST /students/:id/activate`, `DELETE /students/:id` |
| `/admin/students/create` | `CreateStudent.jsx` | `POST /students` |
| `/admin/requests` | `ContactRequests.jsx` | `GET /students/pending/contacts`, `POST /students/:id/approve-contact` |
| `/admin/students/registered` | `RegisteredStudents.jsx` | `GET /students/registered`, `POST /students/:id/activate` |
| `/admin/students/:id` | `StudentDetail.jsx` | Big page: profile, recommendations, `RequiredDocumentsAdmin`, tasks CRUD, Drive-style files (rename/delete/view) — uses every student-related service. |
| `/admin/tasks` | `Tasks.jsx` | `GET /tasks?…`, `DELETE /tasks/:id`, required-doc verify; subscribes `task:created`, `task:updated`. |
| `/admin/notifications` | `Notifications.jsx` | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`. |
| `/admin/assistant` | `AIAssistant.jsx` | `<AdminLayout><ChatComponent/></AdminLayout>` |

### Consultant-web — services (every HTTP call)

> Base = `import.meta.env.VITE_API_URL || 'http://localhost:4000/api'`. Auth header is `Bearer <localStorage.token>`. 401 → wipe `token`/`user` → `/login`.

| Service file | Function | Method · URL |
|--------------|----------|--------------|
| `services/authService.js` | `login`, `firebaseLogin`, `loginLink`, `register`, `changePassword`, `getProfile`, `registerAdmin` | `POST/GET /auth/*` |
| `services/authService.js` | `contactService.submit` | `POST /contact` |
| `services/authService.js` | `studentService.updateMyProfile`, `getByKey` | `PUT /students/me/profile`, `GET /students/:aiKey` |
| `lib/api.ts` | typed wrappers for students, tasks, notifications | (mirrors authService + lib API set) |
| `services/ai.service.js` | `chatWithAI(messages, signal, onToken, onNotification)` | `POST /ai/chat` (NDJSON reader) |
| `services/ai.service.js` | `uploadTempFile(file)` | `POST /files/temp-upload` (multipart) |
| `services/notificationService.js` | `list`, `markRead`, `markAllRead` | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all` |
| `services/recommendationService.js` | `getRecommendations`, `generateRecommendation`, `enableRecommendation` | `GET/POST/PATCH /recommendations/*` |
| `services/requireDocService.js` | `list`, `add`, `delete`, `updateSettings`, `upload`, `listFiles`, `getUrl`, `deleteFile`, `verify` | `/students/:aiKey/required-documents[...]` |
| `services/studentTaskService.js` | `list`, `create`, `update`, `attachmentUrl`, `delete` | `/students/:aiKey/tasks[...]` |
| `services/taskService.js` | `list`, `update`, `delete`, `markNotificationsRead` | `/tasks[...]` |
| `services/uploadService.js` | `uploadDocuments`, file helpers | `POST /upload` |
| `services/mcpAPI.js` | `streamMessage` | `POST VITE_MCP_URL` — **imported but not used** |

### Consultant-web — hooks & contexts (every state slice)

| File | Exports | Subscribes to | Mutates |
|------|---------|---------------|---------|
| `context/AuthContext.jsx` | `useAuth`, `AuthProvider` | localStorage `token`,`user` | login/logout/register/changePassword/updateUser/firebase |
| `context/NotificationContext.jsx` | `NotificationProvider`, `useNotifications` | socket `notification:new` (toast + count), `notification:backfill` (count) | `unreadCount`, in-app toast queue |
| `hooks/useSocket.jsx` | `SocketProvider`, `useSocket` | `connect` (emits `joinRoom`), `notification` (per-room map), `messagesRead` | `socket`, `notificationMap`, `unreadTotal` |
| `hooks/useNotifications.js` | `useNotificationsList`, `useMarkRead`, `useMarkAllRead` | React Query keys via `lib/api` | server state |
| `hooks/useStudents.js` | `useStudents`, `useRegisteredStudents`, `usePendingContacts`, `useStudent`, `useCreateStudent`, `useUpdateStudent`, `useActivateStudent`, `useDeleteStudent`, `useApproveContact` | React Query | server state |
| `hooks/useTasks.js` | `useTasks`, `useDeleteTask` | React Query | server state |
| `hooks/useViewMode.js` | `useViewMode(key, default)` | localStorage | local UI state |

### Consultant-web — components (non-primitive list)

| File | Purpose |
|------|---------|
| `components/layout/AdminLayout.jsx` | App shell for `/admin/*`. Polls `taskService.list` for AI task dot. Subscribes to `task:created`/`task:updated`. Subscribes to `useNotifications.unreadCount` for nav dot. Logout button. |
| `components/layout/StudentLayout.jsx` | App shell for `/student/*`. Polls `studentTaskService.list`. Shows `useSocket.unreadTotal` badge on the (currently dead) `/student/messages` link. Locks student to recommendations until profile complete + first login over. |
| `components/layout/AppSplitterLayout.jsx` | Resizable panel layout with localStorage persistence. |
| `components/layout/Navbar.jsx`, `Footer.jsx` | Public marketing chrome. |
| `components/admin/NotificationBell.jsx` | Bell icon — uses `taskService.list({scope:'notifications'})` + `taskService.markNotificationsRead`. Subscribes `task:created`/`task:updated`. |
| `components/admin/RequiredDocumentsAdmin.jsx` | The big required-docs UI in `StudentDetail`. Uses `requireDocService` + `studentService.getStudentByKey`. |
| `components/admin/StudentCard.jsx`, `StudentListItem.jsx` | List items linking to `/admin/students/:id`. |
| `components/student/DocumentUpload.jsx` | Dropzone → `uploadService.uploadDocuments` (`POST /upload`). |
| `components/student/DocumentManager.jsx` | Drive-style list, rename/delete/view via `uploadService`. |
| `components/student/RequiredDocuments.jsx` | Student checklist with viewer + upload modal. |
| `components/student/DocumentViewer.jsx` | Modal PDF/image viewer used everywhere. |
| `components/student/UploadConfirmationModal.jsx`, `UploadedFilesModal.jsx` | Upload UX modals. |
| `components/student/StudentJourneyFlow.jsx` | Step-by-step journey widget on dashboard. |
| `components/student/ProfileFieldDisplay.jsx` | Read-only field row. |
| `components/chat/ChatComponent.jsx` | The AI assistant UI. Reads NDJSON stream from `/ai/chat`. On attachment, first uploads via `uploadTempFile`, then injects `[System: User attached file: <name> (Path: <path>)]` into the user message so the MCP `uploadDocument` tool can pick it up. |
| `components/chat/MessageRenderer.jsx` | `react-markdown` + clickable file-name detection → calls `onFileClick`. |
| `components/common/Button.jsx`, `Card.jsx`, `Loading.jsx`, `Toast.jsx`, `ConfirmDialog.jsx`, `ErrorBoundary.jsx`, `FilePreview.jsx`, `VerificationBadge.jsx`, `ViewToggle.jsx` | Shared primitives. |
| `components/ui/*` | shadcn/Radix design system primitives. |

### Consultant-web — file-upload flow paths

All uploads go through the backend (no direct browser→S3 from this app):
- **Profile/document bulk upload**: `DocumentUpload` → `uploadService.uploadDocuments` → `POST /api/upload` → multer disk → AI extract → S3 upload → student upsert.
- **Required document file**: `RequiredDocumentsAdmin` / `RequiredDocuments` → `requireDocService.upload` → `POST /api/students/:aiKey/required-documents[/:docId]/files`.
- **Student task attachment**: `studentTaskService.create` → `POST /api/students/:aiKey/tasks` (multipart `attachment`).
- **Chat attachment**: `ChatComponent` → `ai.service.uploadTempFile` → `POST /api/files/temp-upload` (returns abs path) → path embedded into chat message → MCP `uploadDocument` tool reads from disk and reposts to backend.

---

## 5 — DIAGRAM #4 — MCP SERVER internal architecture (`apps/mcp-server`)

```mermaid
flowchart TB
    REQ["POST /api/chat<br/>JSON {message, firmId?}<br/>+ Authorization: Bearer …<br/>+ X-Firm-Id (optional)"]

    REQ --> CTRL["controllers/chat.controller.js<br/>extractMessage()<br/>extract auth + firmId"]

    CTRL --> RUNCTX["utils/authContext.js<br/>runWithAuthContext(authHeader, firmId, ...)<br/>AsyncLocalStorage"]

    RUNCTX --> SVC["services/mcp.service.js<br/>sendToMCP(message)<br/>normalize + format"]

    SVC --> PROC["mcp/chatProcessor.js<br/>runMCPChat(userMessage)"]

    PROC --> ATTACH{"Attachments?<br/>regex matches<br/>[System: User attached file: …]"}
    ATTACH -->|yes| POL["Inject<br/>'CRITICAL ATTACHMENT POLICY' system msg"]
    ATTACH -->|no| OAI1
    POL --> OAI1

    OAI1["openai.chat.completions.create<br/>model = OPENAI_MODEL (gpt-4.1)<br/>tools = registry · tool_choice=auto"]

    OAI1 --> CHECK{"tool_calls?"}
    CHECK -->|no & attachments required| RETRY["retry with<br/>tool_choice='required'"]
    RETRY --> OAI1
    CHECK -->|tool_calls present| INVOKE

    INVOKE["mcp/toolInvoker.js<br/>invokeTool(name, args)<br/>= tools[name].run(args)"]

    INVOKE --> REG["tools/_toolRegistry.js<br/>autoload every *.js in tools/"]

    REG --> DOC["documentTools.js (7)"]
    REG --> STUT["studentTools.js (6)"]
    REG --> TSKT["taskTools.js (4)"]
    REG --> EML["emailTools.js (1)"]

    DOC -->|httpClient| BE
    STUT -->|services/student.service.js| BE
    TSKT -->|services/student.service.js| BE
    EML -->|services/email.service.js| SMTP[("SMTP")]

    BE["apps/backend :4000<br/>REST /api/*<br/>(receives Bearer + X-Firm-Id)"]

    INVOKE --> OAI2["second openai.chat.completions.create<br/>with tool results"]
    OAI2 --> FINAL{"more tool_calls?"}
    FINAL -->|yes & uploadDocument needed| INVOKE
    FINAL -->|no| REPLY

    REPLY["{ reply, notifications }"] --> SVC
    SVC --> CTRL --> STREAM["streamReply()<br/>NDJSON: {token}\\n × N<br/>+ {notification}\\n × M<br/>+ {done:true}\\n"]

    STREAM -->|application/x-ndjson| CLIENT["browser ChatComponent<br/>reads stream"]

    classDef oai fill:#fef9c3,stroke:#ca8a04
    classDef tool fill:#dcfce7,stroke:#16a34a
    classDef be fill:#dbeafe,stroke:#2563eb
    class OAI1,OAI2 oai
    class DOC,STUT,TSKT,EML,REG,INVOKE tool
    class BE,SMTP be
```

### MCP server — every tool (the 18-strong registry)

> All tools are autoloaded by `tools/_toolRegistry.js`. Document tools use `utils/httpClient` (`BACKEND_URL`). Student/task tools use `services/student.service.js` (`CRM_API_URL || BACKEND_URL`). Both inject `Authorization` (user Bearer if present, else `BACKEND_SERVICE_TOKEN`) and `X-Firm-Id` from `AsyncLocalStorage`.

#### `tools/documentTools.js` (7 tools)

| Tool | Args | Backend call |
|------|------|--------------|
| `uploadDocument` | `aiKey`, `documentType`, `filePath` | `POST /students/:aiKey/required-documents/files` (multipart `file`+`documentType`); deletes `filePath` after. |
| `getStudentDocuments` | `aiKey` | `GET /students/:aiKey/files` |
| `getDocumentById` | `aiKey`, `docId`, `fileId` | `GET /students/:aiKey/required-documents/:docId/files/:fileId/url` |
| `verifyDocument` | `aiKey`, `docId`, `fileId`, `verified?`, `notes?` | `POST .../files/:fileId/verify` |
| `renameDocument` | `aiKey`, `documentId`, `newName` | `POST /students/:aiKey/documents/:documentId/rename` |
| `getRequiredDocuments` | `aiKey` | `GET /students/:aiKey/required-documents` |
| `deleteDocument` | `aiKey`, `documentName` *or* `documentId` | If `documentName`: `GET .../required-documents` → fuzzy match → resolve `documentId`. Then `DELETE /students/:aiKey/required-documents/:documentId`. |

#### `tools/studentTools.js` (6 tools)

| Tool | Args (`studentId` = `aiKey`) | Service · Backend call |
|------|------------------------------|------------------------|
| `getStudentById` | `studentId` | `GET /students/:id` |
| `searchStudents` | `query?` | `GET /students?search=…` |
| `getStudentMissingDocuments` | `studentId` | `GET /students/:id/missing-documents` |
| `updateStudentStage` | `studentId`, `newStage` | `PATCH /students/:id/stage` |
| `addStudentNote` | `studentId`, `noteText` | `POST /students/:id/notes` |
| `getStudentOverview` | `studentId` | `GET /students/:id/overview` |

#### `tools/taskTools.js` (4 tools)

| Tool | Args | Service · Backend call |
|------|------|------------------------|
| `getTasksForStudent` | `studentId` | `GET /students/:id/tasks` |
| `createStudentTask` | `studentId`, `title`, `description?`, `dueDate?`, `attachmentPath?` | `POST /students/:id/tasks` (multipart) |
| `updateStudentTaskStatus` | `studentId`, `taskId`, `status`, `notes?` | `PATCH /students/:id/tasks/:taskId` |
| `deleteStudentTask` | `studentId`, `taskId` | `DELETE /students/:id/tasks/:taskId` |

#### `tools/emailTools.js` (1 tool)

| Tool | Args | Action |
|------|------|--------|
| `sendEmail` | `to`, `subject`, `body`, `html?` | `services/email.service.js` → nodemailer SMTP. Returns `{ success, messageId, notification: { type:'success', message:'Email sent successfully to <to>' } }`. **Only tool that emits `notification`.** |

### MCP server — the prompt engineering rules baked into `chatProcessor`

Lifted verbatim from the system prompt (so you know exactly why the agent behaves the way it does):

1. If any user message contains `[System: User attached file: <name> (Path: <path>)]`, the model is **forced** to call `uploadDocument`. Multi-stage retries with `tool_choice='required'` and a final `tool_choice: { type:'function', function:{ name:'uploadDocument' } }` will be issued before throwing.
2. All responses are markdown. Filenames are bolded. Lists are bulleted/numbered. IDs go in backticks.
3. Task tools are mandatory for create/update/delete; the model must confirm the student & task with the user before mutating, then confirm success/failure after.
4. Tasks list rendering uses a table with columns **Task / Created / Status / Due Date**.
5. Completing a task uses `updateStudentTaskStatus` with status `"completed"`.

### MCP server — the per-request flow (one paragraph)

A chat POST hits `/api/chat`. The controller (`chat.controller.js`) trims the body's `message`, captures `Authorization` and `firmId`, and wraps everything in `runWithAuthContext`. This installs an `AsyncLocalStorage` store so any axios call made deep inside any tool can pull the same auth context with `getAuthHeader()` / `getFirmId()`. Then `sendToMCP` calls `runMCPChat`, which builds the OpenAI messages (system prompt → optional attachment policy → user), enumerates the dynamic tool registry, and asks `gpt-4.1` for a completion with `tool_choice='auto'`. If a tool is called, `invokeTool` looks it up in the autoloaded `_toolRegistry` and calls its `run()` — that `run()` either fires an HTTP request to the backend (with the original Bearer token replayed and `X-Firm-Id` attached) or sends an email via SMTP. Tool results return to OpenAI as `role: 'tool'` messages, a second completion produces the final natural-language reply, and `streamReply` writes it back to the browser one character at a time as newline-delimited JSON tokens. The browser's `ChatComponent` reconstructs the string and renders it as markdown.

---

## 6 — Feature wiring traces (end-to-end, per feature)

Ordered **biggest → smallest** in business value. Each trace is a numbered chain you can read top-down.

### 6.1 — Document upload (the canonical flagship feature)

There are **four different upload paths** in the system. Know which one fires when.

**Path A — Student uploads their own file via the Documents page**

1. `pages/student/Documents.jsx` renders `<DocumentUpload/>` (`components/student/DocumentUpload.jsx`).
2. User drops files → `uploadService.uploadDocuments(files, aiKey)` builds a `FormData` with each file under `files[]` plus `aiKey`.
3. `axios POST /api/upload` (interceptor adds `Authorization: Bearer <token>`).
4. Backend `routes/index.js` → `protectedRouter` → `authenticateToken` (sets `req.context`) → `tenantContextMiddleware` (opens tx with `set_app_context(firmId)`).
5. `modules/upload/upload.routes.js` → `multer.array('files', 20)` (10MB cap) → `upload.controller.js handleUpload`.
6. For each file:
   - `AI/ai-file-extract/extract.service.js extractProfileWithAI` extracts text (`pdf-parse`/`mammoth`) → `classifyDocument` (OpenAI `gpt-4o-mini`) → `extractImportantFields` (OpenAI).
   - `modules/s3/s3.service.js uploadFileToS3` uploads to `AWS_S3_BUCKET_NAME`.
   - `student.service.js upsertStudent` merges results into `students.profile_data` & inserts `documents` row.
   - `field-priority.js prioritizeFields` ensures higher-quality sources win.
7. Response includes the extracted profile delta; frontend updates state.

**Path B — Admin uploads a file against a "required document" slot in Student Detail**

1. `pages/admin/StudentDetail.jsx` → `<RequiredDocumentsAdmin/>` → `requireDocService.upload(aiKey, docId, file)`.
2. `POST /api/students/:aiKey/required-documents/:docId/files` (multer).
3. `student.controller.js uploadRequiredDocumentFile` → S3 upload → embed file metadata into the student's `requiredDocuments[].files[]` array → invoke `verifyDocumentType` (legacy `AI/ai-document-verify`) → `createAIVerificationTask` (`tasks.service.ts`) which inserts a row in `tasks` AND fires `emitToFirm 'task:created'` over Socket.IO.
4. Admin's `Tasks.jsx` page is listening for `task:created` → refetches → the new AI verification task appears live.

**Path C — Chat upload (the agentic path)**

This is the path you specifically asked about. Here's every hop:

1. User types in `ChatComponent.jsx`, attaches a file (e.g. `passport.pdf`).
2. `ai.service.js uploadTempFile(file)` → `POST /api/files/temp-upload` (multer single).
3. Backend `routes/file.routes.js` writes to OS tmp dir (e.g. `/var/folders/.../upload-xyz.pdf`) and returns `{ filePath: '/var/folders/.../upload-xyz.pdf' }`.
4. `ChatComponent` rewrites the user message to include `[System: User attached file: passport.pdf (Path: /var/folders/.../upload-xyz.pdf)]` so the MCP agent can detect it.
5. `chatWithAI(messages)` → `POST /api/ai/chat` with `Authorization: Bearer <token>` body `{ message, firmId? }`.
6. Backend `modules/ai/ai.routes.ts POST /chat` axios-proxies to `${MCP_SERVER_URL}` = `http://localhost:3002/api/chat`, forwarding `Authorization` and adding `X-Firm-Id: <req.context.firmId>`. **Streams response body straight back to the browser.**
7. MCP `chat.controller.js`:
   - `runWithAuthContext(authHeader, firmId, ...)` installs `AsyncLocalStorage`.
   - `mcp.service.js sendToMCP` → `chatProcessor.runMCPChat(userMessage)`.
8. `chatProcessor`:
   - Detects attachment regex → injects "CRITICAL ATTACHMENT POLICY" system message.
   - First OpenAI completion with all 18 tools, `tool_choice='auto'`.
   - Model returns `tool_calls: [{ name: 'uploadDocument', args: { aiKey, documentType, filePath } }]`. If model didn't have `aiKey`, it first calls `searchStudents` — `chatProcessor` allows that, then loops back.
9. `toolInvoker.invokeTool('uploadDocument', args)` → `documentTools.js uploadDocument`:
   - `httpClient.post('/students/:aiKey/required-documents/files', formData)` (multipart with `file: createReadStream(filePath)` + `documentType`).
   - `httpClient`'s axios interceptor adds `Authorization: Bearer <original token>` and `X-Firm-Id: <firmId>` from the `AsyncLocalStorage` context.
   - **After response**, `unlink(filePath)` cleans the tmp file.
10. Backend handles it as if it were Path B (`uploadRequiredDocumentFile`), so `task:created` fires identically over Socket.IO.
11. Tool result returns to OpenAI as `role:'tool'` message → second completion produces final markdown reply ("✅ Uploaded passport.pdf as Passport for student X. The AI verification task has been queued.").
12. `streamReply` writes one character per NDJSON line back through MCP → backend proxy → browser.
13. Browser's `ChatComponent` reconstructs the markdown progressively and renders.

**Path D — Programmatic single-file presigned upload (the most modern flow)**

1. Client calls `POST /api/documents/upload-url` with `{ studentId, fileName, mimeType }`.
2. `documents.service.ts generateUploadUrl` inserts a stub row in `documents` and returns a presigned PUT URL.
3. Client `PUT`s the file straight to S3.
4. Client calls `POST /api/documents/:id/finalize`.
5. `finalizeUpload` does `s3.HeadObject` and **always** enqueues `verifyQueue.add('verify', { documentId, ... })`. If size ≥ 50MB, also enqueues `hashingQueue.add('hash', ...)`; else hashes inline.
6. `ai.worker.startVerifyWorker` consumes → downloads → `verifyDocumentType` → updates `documents.ai_verification` → may call `createAIVerificationTask`.
7. `documents.worker.startHashingWorker` consumes → streams S3 object → SHA-256 → writes `documents.file_hash`.

> ⚠ The frontend currently uses Paths A/B/C. Path D is built but not wired into the SPA yet.

### 6.2 — Authentication

**Admin login**

1. `Login.jsx` → `useAuth.login(username, password)` → `authService.login` → `POST /api/auth/login`.
2. `auth.controller.login` looks up by email in `users`, bcrypt-compares, signs JWT (15m), sets refresh cookie (7d, httpOnly, path `/api/auth/refresh`).
3. Returns `{ token, user }`. `AuthContext` writes both to `localStorage`.

**Student login (passwordless)**

- *Email link path*: `Login.jsx` submits email → `POST /api/auth/login-link` → `sendStudentInviteEmail` (Firebase `generateSignInWithEmailLink` + SMTP). User clicks link → Firebase Web SDK `signInWithEmailLink` → ID token → `POST /api/auth/firebase-login` → backend verifies via `firebase-admin`, upserts student row if first time, mints JWT.
- *Google path*: Firebase popup → ID token → same `POST /api/auth/firebase-login`.

**Token refresh**

- `POST /api/auth/refresh` reads `req.cookies.refreshToken`, verifies, mints new access + rotates refresh.  
- ⚠ The SPA **does not auto-refresh** today — a 401 simply wipes localStorage and forces re-login.

**Change password (admins only)** — `POST /api/auth/change-password` with bcrypt re-check.

### 6.3 — Tasks (the realtime board)

1. Admin clicks "Create task" in `pages/admin/StudentDetail.jsx` or via `RequiredDocumentsAdmin`.
2. `studentTaskService.create(aiKey, payload)` → `POST /api/students/:aiKey/tasks` (multipart for attachment).
3. `student.controller.createStudentTask` inserts via `tasks.service.ts createTask` → `emitToFirm(firmId, 'task:created', task)`.
4. Every connected admin in `firm:<id>` room receives `task:created` → `Tasks.jsx`, `AdminLayout.jsx`, `NotificationBell.jsx` all refresh.
5. Student opens `pages/student/Tasks.jsx` → `GET /api/students/:aiKey/tasks?markSeen=true` — marks their `seenByStudent` flag.
6. Student completes → `PATCH /api/students/:aiKey/tasks/:taskId` → `completeTask` updates row + `emitToFirm 'task:updated'`. Admin's view updates live.
7. AI-generated verification tasks (`task_type='ai_verification'`) come in via the BullMQ worker path described in 6.1.D.

### 6.4 — Notifications

1. Any backend service can call `notifications.service.send(firmId, userId, { type, title, body, payload })`.
2. Insert into `notifications` table (`withFirmContext`).
3. `emitToUser(firmId, userId, 'notification:new', row)` — only that user's `firm:<id>:user:<uid>` room receives it.
4. On the browser, `NotificationContext` is listening to `notification:new` → increments `unreadCount` + shows portal toast.
5. On reconnect, the socket server fires `notification:backfill` with the last 20 unread → `NotificationContext` sets `unreadCount`.
6. `pages/admin/Notifications.jsx` reads via REST `GET /api/notifications`, with `POST /:id/read` and `POST /read-all`.

### 6.5 — Billing (Stripe Connect)

| Operation | Flow |
|-----------|------|
| Onboard firm | Admin clicks Connect → `POST /api/billing/stripe/connect` → `stripeService.createConnectAccount` (Custom account) → row in `firm_stripe_accounts`. → `POST /api/billing/stripe/accounts` creates operating + trust subaccounts. → `GET /api/billing/stripe/onboarding-link` returns Stripe AccountLink for KYC. |
| Send invoice | `POST /api/billing/invoices` → `invoices.service.createInvoice` (inserts draft) → `POST /invoices/:id/send` calls Stripe Invoices/InvoiceItems API + sets `status='sent'`. |
| Payment | Stripe → `POST /api/webhooks/stripe` with `invoice.paid` → verify signature → `markPaid` updates `invoices` + inserts `trust_ledger` deposit row. |
| Trust ledger | Manual entries via `/trust/deposit`, `/trust/withdrawal`, `/trust/transfer`. Monthly reconciliation reads Stripe Balance and sums `trust_ledger`. |
| Retainer signing | `POST /api/billing/retainers` creates draft from a `.hbs` template → `POST /retainers/:id/send` sends for e-signature → `POST /retainers/:id/sign` finalizes + writes signed PDF to S3 with Object Lock. |

### 6.6 — AI Recommendations

1. Student or admin hits `pages/student/UniversityRecommendations.jsx` → `recommendationService.generateRecommendation(studentId)` → `POST /api/recommendations/generate/:studentId`.
2. `AI/ai-recommendation/recommendation.controller.js` calls `aiRecommendation.service.generateUniversityListFromProfile(studentProfile)` (OpenAI `gpt-4o-mini`).
3. Caches result against the student.
4. `GET /api/recommendations/:studentId` returns the cached list.
5. The new module `/api/ai/recommendations/:id` uses `runAIJob` (Anthropic Sonnet primary, OpenAI fallback) and logs to `ai_jobs`.

### 6.7 — AI Document Verification (the queue)

1. Any upload finalize / required-doc upload → `verifyQueue.add('verify', { documentId, firmId, s3Key, expectedType })`.
2. `ai.worker.startVerifyWorker` consumes → S3 download to tmp → `verifyDocumentType(text, images, expectedType)` (vision + JSON mode).
3. `withFirmContext(firmId, tx => update documents.ai_verification = {verdict, confidence, reason, model})`.
4. If verdict ≠ expected, `createAIVerificationTask` upserts a task and fires `task:created`/`task:updated`.

### 6.8 — Realtime channels (the always-on plane)

- Browser opens `io(VITE_BACKEND_URL)` with `auth: { token }` → backend `authenticateSocket` JWT-verifies, joins `firm:<id>` + `firm:<id>:user:<uid>` + legacy rooms.
- Emits:
  - `task:created` / `task:updated` — fired by `tasks.service` writes.
  - `notification:new` — fired by `notifications.service.send`.
  - `notification:backfill` — fired once on connect.
  - `notification` / `messagesRead` — legacy room-counter events still handled by `useSocket.jsx`.

### 6.9 — Contact form (public)

1. Marketing/SPA visitor submits `pages/Contact.jsx` → `POST /api/contact`.
2. `contact.controller.submitContact` inserts pending `students` row (status='pending'), generates `aiKey`, emails admins.
3. Admin sees it in `/admin/requests` (`ContactRequests.jsx` → `GET /students/pending/contacts`).
4. Admin clicks Approve → `POST /students/:id/approve-contact` → flips status, sends invite email.

### 6.10 — Student registration (public)

1. `pages/Register.jsx` → `POST /api/auth/register`.
2. `auth.controller.registerStudent` inserts `students` row, generates `aiKey`, emails admins, sends Firebase email link.
3. Student clicks email link → Firebase passwordless flow → `firebaseLogin` (6.2).

### 6.11 — Admin AI Assistant (chat)

Already covered fully in 6.1 Path C. Two extra notes:

- The bell `NotificationBell.jsx` uses `taskService.list({scope:'notifications'})` — a *task-based* notification stream **separate** from the REST `/notifications` endpoint. Both are wired and live; see Appendix F.
- The chat opens files from assistant text by calling `GET /api/ai/documents/url?fileName=<...>` (concatenates `VITE_API_URL`'s origin + `/api/ai/documents/url`). If your `VITE_API_URL` already ends with `/api` you may end up with `/api/api/...` — verify before deploy.

### 6.12 — Health check

`GET /health` → pings Postgres (`SELECT 1`) + Redis (`PING`) → `{ postgres, redis, uptime }`.

---

## A — Appendix A — Port map & env vars

### Port map (dev defaults)

| Component | Port | Where set |
|-----------|------|-----------|
| Backend API | **4000** | `apps/backend/src/config/env.js` (`PORT`) |
| Backend Socket.IO | **4000** | Same HTTP server (`initSocket(server)`) |
| Consultant Web (Vite) | **5173** | Vite default (no override in `vite.config.js`) |
| MCP Server | **3002** | `apps/mcp-server/index.js` (`getEnv("PORT", 3002)`) |
| Marketing (Next) | **3000** | Next.js default |
| Postgres | **5433** → 5432 | `docker-compose.dev.yml` |
| Redis | **6379** | `docker-compose.dev.yml` |

### Env vars by app

**Backend (`apps/backend/src/config/env.js` + ad-hoc reads):**

```
# Server
PORT=4000
NODE_ENV=development
APP_BASE_URL=http://localhost:5173        # CORS allow + email links

# Multi-tenancy
DEFAULT_FIRM_ID=                          # fallback when JWT lacks firm_id

# Postgres
DATABASE_URL=postgresql://icrm:icrm_dev@localhost:5433/icrm_dev

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_SECRET=                               # legacy fallback for both
JWT_EXPIRY=7d

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ca-central-1
AWS_S3_BUCKET_NAME=
S3_PRESIGNED_URL_EXPIRY=3600

# AI
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_MODEL=                             # ad-hoc default 'gpt-4o-mini'
OPENAI_VERIFICATION_MODEL=

# MCP
MCP_SERVER_URL=http://localhost:3002/api/chat

# Email / SMTP
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=     # or SMTP_PASS
EMAIL_FROM=
ADMIN_NOTIFICATIONS_EMAIL=

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_DYNAMIC_LINK_DOMAIN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=

# Sockets
SOCKET_ALLOWED_ORIGINS=                   # comma-separated
CLIENT_URL=                               # legacy fallback for socket CORS

# Legacy / one-off
MONGODB_URI=                              # only for ETL script
```

**Consultant Web (`import.meta.env.VITE_*`):**

```
VITE_API_URL=http://localhost:4000/api    # REST + AI proxy + temp-upload + URL builder
VITE_BACKEND_URL=http://localhost:4000    # Socket.IO origin (preferred)
VITE_MCP_URL=http://localhost:3002/api/chat   # only used by unused mcpAPI.js
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

**MCP Server (`apps/mcp-server/config/env.js`):**

```
PORT=3002
BACKEND_URL=http://localhost:5000/api     # ⚠ default in code is 5000/api; .env.example uses 4000
BACKEND_SERVICE_TOKEN=                    # fallback Bearer if request has no auth
CRM_API_URL=                              # used only by services/student.service.js; preferred if set
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1                      # default in chatProcessor
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
```

### Root scripts (`/Volumes/Trupesh/Immigration-CRM/package.json`)

```bash
pnpm docker:dev      # spin up Postgres + Redis
pnpm dev:backend     # apps/backend dev (tsx watch)
pnpm dev:web         # apps/consultant-web dev (vite)
pnpm dev:mcp         # apps/mcp-server dev (nodemon)
pnpm build           # -r build all
pnpm lint            # -r lint
```

---

## B — Appendix B — Postgres schema

```mermaid
erDiagram
    firms ||--o{ users : "firm_id"
    firms ||--o{ students : "firm_id"
    firms ||--o{ documents : "firm_id"
    firms ||--o{ tasks : "firm_id"
    firms ||--o{ notifications : "firm_id"
    firms ||--o{ ai_jobs : "firm_id"
    firms ||--o{ invoices : "firm_id"
    firms ||--o{ trust_ledger : "firm_id"
    firms ||--o{ retainer_agreements : "firm_id"
    firms ||--|| firm_stripe_accounts : "firm_id"

    students ||--o{ documents : "student_id"
    students ||--o{ tasks : "student_id"
    students ||--o{ invoices : "student_id"
    students ||--o{ trust_ledger : "student_id"
    students ||--o{ retainer_agreements : "student_id"

    users ||--o{ students : "assigned_to"
    users ||--o{ tasks : "assigned_to / created_by"
    users ||--o{ documents : "uploaded_by"
    users ||--o{ notifications : "user_id"
    users ||--o{ trust_ledger : "recorded_by"

    documents ||--o{ tasks : "document_id"

    retainer_agreements ||--o{ invoices : "retainer_id"
    invoices ||--o{ trust_ledger : "related_invoice_id"
```

| Table | Key columns (highlights) |
|-------|--------------------------|
| `firms` | id, name, slug (unique), plan_tier, settings JSONB |
| `users` | id, firm_id, email, password_hash, role∈{admin,senior,junior,student}, rcic_number, last_login_at |
| `students` | id, firm_id, email (unique per firm), ai_key (unique global), assigned_to → users, status∈{pending,registered,active,closed}, stage∈{lead,study_permit,pgwp,pr,citizenship}, profile_data JSONB, state_data JSONB |
| `documents` | id, firm_id, student_id, document_type, s3_key, s3_bucket, mime_type, size_bytes, version, file_hash, ai_verification JSONB, uploaded_by |
| `tasks` | id, firm_id, student_id?, document_id?, task_type∈{general,ai_verification,deadline,reminder}, status∈{open,in_progress,done,dismissed}, assigned_to, created_by, ai_generated, due_at, completed_at, verification_history JSONB, meta JSONB |
| `notifications` | id, firm_id, user_id, type (dot-namespaced), title, body, payload JSONB, read_at, delivered_via TEXT[] |
| `ai_jobs` | id, firm_id, job_type∈{doc_verify,field_extract,recommendation,chat,fraud_screen}, related_entity_*, model, provider, tokens, cost_cents, latency_ms, status, input_summary, output, error_message, consultant_feedback |
| `firm_stripe_accounts` | firm_id (PK), stripe_account_id (unique), operating_account_id, trust_account_id, onboarding_status, charges_enabled |
| `retainer_agreements` | id, firm_id, student_id, version, template_key, rendered_html, signed_at, signed_ip, signed_user_agent, pdf_s3_key, scope JSONB, status∈{draft,sent,signed,withdrawn} |
| `invoices` | id, firm_id, student_id, retainer_id?, amount_cents, currency, status∈{draft,sent,paid,void,refunded}, stripe_invoice_id, stripe_payment_intent_id, issued_at, paid_at, due_at, line_items JSONB |
| `trust_ledger` | id, firm_id, student_id, amount_cents, entry_type∈{deposit,withdrawal,transfer_to_operating,refund}, related_invoice_id, related_stripe_charge_id, recorded_by, reconciled |

**Row-level security**: `migrations/0002_rls_users.sql` + `0003_rls_students_documents.sql` enable RLS. Every row references `firm_id`; policies require the session GUC set by `set_app_context(firmId)` (via `withFirmContext` or `tenantContextMiddleware`).

---

## C — Appendix C — Background workers & queues

| Queue | Job | Producer | Consumer (worker) | Effect |
|-------|-----|----------|-------------------|--------|
| `document-hashing` | `hash` | `documents.service.finalizeUpload` (when size ≥ 50MB) | `documents.worker.startHashingWorker` | Stream S3 object → SHA-256 → update `documents.file_hash` |
| `ai-verify` | `verify` | `documents.service.finalizeUpload` (always); also `POST /api/ai/verify-document/:id` | `ai.worker.startVerifyWorker` | Download from S3 → `verifyDocumentType` → update `documents.ai_verification`; conditionally `createAIVerificationTask` |

Both queues live in Redis (`REDIS_URL`). Workers are started inline by `apps/backend/src/index.js` at boot (skipped when `NODE_ENV=test`).

---

## D — Appendix D — Realtime channels & socket events

**Rooms** (joined on connect):

| Room name | Members | Used for |
|-----------|---------|----------|
| `firm:<firmId>` | all users in firm | broadcast (`emitToFirm`) — tasks |
| `firm:<firmId>:user:<userId>` | one user | direct (`emitToUser`) — notifications |
| `user:<userId>` (legacy) | one user | legacy notification path |
| `admins` (legacy) | all admin role users | legacy task broadcast |

**Events server → client:**

| Event | When | Payload | Client handler |
|-------|------|---------|----------------|
| `notification:backfill` | On connect | `{ notifications, unreadCount }` (last 20 unread) | `NotificationContext` → `setUnreadCount` |
| `notification:new` | `notifications.service.send` | row | `NotificationContext` → toast + increment |
| `task:created` | `tasks.service.createTask` / `createAIVerificationTask` | task row | `Tasks.jsx`, `NotificationBell.jsx`, `AdminLayout.jsx` → refetch |
| `task:updated` | `tasks.service.completeTask`/`updateTask`/`reassignTask` | task row | same |
| `notification` (legacy) | n/a in new code | `{ roomId, unreadCount }` | `useSocket` → per-room map |
| `messagesRead` (legacy) | n/a in new code | `{ roomId, userId }` | `useSocket` → clear room count |

**Events client → server:**

| Event | Origin | Handler |
|-------|--------|---------|
| `joinRoom` | `useSocket` emits on every `connect` `{ userId, role }` | **No server handler today** — rooms are joined automatically by `authenticateSocket` middleware. The client emit is a vestige. |

---

## E — Appendix E — Complete REST surface

> This is the cheat sheet you print and put on the wall. Mount prefix `/api` on all routes (except where noted).

```text
PUBLIC
─────────────────────────────────────────────────────────────────────────
POST   /api/auth/login                      → admin email+password
POST   /api/auth/firebase-login             → student Firebase ID token
POST   /api/auth/login-link                 → request passwordless email
POST   /api/auth/register                   → student self-register
POST   /api/auth/register-admin             → first admin bootstrap
POST   /api/auth/refresh                    → refresh access token (cookie)
GET    /api/auth/test                       → echo
POST   /api/contact                         → public contact form

WEBHOOKS (public, raw body)
─────────────────────────────────────────────────────────────────────────
POST   /api/webhooks/stripe                 → invoice.paid · account.updated

AUTHENTICATED (Bearer JWT) + tenant tx
─────────────────────────────────────────────────────────────────────────
POST   /api/auth/change-password
GET    /api/auth/profile

GET    /api/users                           → users in firm

# Students (PG router runs first; legacy router falls through)
GET    /api/students
GET    /api/students/:id                    (UUID)
POST   /api/students
PATCH  /api/students/:id                    (UUID)
DELETE /api/students/:id                    (UUID, soft 'closed')

GET    /api/students/registered                                        [admin]
PUT    /api/students/me/profile                                        [student]
GET    /api/students/pending/contacts                                  [admin]
GET    /api/students/admin/:id                                         [admin]
POST   /api/students                                                   [admin]
GET    /api/students
POST   /api/students/:id/approve-contact                               [admin]
POST   /api/students/:id/activate                                      [admin]
PUT    /api/students/:id                                               [admin]
DELETE /api/students/:id                                               [admin]

GET    /api/students/:aiKey
GET    /api/students/:aiKey/files
POST   /api/students/:aiKey/documents/:documentId/rename
DELETE /api/students/:aiKey/documents/:documentId
GET    /api/students/:aiKey/required-documents
POST   /api/students/:aiKey/required-documents                         [admin]
DELETE /api/students/:aiKey/required-documents/:docId                  [admin]
PATCH  /api/students/:aiKey/required-documents/:docId                  [admin]
POST   /api/students/:aiKey/required-documents/:docId/files             (multer)
POST   /api/students/:aiKey/required-documents/files                    (multer · unified)
GET    /api/students/:aiKey/required-documents/:docId/files
GET    /api/students/:aiKey/required-documents/:docId/files/:fileId/url
DELETE /api/students/:aiKey/required-documents/:docId/files/:fileId
POST   /api/students/:aiKey/required-documents/:docId/files/:fileId/verify [admin]
GET    /api/students/:aiKey/tasks
POST   /api/students/:aiKey/tasks                                       [admin · multer]
PATCH  /api/students/:aiKey/tasks/:taskId
GET    /api/students/:aiKey/tasks/:taskId/attachment
DELETE /api/students/:aiKey/tasks/:taskId

# Documents (presigned S3 flow)
POST   /api/documents/upload-url
GET    /api/documents/student/:studentId
POST   /api/documents/:id/finalize
GET    /api/documents/:id/download-url
DELETE /api/documents/:id

# Upload (legacy multer flow)
POST   /api/upload                                                     [student · multer.array]

# Tasks
GET    /api/tasks
POST   /api/tasks
POST   /api/tasks/notifications/read
POST   /api/tasks/:taskId/complete
POST   /api/tasks/:taskId/reassign
PATCH  /api/tasks/:taskId
DELETE /api/tasks/:taskId

# Notifications
GET    /api/notifications
POST   /api/notifications/:id/read
POST   /api/notifications/read-all

# Recommendations (legacy AI folder)
GET    /api/recommendations/:studentId
POST   /api/recommendations/generate/:studentId
PATCH  /api/recommendations/enable/:studentId                          [admin · 410 gone]

# AI orchestrator
POST   /api/ai/verify-document/:documentId
POST   /api/ai/extract-fields/:documentId
POST   /api/ai/recommendations/:studentId
POST   /api/ai/chat                                                    (NDJSON proxy)

# Files
POST   /api/files/temp-upload                                          (multer.single)

# Billing
POST   /api/billing/stripe/connect
POST   /api/billing/stripe/accounts
GET    /api/billing/stripe/onboarding-link
GET    /api/billing/invoices
GET    /api/billing/invoices/:id
POST   /api/billing/invoices
POST   /api/billing/invoices/:id/send
POST   /api/billing/trust/deposit
POST   /api/billing/trust/withdrawal
POST   /api/billing/trust/transfer
GET    /api/billing/trust/reconciliation
GET    /api/billing/retainers/templates
GET    /api/billing/retainers
GET    /api/billing/retainers/:id
POST   /api/billing/retainers
POST   /api/billing/retainers/:id/send
POST   /api/billing/retainers/:id/sign

# Health
GET    /health
```

---

## F — Appendix F — Known gaps / architectural drift

These are footnotes a new dev needs to know — they bite in week one if you don't.

1. **Two upload pipelines coexist.** Legacy `/api/upload` (multer + immediate processing) and modern `/api/documents/upload-url` + `/api/documents/:id/finalize` (presigned + queues). Only the legacy one is wired in the SPA today; the modern pipeline is built but unused.
2. **Two AI module trees coexist.** `apps/backend/src/AI/*` (legacy, OpenAI-only) and `apps/backend/src/modules/ai/*` (new orchestrator with Anthropic/OpenAI fallback + `ai_jobs` ledger). Most callers (`upload.controller.js`, `student.controller.js`) still use the legacy tree. Migrate intentionally.
3. **Two notification pipelines coexist.** REST `/api/notifications` (backed by `notifications` table) **and** task-based "notifications" via `taskService.list({scope:'notifications'})`. The bell uses the latter; the inbox page uses the former.
4. **`AuthProvider` is mounted twice** (`main.jsx` AND `App.jsx`). Children get the inner provider's value, but the outer one duplicates state. Pick one.
5. **`mcpAPI.streamMessage` is imported in `ChatComponent` but never called** — the chat actually talks to `/api/ai/chat`. Remove the dead import or wire it.
6. **`/student/messages` is rendered in the StudentLayout nav but has no route.** Either add the route or remove the nav link.
7. **MCP `BACKEND_URL` default is `http://localhost:5000/api`** but the backend listens on **4000**. `.env.example` correctly says 4000 — ensure your `.env` sets `BACKEND_URL` explicitly so the agent's tool calls land.
8. **MCP has two axios bases.** `httpClient` uses `BACKEND_URL`; `services/student.service.js` prefers `CRM_API_URL`. If those diverge, document tools and student tools could call different hosts.
9. **`notificationService.markRead` uses POST**; `lib/api.ts` uses PATCH. Backend route is `POST /:id/read`, so the PATCH variant will 404 unless backend is changed.
10. **Chat document URL builder may double `/api`.** `ChatComponent.jsx` builds `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/ai/documents/url` — if `VITE_API_URL` already ends with `/api`, you'll hit `/api/api/...`.
11. **Token refresh is implemented on the backend but not auto-used by the SPA.** A 401 wipes localStorage and forces re-login.
12. **`emailTemplates` in `notifications/email.service.js` reference `data.*` at object-literal scope** — that pattern only works if the literal is built inside the function. Audit before invoking.
13. **`socket joinRoom` emit has no server handler** — rooms are joined inside `authenticateSocket` automatically. Safe to remove the client emit.
14. **MongoDB is still in package.json** (Mongoose) but only used by `scripts/etl-students-mongo-to-pg.ts` — the live app no longer touches Mongo.

---

### Closing note

If you can hold three pictures in your head — the **connector** (§2), the **backend tree** (§3), and the **agent loop** (§5) — every feature of this system reduces to one of the 12 feature traces in §6. New devs: start at §6.1 "Document upload" and follow each path; you'll touch every layer of the system on the way through.
