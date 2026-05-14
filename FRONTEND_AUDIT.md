# Frontend UI Library Audit & Consolidation Plan

**v1.0 — May 2026**
**Prepared for:** Founder / Engineering Lead
**App:** `apps/consultant-web` (React 19 + Vite + Tailwind CSS)
**Goal:** Consolidate on shadcn/ui + Tailwind + Lucide. Remove MUI, PrimeReact, react-icons.

---

## 1. Current Bundle Size

Built with `pnpm --filter @icrm/consultant-web build` on 2026-05-14.

| Asset | Raw | Gzip |
|-------|-----|------|
| `index.js` (main JS bundle) | **1,274.76 kB** | 382.84 kB |
| `index.css` | 251.39 kB | 31.65 kB |
| `primeicons.woff2` | 35.15 kB | — |
| `primeicons.ttf` | 84.98 kB | — |
| `primeicons.woff` | 85.06 kB | — |
| `primeicons.eot` | 85.16 kB | — |
| `primeicons.svg` | 342.53 kB | 105.26 kB |
| **Total fonts (PrimeIcons)** | **~633 kB** | — |

**Vite warning:** JS bundle exceeds the 500 kB threshold. The entire bundle is a single un-split chunk.

**Root cause of bloat:**
- PrimeReact + PrimeIcons ship ~633 kB of fonts used by exactly **2 components** (Splitter, SplitterPanel).
- MUI + Emotion ship significant JS for exactly **1 component** (ConfirmDialog).
- No code-splitting: every page is bundled into a single 1.27 MB JS file.

---

## 2. Installed UI Libraries

| Library | Version | Size contribution | Legitimately used? |
|---------|---------|------------------|-------------------|
| `@mui/material` | 7.3.4 | Large (+ Emotion) | 1 component only |
| `@mui/icons-material` | 7.3.4 | Large | 0 icons used |
| `@emotion/react` + `@emotion/styled` | 11.x | Required by MUI | Indirect only |
| `primereact` | 10.9.7 | Large | 1 component only |
| `primeicons` | 7.0.0 | ~633 kB fonts | 0 icons used directly |
| `framer-motion` | 12.x | Medium | 3 components (legitimate) |
| `lucide-react` | 0.553.0 | Tree-shakeable | Wide use — **keep** |
| `react-icons` | 5.2.1 | Medium | 1 icon only |
| `@headlessui/react` | 2.2.9 | Small | 0 direct uses found |
| `class-variance-authority` | 0.7.1 | Tiny | shadcn/ui dependency |
| `clsx` + `tailwind-merge` | — | Tiny | Used via `cn()` |

---

## 3. Page-Level Inventory

| Page | File | MUI | PrimeReact | Framer Motion | Lucide | react-icons | Pure Tailwind |
|------|------|-----|-----------|---------------|--------|-------------|---------------|
| Landing | `pages/Landing.jsx` | — | — | — | — | — | ✓ |
| Login | `pages/Login.jsx` | — | — | — | — | `FcGoogle` | ✓ |
| Register | `pages/Register.jsx` | — | — | — | — | — | ✓ |
| About | `pages/About.jsx` | — | — | — | — | — | ✓ |
| Services | `pages/Services.jsx` | — | — | — | — | — | ✓ |
| Pricing | `pages/Pricing.jsx` | — | — | — | — | — | ✓ |
| Contact | `pages/Contact.jsx` | — | — | — | — | — | ✓ |
| FAQ | `pages/Faq.jsx` | — | — | — | — | — | ✓ |
| Student Dashboard | `pages/student/StudentDashboard.jsx` | — | — | — | Multiple | — | ✓ |
| Student Profile | `pages/student/StudentProfile.jsx` | — | — | — | — | — | ✓ |
| Student Documents | `pages/student/Documents.jsx` | — | — | — | — | — | ✓ |
| Student Tasks | `pages/student/Tasks.jsx` | — | — | — | — | — | ✓ |
| Change Password | `pages/student/ChangePassword.jsx` | — | — | — | — | — | ✓ |
| University Recs | `pages/student/UniversityRecommendations.jsx` | — | — | — | — | — | ✓ |
| Admin Dashboard | `pages/admin/AdminDashboard.jsx` | — | — | — | — | — | ✓ |
| Student List | `pages/admin/StudentList.jsx` | — | — | — | — | — | ✓ |
| Student Detail | `pages/admin/StudentDetail.jsx` | — | — | — | — | — | ✓ |
| Create Student | `pages/admin/CreateStudent.jsx` | — | — | — | — | — | ✓ |
| Contact Requests | `pages/admin/ContactRequests.jsx` | — | — | — | — | — | ✓ |
| Registered Students | `pages/admin/RegisteredStudents.jsx` | — | — | — | — | — | ✓ |
| Admin Tasks | `pages/admin/Tasks.jsx` | — | — | — | `RefreshCcw` | — | ✓ |
| Notifications | `pages/admin/Notifications.jsx` | — | — | — | — | — | ✓ |
| AI Assistant | `pages/admin/AIAssistant.jsx` | — | — | — | — | — | ✓ |

