# 001 — Park the DotGrid render loop when nothing is moving

- **Status**: TODO
- **Commit**: 78b3cc1
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file (`src/components/ui/DotGrid.tsx`), ~30 lines changed

## Problem

`DotGrid` runs an unconditional `requestAnimationFrame` loop that clears and
repaints the **entire canvas every single frame, forever** — whether or not the
pointer is moving and whether or not any dot is displaced. It is mounted as a
full-page background on the colleges route with `dotSize={3}, gap={15}`, which
produces thousands of dots; every one of them is distance-checked and re-filled
60 times per second for the whole time the page is open. This is a constant
main-thread + GPU cost and a battery drain even when the page is completely idle.

```tsx
/* src/components/ui/DotGrid.tsx:139-176 — current */
const draw = () => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { x: px, y: py } = pointerRef.current;

  for (const dot of dotsRef.current) {
    /* ... per-dot proximity math + fill ... */
  }

  rafId = requestAnimationFrame(draw);   // <-- never stops
};

draw();
return () => cancelAnimationFrame(rafId);
```

```tsx
/* src/app/colleges/page.tsx:35 — where it mounts */
<DotGrid dotSize={3} gap={15} baseColor="#BABABA" activeColor="#FF0000"
  proximity={50} shockRadius={100} shockStrength={2}
  resistance={100} returnDuration={0.5} />
```

## Target

The loop runs **only while there is something to animate**: a dot is displaced,
an inertia tween is active, or the pointer has moved within the last ~250 ms
(so proximity highlighting still updates). When everything is at rest the loop
stops after painting one final resting frame, and any of pointer-move / click /
resize restarts it. When the user prefers reduced motion, the interactive loop
does not run at all — the grid is painted once, statically.

Behaviour must be visually identical while the user is interacting; the only
change is that an **idle** page stops burning frames.

## Repo conventions to follow

- This file already uses refs for mutable animation state (`pointerRef`,
  `dotsRef`) and `useCallback`/`useEffect` with dependency arrays — keep that
  style; do not introduce new state that triggers React re-renders.
- GSAP inertia tweens mutate `dot.xOffset` / `dot.yOffset` directly (lines
  228-239, 256-267). Those are the values whose "at rest" check gates the loop.
- Reduced-motion detection: use a plain matchMedia read (no new deps):
  `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.

## Steps

1. In the draw `useEffect` (starts line 133), add two refs above the loop to
   track loop state and last pointer-activity time. Put them with the other
   refs near the top of the component (after `pointerRef`, ~line 81):

   ```tsx
   const rafIdRef = useRef<number | null>(null);
   const lastPointerActivityRef = useRef(0);
   ```

2. Replace the draw `useEffect` body (lines 133-177) so the loop self-parks.
   Keep the existing per-dot proximity math **exactly** as-is; only the
   scheduling changes:

   ```tsx
   useEffect(() => {
     if (!circlePath) return;

     const prefersReduced =
       typeof window !== 'undefined' &&
       window.matchMedia('(prefers-reduced-motion: reduce)').matches;

     const proxSq = proximity * proximity;

     const paintFrame = () => {
       const canvas = canvasRef.current;
       if (!canvas) return false;
       const ctx = canvas.getContext('2d');
       if (!ctx) return false;
       ctx.clearRect(0, 0, canvas.width, canvas.height);

       const { x: px, y: py } = pointerRef.current;
       let stillActive = false;

       for (const dot of dotsRef.current) {
         if (Math.abs(dot.xOffset) > 0.05 || Math.abs(dot.yOffset) > 0.05) {
           stillActive = true;
         }
         const ox = dot.cx + dot.xOffset;
         const oy = dot.cy + dot.yOffset;
         const dx = dot.cx - px;
         const dy = dot.cy - py;
         const dsq = dx * dx + dy * dy;

         let style = baseColor;
         if (dsq <= proxSq) {
           const dist = Math.sqrt(dsq);
           const t = 1 - dist / proximity;
           const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
           const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
           const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
           style = `rgb(${r},${g},${b})`;
         }

         ctx.save();
         ctx.translate(ox, oy);
         ctx.fillStyle = style;
         ctx.fill(circlePath);
         ctx.restore();
       }
       return stillActive;
     };

     const loop = () => {
       const dotsActive = paintFrame();
       const pointerRecentlyActive =
         performance.now() - lastPointerActivityRef.current < 250;

       if (dotsActive || pointerRecentlyActive) {
         rafIdRef.current = requestAnimationFrame(loop);
       } else {
         rafIdRef.current = null; // park: nothing to animate
       }
     };

     // expose a starter other effects/handlers can call
     const start = () => {
       if (rafIdRef.current == null) {
         rafIdRef.current = requestAnimationFrame(loop);
       }
     };
     startLoopRef.current = start;

     if (prefersReduced) {
       paintFrame(); // one static resting frame, no loop
     } else {
       start();
     }

     return () => {
       if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
       rafIdRef.current = null;
       startLoopRef.current = null;
     };
   }, [proximity, baseColor, activeRgb, baseRgb, circlePath]);
   ```

3. Add the shared starter ref near the other refs (step 1 area):

   ```tsx
   const startLoopRef = useRef<(() => void) | null>(null);
   ```

4. In the pointer `useEffect` (`onMove`, starts line 195), after the block that
   updates `pr.x`/`pr.y` (around line 219), record activity and wake the loop:

   ```tsx
   lastPointerActivityRef.current = performance.now();
   startLoopRef.current?.();
   ```

5. In the same effect's `onClick` handler (line 244), after computing `cx`/`cy`,
   also wake the loop so shock displacement renders even from an idle state:

   ```tsx
   lastPointerActivityRef.current = performance.now();
   startLoopRef.current?.();
   ```

6. In `buildGrid`'s effect (line 179) — after a resize rebuilds the grid — call
   `startLoopRef.current?.()` at the end of `buildGrid` so a resize repaints once.

## Boundaries

- Do NOT change the proximity/color math, the GSAP inertia config, the throttle
  helper, or the JSX. Scheduling only.
- Do NOT convert any of this to React state — it must not cause re-renders.
- Do NOT touch `src/app/colleges/page.tsx` props.
- Do NOT add dependencies.
- If the draw effect no longer matches the excerpt above (drift since commit
  78b3cc1), STOP and report instead of improvising.

## Verification

- **Mechanical**: `pnpm --filter @icrm/marketing build` (or `next build`)
  compiles with no TS errors; `next lint` clean.
- **Feel check**: open the colleges page.
  - Move the mouse over the grid — dots highlight and displace exactly as before.
  - Click — shockwave still fires.
  - Now hold the mouse completely still off the grid for ~1 s and open DevTools →
    Performance → record 3 s: there should be **no repeating rAF/paint work**
    while idle (flat main thread), where before it was a solid 60fps sawtooth.
  - Toggle `prefers-reduced-motion: reduce` (DevTools → Rendering) and reload:
    the grid renders once and does not react to the pointer with a running loop.
- **Done when**: idle CPU/GPU for the colleges page is flat in the Performance
  panel, and all pointer/click/resize interactions look identical to before.
