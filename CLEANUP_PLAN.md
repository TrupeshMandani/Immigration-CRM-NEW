# Immigration-CRM — Dead / Duplicate / Unnecessary Code Removal Plan

> Read-only audit of the entire monorepo (`apps/backend`, `apps/consultant-web`, `apps/mcp-server`, `apps/marketing`, `packages/shared-types`, and repo root).
> Every "unused / dead" claim below was verified with `git ls-files`, `git check-ignore`, and import/usage `grep`. Nothing here has been changed yet — this is the plan only.

**Legend — Importance / Risk**
- 🟢 **Safe delete** — zero references, verified. Delete with confidence.
- 🟡 **Needs review** — dead by evidence, but a human should confirm product intent first.
- 🔴 **Risky / refactor** — live code, but duplicated. Requires a migration, not a raw delete.

---

## 0. Impact Summary (biggest wins first)

| # | Item | Effect | Risk |
|---|------|--------|------|
| 1 | Remove `graphify-out/` from git (622 tracked files, ~13 MB) | Shrinks repo drastically | 🟢 |
| 2 | Remove 11 nested/duplicate lockfiles + 4 `pnpm-workspace.yaml` fragments (~2.1 MB tracked) | One source of truth for deps | 🟢 |
| 3 | Delete orphaned backend `modules/notifications/email.service.js` (221 lines) | Removes dead SMTP module | 🟢 |
| 4 | Delete ETL script + `mongoose` dep (Mongo→PG migration is done) | Removes last Mongo runtime dependency | 🟡 |
| 5 | Delete ~18 orphaned frontend files (hooks, mcpAPI, NotificationBell, ProtectedRoute, 16 shadcn primitives) (~2,400 lines) | Removes never-imported UI/code | 🟢 |
| 6 | Remove committed `packages/shared-types/*.js` compiled artifacts (3 files) | Source is the `.ts` files | 🟢 |
| 7 | Delete stale top-level `frontend/` dir + junk files (`jsconfig.`, screenshot) | Removes confusion | 🟢 |
| 8 | Prune unused npm deps (`firebase`, `googleapis`, `morgan`, `open`, `nodemon`) | Faster installs | 🟢 |
| 9 | Consolidate duplicated code (2 HTTP clients, 2 chat UIs, applicant/admin required-docs, common vs ui components) | Large maintainability win | 🔴 (refactor) |

---

## 1. Committed build artifacts / generated files (remove from git)

These are tracked in git but are generated output or tooling caches. They should be deleted and added to `.gitignore`.

| Path | Range | What it is | Reason to remove | Risk | Alternative / what stays | Evidence |
|------|-------|-----------|------------------|------|--------------------------|----------|
| `graphify-out/cache/` | whole dir (615 files) | Graphify AST cache JSON | Regenerable tool cache, bloats repo | 🟢 | Regenerate via `graphify update .` | `git ls-files graphify-out | wc -l` → **622** |
| `graphify-out/` (non-cache: `graph.json`, `graph.html`, `manifest.json`, `GRAPH_REPORT.md`, …) | 7 files | Graphify index/report | Tool output, not source | 🟢 | Keep locally only; gitignore the folder | `git ls-files graphify-out` |
| `packages/shared-types/applicants.js` | whole file | Compiled CJS output beside source | Not in package `exports`, no importer | 🟢 | `applicants.ts` | `git ls-files packages/shared-types/*.js` (tracked); grep: only `graphify-out` refs |
| `packages/shared-types/cases.js` | whole file | Compiled CJS output | Same | 🟢 | `cases.ts` | Same |
| `packages/shared-types/documents.js` | whole file | Compiled CJS output | Same | 🟢 | `documents.ts` | Same |
| `frontend/` (top-level) | whole dir | Stale `.vite` cache only, no source | Leftover from pre-monorepo layout; real app is `apps/consultant-web` | 🟢 | `apps/consultant-web` | `ls frontend/` → only `.vite/` |

