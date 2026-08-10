"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * InteractiveGridPattern is a component that renders a grid pattern with interactive squares.
 *
 * @param width - The width of each square.
 * @param height - The height of each square.
 * @param squares - The number of squares in the grid. The first element is the number of horizontal squares, and the second element is the number of vertical squares.
 * @param className - The class name of the grid.
 * @param squaresClassName - The class name of the squares.
 */
interface InteractiveGridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  squares?: [number, number] // [horizontal, vertical]
  className?: string
  squaresClassName?: string
  baseColor?: string
  highlightColor?: string
  interactive?: boolean
  strokeWidth?: number
}

/**
 * One rect in the fading trail left behind the cursor.
 *
 * Every cell the cursor leaves spawns one of these; they fade out independently
 * and overlap, which is what reads as a smooth comet tail. It mounts at full
 * opacity then flips to 0 on the next animation frame so the CSS opacity
 * transition actually runs (a rect mounted straight at 0 has no start value to
 * animate from and would just vanish). No drop-shadow filter here — the trailing
 * rects fade purely on compositor opacity, so a long tail stays smooth; the glow
 * lives only on the single active cell.
 */
function FadeOutRect({
  x,
  y,
  width,
  height,
  fill,
  onDone,
}: {
  x: number
  y: number
  width: number
  height: number
  fill: string
  onDone: () => void
}) {
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpacity(0))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      style={{
        transition: "opacity 1000ms cubic-bezier(0.22, 1, 0.36, 1)",
        opacity,
        willChange: "opacity",
      }}
      onTransitionEnd={onDone}
      pointerEvents="none"
    />
  )
}

/**
 * The InteractiveGridPattern component.
 *
 * @see InteractiveGridPatternProps for the props interface.
 * @returns A React component.
 */
export function InteractiveGridPattern({
  width = 40,
  height = 40,
  squares = [24, 24],
  className,
  squaresClassName,
  baseColor = "rgba(255,255,255,0.18)",
  highlightColor = "rgba(193,18,31,0.45)",
  interactive = true,
  strokeWidth = 0.6,
  ...props
}: InteractiveGridPatternProps) {
  const initialGrid = useMemo(
    () => ({ horizontal: squares[0], vertical: squares[1] }),
    [squares],
  )
  const [gridSize, setGridSize] = useState(initialGrid)
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const rafRef = useRef<number | null>(null)
  const pendingIndexRef = useRef<number | null>(null)
  const prevSquareRef = useRef<number | null>(null)
  const trailIdRef = useRef(0)
  const [trail, setTrail] = useState<{ id: number; index: number }[]>([])

  useEffect(() => {
    setGridSize(initialGrid)
  }, [initialGrid])

  useEffect(() => {
    if (typeof window === "undefined" || !wrapperRef.current) return
    if (!("ResizeObserver" in window)) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width: observedWidth, height: observedHeight } = entry.contentRect
      const cols = Math.max(
        initialGrid.horizontal,
        Math.ceil(observedWidth / width) + 2,
      )
      const rows = Math.max(
        initialGrid.vertical,
        Math.ceil(observedHeight / height) + 2,
      )
      setGridSize((prev) => {
        if (prev.horizontal === cols && prev.vertical === rows) {
          return prev
        }
        return { horizontal: cols, vertical: rows }
      })
    })

    observer.observe(wrapperRef.current)
    return () => observer.disconnect()
  }, [height, width, initialGrid.horizontal, initialGrid.vertical])

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

  useEffect(() => {
    const prev = prevSquareRef.current
    if (prev != null && prev !== hoveredSquare) {
      const id = trailIdRef.current++
      setTrail((current) => {
        const next = [...current, { id, index: prev }]
        // Cap the tail to 4 boxes: the oldest entries are the most faded, so
        // dropping them keeps the trail short without a visible pop.
        return next.length > 4 ? next.slice(next.length - 4) : next
      })
    }
    prevSquareRef.current = hoveredSquare
  }, [hoveredSquare])

  const totalWidth = width * gridSize.horizontal
  const totalHeight = height * gridSize.vertical

  const verticalLines = Array.from({ length: gridSize.horizontal + 1 }).map((_, col) => {
    const x = col * width
    return (
      <line
        key={`v-${col}`}
        x1={x}
        x2={x}
        y1={0}
        y2={totalHeight}
        stroke={baseColor}
        strokeWidth={strokeWidth}
        shapeRendering="crispEdges"
        vectorEffect="non-scaling-stroke"
      />
    )
  })

  const horizontalLines = Array.from({ length: gridSize.vertical + 1 }).map((_, row) => {
    const y = row * height
    return (
      <line
        key={`h-${row}`}
        x1={0}
        x2={totalWidth}
        y1={y}
        y2={y}
        stroke={baseColor}
        strokeWidth={strokeWidth}
        shapeRendering="crispEdges"
        vectorEffect="non-scaling-stroke"
      />
    )
  })

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
            shapeRendering="crispEdges"
            vectorEffect="non-scaling-stroke"
          />
        )
      }),
    [gridSize.horizontal, gridSize.vertical, width, height, baseColor, strokeWidth, squaresClassName],
  )

  const cellPos = (i: number) => ({
    x: (i % gridSize.horizontal) * width,
    y: Math.floor(i / gridSize.horizontal) * height,
  })

  return (
    <div ref={wrapperRef} className="pointer-events-none absolute inset-0 h-full w-full">
      <svg
        ref={svgRef}
        width={totalWidth}
        height={totalHeight}
        className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
        {...props}
      >
      <g opacity={0.7}>
        {verticalLines}
        {horizontalLines}
      </g>
      {baseRects}
      {trail.map(({ id, index }) => (
        <FadeOutRect
          key={id}
          {...cellPos(index)}
          width={width}
          height={height}
          fill={highlightColor}
          onDone={() => setTrail((current) => current.filter((t) => t.id !== id))}
        />
      ))}
      {hoveredSquare != null && (
        <rect
          key={`in-${hoveredSquare}`}
          {...cellPos(hoveredSquare)}
          width={width}
          height={height}
          fill={highlightColor}
          className="drop-shadow-[0_10px_25px_rgba(193,18,31,0.35)]"
          style={{ transition: "opacity 300ms ease-out", opacity: 1 }}
          pointerEvents="none"
        />
      )}
      </svg>
    </div>
  )
}
