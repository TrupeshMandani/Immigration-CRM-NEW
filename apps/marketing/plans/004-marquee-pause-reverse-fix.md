# 004 — Fix the Marquee's non-functional pause-on-hover and reverse

- **Status**: TODO
- **Commit**: 78b3cc1
- **Severity**: MEDIUM
- **Category**: Correctness / Cohesion
- **Estimated scope**: 1 file (`src/components/ui/marquee.tsx`), 2 lines

## Problem

The `Marquee` component exposes `pauseOnHover` and `reverse` props, but the
classes it applies for them are **not real Tailwind utilities**, so both props
silently do nothing:

```tsx
/* src/components/ui/marquee.tsx:61-67 — current */
className={cn("flex shrink-0 justify-around gap-(--gap)", {
  "animate-marquee flex-row": !vertical,
  "animate-marquee-vertical flex-col": vertical,
  "group-hover:paused": pauseOnHover,     // <-- `paused` is not a Tailwind class
  "direction-[reverse]": reverse,         // <-- `direction-[reverse]` is not valid
})}
```

Tailwind never emits a `paused` utility or a `direction-[reverse]` utility, so
the college showcase's `pauseOnHover` (used at `college-showcase.tsx:28`) has no
effect, and any `reverse` marquee scrolls the default direction.

## Target

Use valid Tailwind v4 arbitrary-property utilities that map to the real CSS:

- pause on hover → `group-hover:[animation-play-state:paused]`
- reverse → `[animation-direction:reverse]`

```tsx
/* target */
className={cn("flex shrink-0 justify-around gap-(--gap)", {
  "animate-marquee flex-row": !vertical,
  "animate-marquee-vertical flex-col": vertical,
  "group-hover:[animation-play-state:paused]": pauseOnHover,
  "[animation-direction:reverse]": reverse,
})}
```

The parent already has the `group` class (`marquee.tsx:48`), so
`group-hover:` resolves correctly.

## Repo conventions to follow

- This project is Tailwind v4 (`tailwindcss: ^4` in `package.json`) and already
  uses arbitrary utilities elsewhere, e.g. `bg-[radial-gradient(...)]` in
  `hero.tsx` and `shadow-[0_0_15px_...]` in `site-navbar.tsx`. Arbitrary
  properties in square brackets are the established pattern.

## Steps

1. In `src/components/ui/marquee.tsx`, replace line 65
   (`"group-hover:paused": pauseOnHover,`) with:

   ```tsx
   "group-hover:[animation-play-state:paused]": pauseOnHover,
   ```

2. Replace line 66 (`"direction-[reverse]": reverse,`) with:

   ```tsx
   "[animation-direction:reverse]": reverse,
   ```

## Boundaries

- Do NOT change the marquee keyframes, durations, props API, or the `group` class.
- Do NOT touch `college-showcase.tsx` or `globals.css`.
- Do NOT add dependencies.
- If lines 65-66 no longer match (drift since 78b3cc1), STOP and report.

## Verification

- **Mechanical**: `next build` compiles, `next lint` clean. Optionally grep the
  built CSS for `animation-play-state:paused` to confirm the class was emitted.
- **Feel check**: open the home page college showcase.
  - Hover the scrolling row of college cards — it should **stop** while hovered
    and resume on mouse-out (before this fix it kept scrolling).
  - If any `<Marquee reverse>` exists, confirm it scrolls the opposite direction.
- **Done when**: hovering the college marquee visibly pauses it.