**Already correctly ignored (NOT tracked) — local `rm` only, no git action:** `apps/backend/dist/`, `apps/consultant-web/dist/` (1.8 MB), `packages/shared-types/dist/`, `apps/marketing/.next/` (**182 MB**), all `.DS_Store`. Safe to delete locally to reclaim space.

**`.gitignore` additions recommended:** `graphify-out/`, `packages/shared-types/*.js` (unless a build step is added).

---

## 2. Redundant lockfiles & workspace fragments

This is a **pnpm workspace**; only the root `pnpm-lock.yaml` + root `pnpm-workspace.yaml` should exist. Everything below is tracked and redundant/conflicting.

| Path | What it is | Reason to remove | Risk | Keep instead | Evidence |
|------|-----------|------------------|------|--------------|----------|
| `package-lock.json` (root) | npm lockfile | npm artifact inside a pnpm workspace | 🟢 | root `pnpm-lock.yaml` | `git ls-files` |
| `apps/backend/package-lock.json` (423 KB) | nested npm lock | Redundant | 🟢 | root pnpm lock | `git ls-files` |
| `apps/backend/pnpm-lock.yaml` (264 KB) | nested pnpm lock | Sub-app shouldn't own a lock | 🟢 | root pnpm lock | `git ls-files` |
| `apps/backend/pnpm-workspace.yaml` | workspace fragment | Not a workspace root | 🟢 | root workspace | `git ls-files` |
| `apps/consultant-web/package-lock.json` (314 KB) | nested npm lock | Redundant | 🟢 | root pnpm lock | `git ls-files` |
| `apps/consultant-web/pnpm-lock.yaml` (220 KB) | nested pnpm lock | Redundant | 🟢 | root pnpm lock | `git ls-files` |
| `apps/consultant-web/pnpm-workspace.yaml` | fragment | Redundant | 🟢 | root workspace | `git ls-files` |
| `apps/mcp-server/package-lock.json` (47 KB) | nested npm lock | Redundant | 🟢 | root pnpm lock | `git ls-files` |
| `apps/mcp-server/pnpm-lock.yaml` (28 KB) | nested pnpm lock | Redundant | 🟢 | root pnpm lock | `git ls-files` |
| `apps/marketing/pnpm-lock.yaml` (158 KB) | nested pnpm lock | Redundant | 🟢 | root pnpm lock | `git ls-files` |
| `apps/marketing/pnpm-workspace.yaml` | fragment | Redundant | 🟢 | root workspace | `git ls-files` |

> Note: after removing nested locks, run `pnpm install` once at root to re-resolve.

---

## 3. Backend — dead / duplicate code (`apps/backend/src`)

> **Key finding on applicants:** BOTH applicant routers are mounted at `/api/applicants` *by design* (`routes/index.js:38-39`): the TS router (`applicants.routes.ts`) runs first and serves `GET /` + UUID CRUD; the legacy JS router (`applicant.route.js`, 1628-line controller) serves everything else (`POST /`, `/:aiKey/*`, docs, tasks, chat). So neither set is wholly deletable — only specific *shadowed* handlers are dead.

