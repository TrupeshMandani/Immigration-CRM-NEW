# 002 — Stop the InteractiveGridPattern re-render storm

- **Status**: TODO
- **Commit**: 78b3cc1
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file (`src/components/ui/interactive-grid-pattern.tsx`), ~40 lines changed

## Problem

The programs page mounts this as a full-viewport background with
`squares={[48, 36]}` = **1,728 `<rect>` DOM nodes** (and the ResizeObserver
grows it further to cover the viewport). Two problems compound:

1. A `window` `pointermove` listener calls `setHoveredSquare(index)` on **every
   pointer move**, re-rendering the whole SVG — all ~1,728 rects — on every
   mouse move.
2. Every rect carries `transition-all`, which animates off-GPU properties and
   applies a `drop-shadow` filter transition to whichever rect is hovered.

```tsx
/* src/components/ui/interactive-grid-pattern.tsx:87-103 — current */
const handlePointerMove = (event: PointerEvent) => {
  /* ... */
  const index = row * gridSize.horizontal + col
  setHoveredSquare(index)   // <-- fires every move, re-renders all rects
}
```

```tsx
/* src/components/ui/interactive-grid-pattern.tsx:163-189 — current */
{Array.from({ length: gridSize.horizontal * gridSize.vertical }).map((_, index) => {
  /* ... */
  return (
    <rect /* ... */
      className={cn(
        "transition-all duration-300 ease-out [&:not(:hover)]:duration-[1200ms]",
        hoveredSquare === index ? "drop-shadow-[0_10px_25px_rgba(193,18,31,0.35)]" : "",
        squaresClassName,
      )}
      fill={hoveredSquare === index ? highlightColor : "rgba(255,255,255,0.02)"}
      /* ... */
    />
  )
})}
```

```tsx
/* src/app/programs/page.tsx:38 — where it mounts */
<InteractiveGridPattern width={48} height={48} squares={[48, 36]}
  baseColor="rgba(199, 199, 199)" highlightColor="rgba(193,18,31,0.65)" />
```

## Target

The background grid is **static** — the 1,728 base rects never re-render on
hover. A **single** highlight `<rect>` is moved to the hovered cell, so a
pointer move updates one element instead of the entire grid. The pointer handler
is throttled to one update per animation frame. `transition-all` is gone. The
whole interaction is skipped under reduced motion.

Concretely:
- Base grid (lines + faint rects) rendered once via `useMemo`, keyed only on
  dimensions — never on `hoveredSquare`.
- One highlight `<rect>` positioned by the hovered cell, `fill={highlightColor}`,
  `className="transition-[x,y,opacity] duration-300 ease-out"`, `opacity` 0 when
  no cell is hovered.
- `pointermove` handler coalesced with `requestAnimationFrame` (store the latest
  index in a ref, flush once per frame).

## Repo conventions to follow

- The file already uses `useMemo` for `initialGrid` (line 46) and `cn` from
  `@/lib/utils` — reuse both.
