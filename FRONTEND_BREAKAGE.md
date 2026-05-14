# Frontend Breakage Report

**v1.0 — May 2026**  
**Generated:** 2026-05-14  
**Context:** MUI + PrimeReact uninstalled; shadcn/ui installed. Build intentionally broken.  
**Fixed by:** Prompts 18–19

---

## Build Error (as of this commit)

```
[vite]: Rollup failed to resolve import "primereact/resources/themes/saga-blue/theme.css"
from "apps/consultant-web/src/main.jsx"
```

Build halts at first unresolvable import. All 4 broken files are listed below — they were
found by static grep, not iterative build runs.

---

## Broken Files — Complete List

### 1. `src/main.jsx` — 3 lines

| Line | Import | Fix |
|------|--------|-----|
| 3 | `import "primereact/resources/themes/saga-blue/theme.css"` | **Delete** — PrimeReact uninstalled |
| 4 | `import "primereact/resources/primereact.min.css"` | **Delete** — PrimeReact uninstalled |
| 5 | `import "primeicons/primeicons.css"` | **Delete** — PrimeIcons uninstalled |

**Fix:** Remove all 3 lines. No replacement needed — shadcn/ui ships no global CSS.

---

### 2. `src/components/layout/AppSplitterLayout.jsx` — 1 line

| Line | Import | Fix |
|------|--------|-----|
| 2 | `import { Splitter, SplitterPanel } from "primereact/splitter"` | Replace with `react-resizable-panels` |

**Fix (from FRONTEND_AUDIT.md Step 3):**
```jsx
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
```
Replace `<Splitter layout="horizontal">` → `<PanelGroup direction="horizontal">`  
Replace `<SplitterPanel>` → `<Panel>`  
Add `<PanelResizeHandle />` between panels.

Install: `pnpm --filter @icrm/consultant-web add react-resizable-panels`

---

### 3. `src/components/common/ConfirmDialog.jsx` — 8 lines

| Line | Import | Fix |
|------|--------|-----|
| 2 | `import Button from "@mui/material/Button"` | `import { Button } from "@/components/ui/button"` |
| 3 | `import Dialog from "@mui/material/Dialog"` | Replace with `AlertDialog` from shadcn |
| 4 | `import DialogActions from "@mui/material/DialogActions"` | `AlertDialogFooter` |
| 5 | `import DialogContent from "@mui/material/DialogContent"` | `AlertDialogContent` |
| 6 | `import DialogContentText from "@mui/material/DialogContentText"` | `AlertDialogDescription` |
| 7 | `import DialogTitle from "@mui/material/DialogTitle"` | `AlertDialogTitle` |
| 8 | `import useMediaQuery from "@mui/material/useMediaQuery"` | **Delete** — not needed |
| 9 | `import { useTheme } from "@mui/material/styles"` | **Delete** — not needed |

**Fix:**
```jsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
```
Remove `useMediaQuery` and `useTheme` hooks from the component body.  
Restructure JSX to use `AlertDialog` open/onOpenChange pattern.

---

### 4. `src/pages/Login.jsx` — 1 line

| Line | Import | Fix |
|------|--------|-----|
| 7 | `import { FcGoogle } from "react-icons/fc"` | Replace with inline SVG |

**Fix:**
```jsx
// Replace <FcGoogle className="w-5 h-5" /> with:
<svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>
```

---

## Fix Sequence for Prompt 18

Fix in this order to unblock the build step-by-step:

1. **`src/main.jsx`** — delete 3 import lines → build should now reach component errors
2. **`src/pages/Login.jsx`** — swap `FcGoogle` for inline SVG → no other dep changes
3. **`src/components/common/ConfirmDialog.jsx`** — swap MUI for shadcn `alert-dialog`
4. **`src/components/layout/AppSplitterLayout.jsx`** — swap PrimeReact Splitter for `react-resizable-panels`

---

## New Packages Added (this commit)

| Package | Version | Purpose |
|---------|---------|---------|
| `@hookform/resolvers` | ^5.2.2 | shadcn `form` component dependency |
| `react-hook-form` | ^7.75.0 | Form state management |
| `zod` | ^4.4.3 | Schema validation |
| `sonner` | ^2.0.7 | Toast notifications (replaces any custom toast) |
| `@radix-ui/react-*` | various | shadcn/ui primitive dependencies (auto-installed) |
| `react-day-picker` | ^10.0.0 | shadcn `calendar` dependency |
| `date-fns` | ^4.1.0 | shadcn `calendar` dependency |
| `cmdk` | ^1.1.1 | shadcn `command` dependency |
| `next-themes` | ^0.4.6 | shadcn `sonner` dependency |

---

## shadcn/ui Components Installed

All 27 components located at `src/components/ui/`:

`alert` · `alert-dialog` · `avatar` · `badge` · `button` · `calendar` · `card` ·
`checkbox` · `command` · `dialog` · `dropdown-menu` · `form` · `input` · `label` ·
`popover` · `radio-group` · `scroll-area` · `select` · `separator` · `sheet` ·
`skeleton` · `sonner` · `switch` · `table` · `tabs` · `textarea` · `tooltip`

---

## Verification Commands

```bash
# Confirm old packages gone
pnpm list --filter @icrm/consultant-web @mui/material primereact
# → should return nothing

# Confirm shadcn components exist
ls apps/consultant-web/src/components/ui/
# → should list 27+ .jsx files

# After Prompts 18-19 fix all 4 files:
pnpm --filter @icrm/consultant-web build
# → should succeed with no MUI/PrimeReact references
```