| File | Line range | Symbol/function | What it is | Reason to remove | Risk | Alternative / what stays | Evidence |
|------|-----------|-----------------|-----------|------------------|------|--------------------------|----------|
| `src/modules/notifications/email.service.js` | whole file (1–221) | `sendEmailNotification`, `sendBulkEmailNotifications`, `testEmailConfiguration`, `emailTemplates` | Mongoose-era templated SMTP module | Zero imports repo-wide; superseded | 🟢 | `utils/sendEmail.js` (live) + Socket.IO notifications | `rg 'modules/notifications/email'` → **0 importers** (verified) |
| `src/scripts/etl-applicants-mongo-to-pg.ts` | whole file (1–160) | `main()` ETL | One-shot Mongo→Postgres migration | Not in any `package.json` script; only runtime user of `mongoose` | 🟡 | Postgres/Drizzle is source of truth | `rg 'etl-applicants'` → only its own header |
| `src/modules/ai/ai.routes.ts` | 78–106 | `POST /recommendations/:applicantId` | Duplicate recommendation endpoint | Frontend uses `/api/recommendations/*`, not `/api/ai/recommendations/*` | 🟢 | `AI/ai-recommendation` route (live) | `rg 'ai/recommendations'` → only this file + docs |
| `src/modules/ai/ai.routes.ts` | 52–76 | `POST /extract-fields/:documentId` | Stub returning existing JSON | No callers; comment admits incomplete | 🟢 | Real extraction in upload flow (`extract.service.ts`) | `rg 'extract-fields'` → only this file + blueprint |
| `src/modules/ai/ai.routes.ts` | 16–50 | `POST /verify-document/:documentId` | Manual re-queue endpoint | No frontend/MCP caller; verify already enqueued on finalize | 🟡 | `verifyQueue.add` in `documents.service.ts:135` | `rg 'ai/verify-document'` → only this file + docs |
| `src/modules/applicants/applicant.controller.js` | 302–328 | `getAllApplicants` | Legacy list handler | Shadowed — TS `listApplicants()` serves `GET /api/applicants` first | 🟢 | `applicants.routes.ts` list | Mount order `routes/index.js:38-39` |
| `src/modules/applicants/applicant.route.js` | 53 | `router.get("/", …, ctrl.getAllApplicants)` | Route for shadowed handler | Never reached | 🟢 | TS list route | Same |
| `src/modules/applicants/applicant.controller.js` | 639–647 | `deleteApplicant` (hard delete) | Legacy hard delete | Shadowed — TS `DELETE /:uuid` (soft-close) runs first | 🟡 | TS soft-delete route | Confirm hard vs soft delete intent |
| `src/modules/applicants/applicant.route.js` | 80 | `router.delete("/:id", …, ctrl.deleteApplicant)` | Route for shadowed hard delete | Unreachable for UUID id | 🟡 | TS soft-delete route | Same |
| `src/AI/ai-recommendation/recommendation.controller.js` | 82–85 | `setRecommendationEnabled` | 410 Gone stub | Feature retired; always errors | 🟢 | none (feature gone) | `rg 'setRecommendationEnabled'` → route+controller only |
| `src/AI/ai-recommendation/recommendation.route.js` | 16 | `router.patch("/enable/:applicantId", …)` | Route to the 410 stub | Same | 🟢 | none | Same; frontend `enableRecommendation` also unused |
| `src/middleware/index.ts` | whole file (1–2) | `tenantContextMiddleware` re-export | Unused barrel | No importer; consumers import `./tenantContext` directly | 🟢 | `middleware/tenantContext.ts` | `rg 'middleware/index'` → only graphify |
| `src/modules/notifications/notifications.routes.ts` | 6 | `send` (import) | Dead import | Imported, never used in file | 🟢 | `send()` used elsewhere directly | Only used names: `listForUser`, `markAsRead`, `markAllRead` |
| `src/modules/applicants/applicant.controller.js` | 19 | `mergePassportDetails`, `normalizePassportDate` (imports) | Unused destructured imports | Never referenced in the 1628-line file | 🟢 | keep the functions in `applicant.service.js` | `rg` in file → only import line |
| `src/modules/applicants/applicant.service.js` | 142 (export) | `extractPassportData` | Export never used externally | Only used internally | 🟢 | keep internal use | `rg 'extractPassportData'` → this file only |
| `src/modules/applicants/applicants.service.ts` | 83–95 | `getApplicantByAiKey` | Exported helper | Never imported anywhere | 🟡 | inline query where needed | `rg 'getApplicantByAiKey'` → definition only |
| `src/utils/generateAiKey.js` | 30 (export) | `buildBaseKey` | Internal helper export | Never imported externally | 🟢 | keep `generateAiKey` export | `rg 'buildBaseKey'` → this file only |
| `src/modules/users/users.route.ts` | whole file (1–12) | `GET /api/users` | Firm-scoped user list | Mounted but **no frontend consumer** | 🟡 | keep if a future admin UI needs it | `rg '/api/users'` in consultant-web → 0 |