**Key finding:** No page directly imports MUI or PrimeReact. All MUI/PrimeReact usage is confined to shared components.

---

## 4. Shared Component Inventory

### 4a. Components using non-target libraries

| Component | File | Library | Components used |
|-----------|------|---------|----------------|
| ConfirmDialog | `components/common/ConfirmDialog.jsx` | **MUI** | `Button`, `Dialog`, `DialogActions`, `DialogContent`, `DialogContentText`, `DialogTitle`, `useMediaQuery`, `useTheme` |
| AppSplitterLayout | `components/layout/AppSplitterLayout.jsx` | **PrimeReact** | `Splitter`, `SplitterPanel` |
| Login (page) | `pages/Login.jsx` | **react-icons** | `FcGoogle` (Google icon) |
| ProNotification | `components/ui/ProNotification.jsx` | **Framer Motion** | `motion`, `AnimatePresence` |
| StudentJourneyFlow | `components/student/StudentJourneyFlow.jsx` | **Framer Motion** | `motion` |
| ChatComponent | `components/chat/ChatComponent.jsx` | **Framer Motion** | `AnimatePresence` |

### 4b. Components already on target stack (Lucide + Tailwind)

| Component | File | Lucide icons used |
|-----------|------|-------------------|
| VerificationBadge | `components/common/VerificationBadge.jsx` | `AlertTriangle`, `CheckCircle2`, `Clock10` |
| ChatComponent | `components/chat/ChatComponent.jsx` | `Paperclip`, `X`, `FileText` |
| MessageRenderer | `components/chat/MessageRenderer.jsx` | `ExternalLink` |
| RequiredDocuments | `components/student/RequiredDocuments.jsx` | `AlertCircle`, `UploadCloud`, `Eye` |
| StudentJourneyFlow | `components/student/StudentJourneyFlow.jsx` | `CheckCircle2`, `Clock`, `AlertCircle` + more |
| UploadConfirmationModal | `components/student/UploadConfirmationModal.jsx` | `X`, `UploadCloud`, `Trash2` |
| UploadedFilesModal | `components/student/UploadedFilesModal.jsx` | `X`, `Eye`, `Download`, `Trash2`, `FileText`, `Loader2` |
| NotificationBell | `components/admin/NotificationBell.jsx` | `Bell`, `BellDot` + more |
| RequiredDocumentsAdmin | `components/admin/RequiredDocumentsAdmin.jsx` | Multiple icons |
| ProNotification | `components/ui/ProNotification.jsx` | `CheckCircle`, `XCircle`, `X` |

### 4c. Pure Tailwind components (no library imports)

`Button`, `Card`, `ErrorBoundary`, `FilePreview`, `Loading`, `Toast`, `ViewToggle`,
`AdminLayout`, `Footer`, `Navbar`, `StudentLayout`, `DocumentManager`, `DocumentUpload`,
`DocumentViewer`, `ProfileFieldDisplay`, `StudentCard`, `StudentListItem`

---

## 5. Migration Mapping Table

| Current | Library | Used N times | Target (shadcn/ui) | Migration notes |
|---------|---------|-------------|--------------------|-----------------|
| `Button` | MUI | 1 (ConfirmDialog) | `shadcn/ui Button` | 1-line import swap |
| `Dialog` | MUI | 1 (ConfirmDialog) | `shadcn/ui AlertDialog` | Restructure JSX; API is slightly different |
| `DialogActions` | MUI | 1 | `AlertDialog.Footer` | Included in shadcn AlertDialog |
| `DialogContent` | MUI | 1 | `AlertDialog.Content` | Included in shadcn AlertDialog |
| `DialogContentText` | MUI | 1 | `AlertDialog.Description` | Included in shadcn AlertDialog |
| `DialogTitle` | MUI | 1 | `AlertDialog.Title` | Included in shadcn AlertDialog |
| `useMediaQuery` | MUI | 1 | Remove | Not needed — shadcn dialogs are responsive |
| `useTheme` | MUI | 1 | Remove | Not needed — Tailwind handles theming |
| `Splitter` | PrimeReact | 1 (AppSplitterLayout) | `react-resizable-panels` | New small dep; or custom CSS flex with drag handle |
| `SplitterPanel` | PrimeReact | 1 | Same | Same |
| `FcGoogle` | react-icons | 1 (Login) | Inline SVG | Copy Google G SVG — no dep needed |
| `motion` | Framer Motion | 2 | Keep or CSS transitions | Framer is acceptable for page-level animations |
| `AnimatePresence` | Framer Motion | 2 | Keep or CSS transitions | Same as above |