- Keep the existing `ResizeObserver` grid-growth logic (lines 59-85) unchanged.
- Reduced-motion read: `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
  inside the pointer effect, same pattern used elsewhere in this plan set.

## Steps

1. Add a ref to coalesce pointer updates. Near the other refs (line 52-53):

   ```tsx
   const rafRef = useRef<number | null>(null)
   const pendingIndexRef = useRef<number | null>(null)
   ```

2. Replace the pointer `useEffect` (lines 87-111) so it throttles with rAF and
   respects reduced motion:

   ```tsx
   useEffect(() => {
     if (!interactive) return
     if (
       typeof window !== "undefined" &&
       window.matchMedia("(prefers-reduced-motion: reduce)").matches
     ) {
       return // no hover interaction under reduced motion
     }

     const flush = () => {
       rafRef.current = null
       setHoveredSquare(pendingIndexRef.current)
     }
     const schedule = () => {
       if (rafRef.current == null) rafRef.current = requestAnimationFrame(flush)
     }

     const handlePointerMove = (event: PointerEvent) => {
       const svg = svgRef.current
       if (!svg) return
       const rect = svg.getBoundingClientRect()
       const x = event.clientX - rect.left
       const y = event.clientY - rect.top
       if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
         pendingIndexRef.current = null
         schedule()
         return
       }
       const col = Math.floor(x / width)
       const row = Math.floor(y / height)
       pendingIndexRef.current = row * gridSize.horizontal + col
       schedule()
     }
     const clearHover = () => {
       pendingIndexRef.current = null
       schedule()
     }
     window.addEventListener("pointermove", handlePointerMove)
     window.addEventListener("pointerleave", clearHover)
     return () => {
       window.removeEventListener("pointermove", handlePointerMove)
       window.removeEventListener("pointerleave", clearHover)
       if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
       rafRef.current = null
     }
   }, [interactive, width, height, gridSize.horizontal, gridSize.vertical])
   ```

3. Memoize the static base rects so they do NOT depend on `hoveredSquare`.
   Replace the inline `.map` at lines 163-189 with a `useMemo` computed above
   the return (after `horizontalLines`, ~line 148):

   ```tsx
   const baseRects = useMemo(
     () =>
       Array.from({ length: gridSize.horizontal * gridSize.vertical }).map((_, index) => {
         const x = (index % gridSize.horizontal) * width
         const y = Math.floor(index / gridSize.horizontal) * height
         return (
           <rect
             key={index}
             x={x}
             y={y}
             width={width}
             height={height}
             className={cn(squaresClassName)}
             fill="rgba(255,255,255,0.02)"
             stroke={baseColor}
             strokeWidth={strokeWidth}
             shapeRendering="geometricPrecision"
             vectorEffect="non-scaling-stroke"
           />
         )
       }),
     [gridSize.horizontal, gridSize.vertical, width, height, baseColor, strokeWidth, squaresClassName],
   )
   ```

4. Compute the highlight cell position from `hoveredSquare` just before the
   return:

   ```tsx
   const hoveredX =
     hoveredSquare != null ? (hoveredSquare % gridSize.horizontal) * width : 0
   const hoveredY =
     hoveredSquare != null
       ? Math.floor(hoveredSquare / gridSize.horizontal) * height
       : 0
   ```

5. In the returned SVG, render `{baseRects}` where the old `.map` was, and add a
   single highlight rect immediately after it:

   ```tsx
   {baseRects}
   <rect
     aria-hidden
     x={hoveredX}
     y={hoveredY}
     width={width}
     height={height}
     fill={highlightColor}
     className="transition-[x,y,opacity] duration-300 ease-out drop-shadow-[0_10px_25px_rgba(193,18,31,0.35)]"
     style={{ opacity: hoveredSquare != null ? 1 : 0 }}
     pointerEvents="none"
   />
   ```

## Boundaries

- Do NOT change the ResizeObserver logic, the line-drawing arrays, or the
  component's props/defaults.
- Do NOT touch `src/app/programs/page.tsx`.
- Keep the base rects' faint `rgba(255,255,255,0.02)` fill and stroke as-is.
- Do NOT add dependencies.
- If the render block no longer matches the excerpt (drift since 78b3cc1), STOP
  and report.

## Verification

- **Mechanical**: `next build` compiles, `next lint` clean.
- **Feel check**: open the programs page.
  - Hover the grid — a single red cell highlights and follows the pointer,
    fading in/out; visually equivalent to before (the highlight now slides
    between cells rather than hard-swapping, which is acceptable/better).
  - DevTools → Performance, record while sweeping the mouse fast across the grid:
    scripting/rendering per frame should be a fraction of before (no full-SVG
    re-render). Confirm React DevTools "Highlight updates" shows only the
    highlight rect updating, not the whole `<svg>`.
  - Toggle `prefers-reduced-motion: reduce` and reload: grid is static, no hover
    highlight tracking.
- **Done when**: pointer sweeps no longer re-render all rects (verified in React
  DevTools) and there is no `transition-all` left in the file.
