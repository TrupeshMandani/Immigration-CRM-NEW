# 003 — Honor prefers-reduced-motion across the marketing site

- **Status**: TODO
- **Commit**: 78b3cc1
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 3 files (`globals.css`, `hero.tsx`, `process-flow.tsx`), ~40 lines

## Problem

There is **no `prefers-reduced-motion` handling anywhere** in the marketing app.
Users who set the OS "Reduce motion" preference still get: an infinite maple-leaf
storm in the hero, infinitely pulsing connector bars in the process section, the
college marquee scrolling forever, and the shimmer sweeps in the hero background.
Reduced motion should mean **fewer and gentler** animations — keep opacity/color
that aids comprehension, drop looping and position motion.

Current offenders:

```tsx
/* src/components/hero/hero.tsx:221-238 — infinite leaf loop, always on */
animate={{ opacity: [...], scale: [...], rotate: [...], x: [...], y: [...] }}
transition={{ duration: leaf.duration, repeat: Infinity, ... }}
```

```tsx
/* src/components/hero/hero.tsx:194-205 — infinite shimmer sweeps */
animate={{ opacity: [0, 0.8, 0], x: [0, 120] }}
transition={{ duration: 6, repeat: Infinity, repeatDelay: 3 }}
```

```tsx
/* src/components/sections/process-flow.tsx:38-39 — infinite pulse */
animate={{ scaleX: [0.5, 1] }}
transition={{ repeat: Infinity, duration: 2, delay: index * 0.2 }}
```

```css
/* src/app/globals.css:170-172 — marquee, no reduced-motion guard */
.animate-college-marquee { animation: college-marquee 28s linear infinite; }
/* plus --animate-marquee / --animate-marquee-vertical used by <Marquee> */
```

## Target

- A global CSS block pauses/neutralizes the CSS marquee animations under reduced
  motion (content stays visible, just static).
- Framer Motion components read `useReducedMotion()` and render **static** (no
  `repeat: Infinity` loops, no entrance translate) when it's true.

## Repo conventions to follow

- Framer Motion is already the animation library (`framer-motion` in deps). Use
  its official hook `useReducedMotion()` — no new deps.
- CSS custom-animation tokens live in `globals.css` under `@theme inline`
  (`--animate-marquee`, `--animate-marquee-vertical`, lines 84-85) and the
  `.animate-college-marquee` rule (lines 170-172). Add the media query at the
  bottom of the file after existing rules.

## Steps

1. **globals.css** — append at the end of the file (after line 177):

   ```css
   @media (prefers-reduced-motion: reduce) {
     .animate-marquee,
     .animate-marquee-vertical,
     .animate-college-marquee {
       animation: none !important;
     }
     *,
     *::before,
     *::after {
       scroll-behavior: auto !important;
     }
   }
   ```

2. **process-flow.tsx** — import the hook and gate the infinite pulse. At the top
   with the other imports (line 3):

   ```tsx
   import { motion, useReducedMotion } from "framer-motion";
   ```

   Inside `ProcessFlow`, before the return:

   ```tsx
   const reduceMotion = useReducedMotion();
   ```

   Replace the connector `motion.span` (lines 35-40) so it draws once (or not at
   all) under reduced motion:

   ```tsx
   <motion.span
     className="absolute -right-8 top-1/2 hidden h-1 w-14 rounded-full bg-gradient-to-r from-transparent via-[#c1121f] to-transparent md:block"
     aria-hidden
     initial={{ scaleX: 0.5 }}
     animate={reduceMotion ? { scaleX: 1 } : { scaleX: [0.5, 1] }}
     transition={
       reduceMotion
         ? { duration: 0 }
         : { repeat: Infinity, duration: 2, delay: index * 0.2 }
     }
   />
   ```

   Also gate the card entrance (lines 18-24): when `reduceMotion`, set
   `initial={false}` so cards appear without the y-translate:

   ```tsx
   <motion.div
     key={step.title}
     initial={reduceMotion ? false : { y: 20, opacity: 0 }}
     whileInView={reduceMotion ? undefined : { y: 0, opacity: 1 }}
     viewport={{ once: true }}
     transition={reduceMotion ? { duration: 0 } : { delay: index * 0.1 }}
     className="relative rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,24,36,0.08)]"
   >
   ```

3. **hero.tsx** — import the hook (line 4 area):

   ```tsx
   import { motion, useReducedMotion } from "framer-motion";
   ```

   In `Hero`, add near the top of the component body:

   ```tsx
   const reduceMotion = useReducedMotion();
   ```

   Pass it into the background so the loops can be disabled:

   ```tsx
   <MapleGlowBackground leaves={leaves} pointer={pointer} reduceMotion={reduceMotion} />
   ```

   Update `MapleGlowBackgroundProps` (line 162) and the function signature (line
   167) to accept `reduceMotion: boolean`.

   For the two shimmer sweeps (lines 194-205), gate the loop:

   ```tsx
   animate={reduceMotion ? { opacity: 0 } : { opacity: [0, 0.8, 0], x: [0, 120] }}
   transition={reduceMotion ? { duration: 0 } : { duration: 6, repeat: Infinity, repeatDelay: 3 }}
   ```

   (Apply the same pattern to the second sweep with its `x: [0, -120]`,
   `delay: 1.5` values.)

   For the leaf loop (lines 214-238), when `reduceMotion` render the leaf
   **static** at a resting position — replace `animate`/`transition` with a
   branch:

   ```tsx
   animate={
     reduceMotion
       ? { opacity: 0.6, scale: scaleValue, rotate: leaf.rotate, x: leaf.driftX, y: 0 }
       : {
           opacity: [0, 0.7 + leaf.opacityVariation, 0],
           scale: [scaleValue, scaleValue * leaf.scaleVariation, scaleValue],
           rotate: [leaf.rotate, leaf.rotate + leaf.sway * leaf.rotateVariation1, leaf.rotate + leaf.sway * leaf.rotateVariation2],
           x: [leaf.driftX, leaf.xMid, leaf.xEnd],
           y: [-leaf.fallDistance * 0.9, leaf.fallDistance * 1.15],
         }
   }
   transition={
     reduceMotion
       ? { duration: 0 }
       : { duration: leaf.duration, repeat: Infinity, repeatDelay: leaf.repeatDelay, delay: leaf.delay, ease: [0.4, 0, 0.6, 1] }
   }
   ```

   For the nested pointer-repel `motion.span` (lines 240-243), when
   `reduceMotion` keep it at rest: `animate={reduceMotion ? { x: 0, y: 0 } : { x: repel.x, y: repel.y }}`.

## Boundaries

- Do NOT delete any animation — only branch it on `reduceMotion`.
- Do NOT change layout, colors, or copy.
- Do NOT touch DotGrid or InteractiveGridPattern here — their reduced-motion
  gating is owned by plans 001 and 002 respectively.
- Do NOT add dependencies.
- If any excerpt no longer matches (drift since 78b3cc1), STOP and report.

## Verification

- **Mechanical**: `next build` compiles, `next lint` clean.
- **Feel check**: DevTools → Rendering → "Emulate CSS prefers-reduced-motion:
  reduce", then reload each page.
  - Home: maple leaves are static (no falling/looping), shimmer sweeps gone,
    process connectors are not pulsing, cards are already in place (no slide-in).
  - College showcase marquee is stationary but all cards remain readable.
  - Turn the emulation off and reload: all motion returns exactly as before.
- **Done when**: with reduced-motion emulated, a Performance recording of an idle
  home page shows no repeating Framer/CSS animation frames.