**shadcn/ui components to install:**
```
npx shadcn@latest add alert-dialog button dialog
```

**Packages to remove after migration:**
```
pnpm --filter @icrm/consultant-web remove \
  @mui/material @mui/icons-material @emotion/react @emotion/styled \
  primereact primeicons react-icons @headlessui/react
```

**Expected savings:** ~400–500 kB gzipped JS + ~633 kB fonts eliminated.

---

## 6. Ordered Migration Plan

Priority is lowest-coupling first so each step is independently shippable and doesn't risk breaking other pages.

### Step 1 — `Login.jsx`: Drop react-icons (30 min)
**Why first:** Isolated to a single page, zero shared dependencies. Removing `react-icons` only affects this file.

- Replace `import {FcGoogle} from "react-icons/fc"` with an inline SVG component.
- After: `react-icons` can be uninstalled immediately.
- **Risk:** None. Visual change only (same icon, different source).

---

### Step 2 — `ConfirmDialog.jsx`: Replace MUI with shadcn AlertDialog (1–2 hours)
**Why second:** ConfirmDialog is used in multiple places but has a well-defined props contract — swapping the internal implementation doesn't change callers.

- Install: `npx shadcn@latest add alert-dialog button`
- Replace all MUI imports with shadcn/ui equivalents.
- Remove `useTheme`, `useMediaQuery` (shadcn handles responsiveness via Tailwind).
- After: `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `@headlessui/react` can be uninstalled.
- **Risk:** Low. Test open/close behavior and keyboard navigation (Esc to close).

---

### Step 3 — `AppSplitterLayout.jsx`: Replace PrimeReact Splitter (1–2 hours)
**Why third:** Used in the AI Assistant page layout. Replacing it drops PrimeReact + all its icon fonts.

**Option A (recommended):** Install `react-resizable-panels` (16 kB gzipped, actively maintained).
```
pnpm --filter @icrm/consultant-web add react-resizable-panels
```
Replace `<Splitter>/<SplitterPanel>` with `<PanelGroup>/<Panel>/<PanelResizeHandle>`.

**Option B:** Custom CSS flex layout with a drag handle (zero new deps, more work).

- After: `primereact`, `primeicons` can be uninstalled — eliminating ~633 kB of font assets.
- **Risk:** Medium. Test resizing behaviour in the AI Assistant page, especially on mobile.

---

### Step 4 — Evaluate Framer Motion (optional, 2–4 hours)
**Why last:** Framer is used legitimately for complex animations in 3 places. It's tree-shakeable and the cost is justifiable.

**Keep Framer if:** Animations in `StudentJourneyFlow`, `ProNotification`, `ChatComponent` are considered important UX.

**Replace with CSS if:** You want zero runtime animation deps. Use Tailwind's `transition` + `animate-*` utilities and CSS `@keyframes` for the enter/exit effects currently done by `AnimatePresence`.

- **Risk:** Medium. Animations may look different or require custom CSS work.

---

### Step 5 — Add code-splitting (2–3 hours)
**Why this matters:** Even after removing the heavy libraries, the single 1.27 MB bundle will still be large without code-splitting. This is a separate concern from UI library consolidation.

- Convert all route-level page imports in `App.jsx` from static to `React.lazy()`.
- Add `<Suspense>` wrappers around each route group.
- Expected result: initial JS load drops to ~150–200 kB; remaining pages load on demand.
- **Risk:** Low. Suspense fallback (Loading spinner) is already in `components/common/Loading.jsx`.

---

## 7. Verification Checklist

After each migration step:
- [ ] `pnpm --filter @icrm/consultant-web build` — no new errors
- [ ] Bundle JS < 800 kB after Step 2; < 500 kB after Step 3
- [ ] ConfirmDialog opens and closes correctly (keyboard + mouse)
- [ ] Splitter panels resize correctly in AI Assistant page
- [ ] Google sign-in button still renders in Login page
- [ ] No MUI/PrimeReact/react-icons imports remain in `node_modules` usage after removal

---

*Generated by codebase audit — 2026-05-14*