**Backend refactor (not a raw delete) — 🔴:**
- `src/AI/ai-recommendation/*` (controller + route) is **live** (mounted `routes/index.js:44`, used by frontend `/api/recommendations/*`) but sits in a legacy `AI/` folder parallel to `modules/ai/`. **Action:** move these 2 files into `modules/ai/` (or `ai.routes.ts`), then delete the `src/AI/` directory to end the parallel-folder architecture.
- Two different `generateAiKey` algorithms coexist: `utils/generateAiKey.js` (`last_first_YYYYMMDD`) vs `applicants.service.ts:19` (`emailPrefix-timestamp-random`). Decide on one.
- Passport-date normalization duplicated: `applicant.service.js` vs inline `normalizePassportDateValue` in the controller (~line 653+).

---

## 4. Frontend — dead / duplicate code (`apps/consultant-web/src`)

> All 32 files in `pages/` are routed via `App.jsx` — **no orphaned pages.** Orphans are components/hooks/utils never imported. Student→applicant rename is fully complete (`grep -i student src` → 0).

### 4a. Fully orphaned files — 🟢 Safe delete (verified 0 imports)

| File | Range | Symbol | What it is | Reason | Alternative / what stays | Evidence |
|------|-------|--------|-----------|--------|--------------------------|----------|
| `src/services/mcpAPI.js` | whole (1–30) | `mcpAPI`, `streamMessage` | MCP chat fetch client | Never imported | Chat uses other paths | `rg mcpAPI src` → **0** (verified) |
| `src/hooks/useRole.jsx` | whole (1–22) | `useRole`, `ROLE_PERMISSIONS` | Role hook | Never imported | `RouteGuard` + `AuthContext` | verified 0 |
| `src/hooks/useTasks.js` | whole (1–23) | `useTasks`, `useDeleteTask`, `taskKeys` | React Query tasks hook | Never imported | `services/taskService.js` | verified 0 |
| `src/hooks/useNotifications.js` | whole (1–30) | `useNotificationsList`, `useMarkRead`, `useMarkAllRead` | React Query notifications hook | Never imported (don't confuse with `context/NotificationContext`'s `useNotifications`) | `notificationService` + `NotificationContext` | verified 0 |
| `src/utils/ProtectedRoute.jsx` | whole (1–67) | `ProtectedRoute` | Legacy route guard | Superseded, never imported | `components/auth/RouteGuard.jsx` | verified 0 |
| `src/components/admin/NotificationBell.jsx` | whole (1–290) | `NotificationBell` | Task-scoped bell dropdown | Never mounted | `NotificationContext` badge + `/admin/notifications` | verified 0 |
| `src/styles/theme.js` | whole (1–69) | `colors`, `fonts` | JS theme tokens | Never imported | `theme.css` + `tailwind.config.js` | verified 0 |
| `src/App.css` | whole (1–42) | Vite starter CSS | Default boilerplate | Never imported | `index.css`, `theme.css` | grep 0 |
| `jsconfig.` (app root) | 0 bytes | — | Empty junk file | Typo duplicate | `jsconfig.json` | `ls` → 0-byte file |
| `Screenshot 2025-11-11 at 2.00.34 AM.png` (app root) | — | — | Accidental screenshot (767 KB) | Not referenced | — | not imported |

### 4b. Orphaned shadcn UI primitives — 🟢 Safe delete (0 imports outside `ui/`; verified)

`src/components/ui/`: `avatar.jsx`, `calendar.jsx`, `command.jsx`, `dropdown-menu.jsx`, `form.jsx`, `popover.jsx`, `radio-group.jsx`, `scroll-area.jsx`, `sheet.jsx`, `table.jsx`, `tabs.jsx`, `tooltip.jsx`, `switch.jsx`, `checkbox.jsx`, `skeleton.jsx`, `separator.jsx`, `select.jsx`, `alert.jsx` — **~1,300+ lines total.**
Evidence: `Grep "ui/(...)" --glob '!**/ui/**'` returned only `ConfirmDialog → ui/alert-dialog` (which is **kept**). Pages use native `<select>`, raw `<table>`, and `react-hook-form` directly.
**Kept UI (live):** `button`, `card`, `dialog`, `alert-dialog`, `sonner`, `input`, `label`, `textarea`, `badge`.

