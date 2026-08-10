# 005 — Give buttons real press feedback and drop transition-all

- **Status**: TODO
- **Commit**: 78b3cc1
- **Severity**: MEDIUM
- **Category**: Easing & duration / Physicality
- **Estimated scope**: 2 files (`globals.css`, `button.tsx`), ~5 lines

## Problem

Every button on the site (`Button` is used in the navbar and hero CTAs) uses
`transition-all duration-300` for what is only a hover **color** change, and has
**no press feedback** at all:

```tsx
/* src/components/ui/button.tsx:38-43 — current */
const classes = cn(
  "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wide transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
  variantStyles[variant],
  disabled && "pointer-events-none opacity-60",
  className,
);
```

Two issues per the animation rules: (1) `transition: all` animates unintended
properties off the GPU; (2) 300ms is sluggish for a button — hover color should
be quick, and a press should give a subtle scale-down so the control feels
physical. Press feedback should be **100-160ms** and scale to **0.95-0.98**.

## Target

- Introduce a strong ease-out token (from the audit's value catalogue):
  `cubic-bezier(0.23, 1, 0.32, 1)`.
- Transition only `color`, `background-color`, `border-color`, and `transform`
  — not `all`.
- Add `active:scale-[0.97]` press feedback at ~140ms.

```tsx
/* target — button.tsx classes */
"inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wide transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out-strong)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
```

## Repo conventions to follow

- CSS variables live in `:root` in `src/app/globals.css` (lines 5-40). Add the
  easing token there alongside the others.
- Arbitrary Tailwind utilities (`ease-[var(--...)]`, `scale-[0.97]`) are already
  used across this app (e.g. `bg-[#c1121f]`, `shadow-[0_0_15px_...]`).

## Steps

1. **globals.css** — add the token inside `:root` (after `--radius:` on line 11,
   or anywhere in the block). If a `--ease-out-strong` token already exists
   (e.g. plan 006 ran first), skip this step:

   ```css
   --ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
   ```

2. **button.tsx** — replace the first argument string of `cn(...)` (line 39):

   - Remove `transition-all duration-300`.
   - Insert
     `transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out-strong)] active:scale-[0.97]`
     in its place (keep everything else in the string identical).

   Result (line 39):

   ```tsx
   "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wide transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out-strong)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
   ```

## Boundaries

- Do NOT change `variantStyles`, the `href`/`Link` branch, or the component API.
- Do NOT add press feedback to disabled buttons — the existing
  `disabled && "pointer-events-none opacity-60"` already blocks interaction, and
  `active:` won't fire without pointer events, so no extra guard is needed.
- Do NOT add dependencies.
- If line 39 no longer matches (drift since 78b3cc1), STOP and report.

## Verification

- **Mechanical**: `next build` compiles, `next lint` clean.
- **Feel check**: open any page with a CTA (home hero, navbar).
  - Hover a button — the color change is now snappy (~150ms), not a slow fade.
  - Press and hold — the button dips to 97% scale and springs back on release.
  - DevTools → Animations, set speed to 10%, click a button: confirm the scale
    animates `transform` (GPU), and no unrelated properties animate.
- **Done when**: buttons have a visible press dip and no `transition-all` remains
  in `button.tsx`.
