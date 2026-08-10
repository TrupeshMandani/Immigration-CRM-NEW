# 006 — Tighten the navbar scroll-state transition

- **Status**: TODO
- **Commit**: 78b3cc1
- **Severity**: MEDIUM
- **Category**: Easing & duration / Performance
- **Estimated scope**: 1 file (`src/components/navbar/site-navbar.tsx`), 2 lines
- **Depends on**: token `--ease-out-strong` from plan 005 (add it here if 005 hasn't run)

## Problem

The header animates its scroll-state (transparent → solid white + shadow +
backdrop-blur) with `transition-all duration-500`:

```tsx
/* src/components/navbar/site-navbar.tsx:23-29 — current */
<header
  className={cn(
    "relative fixed inset-x-0 top-0 z-50 transition-all duration-500",
    solid
      ? "bg-white/95 shadow-lg shadow-slate-950/5 backdrop-blur"
      : "bg-transparent",
  )}
>
```

`transition-all` animates every changing property (including `backdrop-filter`,
which is expensive to animate), and 500ms is long for chrome reacting to a
scroll threshold — the bar lags noticeably behind the scroll.

The nav links also use the bare `transition` shorthand (= `transition-all`):

```tsx
/* src/components/navbar/site-navbar.tsx:49 — current */
className="transition hover:text-[#c1121f]"
```

Note also `relative fixed` on line 25 — `fixed` wins, so `relative` is dead;
leave it unless trivially removing (out of scope for this motion plan).

## Target

- Header transitions only the properties that change, at ~250ms with the strong
  ease-out token:
  `transition-[background-color,box-shadow,backdrop-filter] duration-300 ease-[var(--ease-out-strong)]`
- Nav links transition only color:
  `transition-colors duration-200 ease-[var(--ease-out-strong)]`

## Repo conventions to follow

- The easing token `--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);` lives in
  `:root` in `src/app/globals.css` (added by plan 005). If it is not present,
  add it there first.
- Arbitrary utilities (`ease-[var(--...)]`) are already used across this app.

## Steps

1. If `--ease-out-strong` is not already in `:root` in `globals.css`, add it
   (see plan 005 step 1):

   ```css
   --ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
   ```

2. **site-navbar.tsx line 25** — replace `transition-all duration-500` with:

   ```tsx
   "relative fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ease-[var(--ease-out-strong)]",
   ```

3. **site-navbar.tsx line 49** — replace `"transition hover:text-[#c1121f]"` with:

   ```tsx
   className="transition-colors duration-200 ease-[var(--ease-out-strong)] hover:text-[#c1121f]"
   ```

## Boundaries

- Do NOT change the scroll handler, the `solid` threshold, or the JSX structure.
- Do NOT touch the `ScrollProgress` child.
- Do NOT add dependencies.
- If lines 25 or 49 no longer match (drift since 78b3cc1), STOP and report.

## Verification

- **Mechanical**: `next build` compiles, `next lint` clean.
- **Feel check**: load the home page and scroll past ~48px.
  - The header fills in to white with shadow crisply (~300ms), tracking the
    scroll rather than lagging half a second behind.
  - Hover a nav link — the color change is a quick ~200ms, not a slow fade.
  - DevTools → Performance while scrolling the threshold repeatedly: no long
    off-GPU paint spikes from animating `all`.
- **Done when**: no `transition-all` remains in `site-navbar.tsx` and the header
  state change feels responsive.