### 4c. Partial dead code inside live files — 🟢/🟡

| File | Line range | Symbol | Reason | Risk | Evidence |
|------|-----------|--------|--------|------|----------|
| `src/services/taskService.js` | 8–11 | `taskService.update` | Defined, never called | 🟢 | 0 call sites |
| `src/components/admin/DeadlineTypeLabel.jsx` | 37–39 | `DeadlineTypeLabel` default export (JSX) | Only the constants are imported; component never rendered | 🟢 | keep `DEADLINE_TYPE_LABELS`, `DEFAULT_NOTIFICATIONS` |
| `src/lib/api.ts` | 279–290, 309–310, 313–343, 346–349 | `api.auth.*`, `api.applicants.files`, `api.tasks.*`, `api.notifications.*`, `api.contact.submit` | Duplicate of live axios services; only referenced by dead hooks | 🟡 | remove after HTTP-client consolidation | 0 call sites (except dead hooks) |
| `src/lib/api.ts` | 395 | `ApiError` export | Never imported | 🟢 | inline error handling | `rg ApiError` → this file only |
| `src/utils/fileName.js` | 1–10 | `getDisplayFileName` | Only used internally | 🟡 | keep other exports | this file only |

### 4d. Frontend duplication requiring refactor — 🔴 (do not raw-delete)

| Concern | Files | Note |
|---------|-------|------|
| **Two HTTP clients** | `src/lib/api.ts` (fetch, typed, powers React Query hooks) vs `src/services/api.js` (axios, powers all `services/*`) | ~480 lines duplicate auth/refresh/token logic. Pick one, migrate. Highest-value architectural cleanup. |
| **Two chat UIs** | `components/chat/ChatComponent.jsx` (+`MessageRenderer.jsx`) → `/admin/assistant` vs `components/applicant/ChatInterface.jsx` → `/applicant/assistant` | ~750 lines parallel UI. They hit different backend endpoints (`/ai/chat` vs `/applicants/:aiKey/chat`) — unify component, keep both contracts. |
| **Required-docs duplication** | `components/applicant/RequiredDocuments.jsx` (554) vs `components/admin/RequiredDocumentsAdmin.jsx` (684) | ~80% overlap (~1,200 lines). Extract shared hook/subcomponents. |
| **Legacy vs shadcn primitives** | `components/common/Button.jsx` & `Card.jsx` vs `components/ui/button.jsx` & `card.jsx` | Both heavily used (admin uses `common/*`, applicant uses `ui/*`). Consolidate to one. |
| **Custom toasts vs sonner** | `components/common/Toast.jsx`, `components/ui/ProNotification.jsx` | `sonner` is already global (`main.jsx`). Migrate the 2 remaining custom-toast usages, then delete. |
| **Admin-chat-only helper** | `components/ui/shadcn-io/shimmering-text.jsx` | Only used by `ChatComponent`; folds into chat unification. |

---

## 5. MCP server — dead code (`apps/mcp-server`)

All 18 registered tools are live (auto-loaded by `_toolRegistry.js`). Only internal stubs and noise are dead.

| File | Line range | Symbol | What it is | Reason | Risk | Evidence |
|------|-----------|--------|-----------|--------|------|----------|
| `tools/documentTools.js` | 342–373 | `classifyDocumentType()` | Internal stub, not exported | Unreachable; tests assert it's not exported | 🟢 | not in `module.exports` |
| `tools/documentTools.js` | 382–401 | `extractDocument()` | Internal stub, no backend route | Unreachable | 🟢 | not exported |
| `tools/documentTools.js` | 25–31, 564–572 | skipped-tool comment blocks | Docs of unimplemented tools | Noise | 🟢 | comments only |
| `tools/_toolRegistry.js` | 46 | `console.log("[DEBUG] Loaded tools…")` | Boot debug log | Production noise | 🟢 | use `logger` |
| `tsconfig.json` | whole file | TS config with **zero `.ts` files** | Vestigial (checkJs:false) | No type-check value | 🟡 | remove or enable `checkJs` |
| `DOCUMENT_TOOLS_TESTING_GUIDE.md` | whole file (~513 lines) | Manual test guide | Stale "student" terminology, old paths | 🟡 | update & move to `docs/testing/`, or delete (Jest covers it) |

> `services/applicant.service.js` and `services/email.service.js` here are **NOT dead** — they are the MCP-side HTTP proxy / SMTP and are used by the tools. Conceptual overlap with backend only.

---

## 6. Marketing app — orphans & open question (`apps/marketing`)

| Path | Range | Symbol | What it is | Reason | Risk | Evidence |
|------|-------|--------|-----------|--------|------|----------|
| `src/components/ui/animated-theme-toggler.tsx` | whole (~85) | `AnimatedThemeToggler` | Theme toggle | Never imported | 🟢 | grep: self only |
| `src/components/ui/DotGrid.css` | whole | DotGrid styles | CSS never imported (`DotGrid.tsx` is self-contained GSAP) | Orphan | 🟢 | grep: 0 imports |
| `README.md` | whole | `create-next-app` boilerplate | No project value | 🟢 | write a real one if kept |
| `package.json` | 7–267 (deps) | ~250 "direct" deps | Looks corrupted — lists transitive pkgs (`acorn`, `ajv`, …) as direct | 🟡 | restore to ~15 real deps (mirror consultant-web) |
| `src/data/colleges.json` vs `src/app/colleges/colleges-data.json` | whole files | Two colleges datasets | Parallel duplicate schemas | 🟡 | pick one source of truth |
| **whole `apps/marketing` app** | 39 source files | Next.js public site | Duplicates About/Services/Contact/Landing already in consultant-web; **no `dev:marketing` script, not in docker, "not deeply wired" per blueprint** | 🔴 | **Product decision:** (a) delete app, (b) make it the canonical public site & strip public routes from consultant-web, or (c) fix & deploy separately |

---

## 7. shared-types (`packages/shared-types`)

| Path | Range | What it is | Reason | Risk | Evidence |
|------|-------|-----------|--------|------|----------|
| `applicants.js`, `cases.js`, `documents.js` | whole files | Compiled CJS beside source | Not in `exports`, no importer (see §1) | 🟢 | `package.json` exports point only to `.ts` |
| `mcp.ts` | whole (~206) | MCP tool Zod schemas | **Zero** `@icrm/shared-types/mcp` imports anywhere | 🟡 | keep if wiring typed MCP validation soon; else delete |
| `package.json` | — | no `build` script, but `tsconfig` has `outDir: ./dist` | Build is implicit/manual | 🟡 | add `"build": "tsc"` and gitignore root `*.js` |

Live/kept: `applicants.ts`, `cases.ts`, `documents.ts`, `deadlines.ts` (all imported by backend services).

---

## 8. Root docs & scratch files

| Path | Size | Tracked? | What it is | Recommendation | Risk |
|------|------|----------|-----------|----------------|------|
| `bugs.txt` | 4 KB | Yes | Informal "student"-era bug notes | Delete (superseded by `BUG_INVENTORY.md`) | 🟢 |
| `docs/` | 0 B | empty | Empty placeholder dir | Delete, or repurpose to hold audits | 🟢 |
| `instructions.txt` | — | ignored | Scratch notes | Delete locally | 🟢 |
| `Testing_result/` | 3.4 MB | ignored | Test run output | Delete locally | 🟢 |
| `API_Test_Demos/` | 96 KB | ignored | API test scratch | Delete locally | 🟢 |
| `BUG_INVENTORY.md` | 8 KB | Yes | Code-review audit | Keep (move to `docs/audits/`) | 🟡 |
| `FRONTEND_AUDIT.md` | 12 KB | Yes | Engineering audit | Keep (move to `docs/audits/`) | 🟡 |
| `SYSTEM_BLUEPRINT.md` | 84 KB | Yes | Architecture reference | **Keep** (high value) | — |
| `MANUAL_TESTING_CHECKLIST.html` | 88 KB | Yes | QA checklist | Keep | — |
| `IMMIGRATION_CRM_MASTER_PLAN.pdf` | 1.3 MB | ignored | Planning PDF | Keep locally / `docs/planning/` | — |
| `SPRINT_2_CALENDAR_DEADLINE_ENGINE.md`, `sprints/` | — | ignored | Sprint planning | Keep if active | — |

---

## 9. Unused npm dependencies

| Package | In | Reason | Risk | Evidence |
|---------|----|--------|------|----------|
| `mongoose` | `apps/backend` (dep) | Only used by the ETL script (§3) | 🟡 (remove with ETL) | `rg mongoose apps/backend/src` → ETL only |
| `firebase` | `apps/backend` | Not imported (backend uses `firebase-admin`) | 🟢 | `rg "from 'firebase'"` → 0 |
| `googleapis` | `apps/backend` | Not imported | 🟢 | grep 0 |
| `morgan` | `apps/backend` | Not imported | 🟢 | grep 0 |
| `open` | `apps/backend` | Not imported (the `'open'` matches are the task-status string) | 🟢 | `rg "from 'open'|require('open')"` → 0 (verified) |
| `nodemon` | `apps/backend` (dev) | `dev` script uses `tsx watch` | 🟢 | `package.json` scripts |

> Verify with a dead-dep tool (`npx depcheck` per app) before removing, since dynamic requires can hide usage.

---

## 10. Recommended execution order

1. **Git hygiene (zero code risk):** `git rm -r graphify-out/`; `git rm packages/shared-types/{applicants,cases,documents}.js`; `git rm` all nested lockfiles + `apps/*/pnpm-workspace.yaml` + root `package-lock.json`; update `.gitignore` (`graphify-out/`, `packages/shared-types/*.js`); `pnpm install` at root to confirm.
2. **Local cleanup:** `rm -rf frontend/ apps/*/dist packages/shared-types/dist apps/marketing/.next Testing_result API_Test_Demos`; delete `jsconfig.`, the screenshot, `bugs.txt`, empty `docs/`.
3. **🟢 Safe code deletes:** backend `modules/notifications/email.service.js`; the shadowed handlers/routes & dead imports/exports in §3 (🟢 rows); all frontend §4a + §4b + §4c(🟢) files; MCP §5 (🟢 rows); marketing §6 (🟢 rows).
4. **Prune deps (§9 🟢)** then re-install and run builds/tests.
5. **🟡 Confirm-then-delete:** ETL + `mongoose`; hard-delete route; `/api/users`; `/api/ai/verify-document`; `mcp.ts`; marketing `package.json` repair.
6. **🔴 Refactors (separate PRs):** collapse `AI/` into `modules/ai/`; unify HTTP clients; unify chat UIs; merge required-docs; consolidate `common/*` vs `ui/*`; marketing app decision.

**Validation after each step:** `pnpm -r build` and `pnpm -r lint`, plus backend `vitest` and mcp-server tests, to confirm nothing broke.

---

### Verification notes
- Tracked-artifact counts confirmed via `git ls-files` (graphify-out = 622; shared-types `*.js` = 3; 11 nested locks/fragments). `dist/`, `.next/`, `frontend/.vite`, `.DS_Store` confirmed **untracked**.
- Zero-import claims for `notifications/email.service.js`, `mcpAPI`, `useRole`, and the 18 shadcn primitives were re-verified directly with `grep`/ripgrep.
- Correction applied vs first-pass agent output: the `open` npm package **is** unused (earlier match was the `'open'` task-status string).
