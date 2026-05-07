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
    const handlePointerMove = (event: PointerEvent) => {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        setHoveredSquare(null)
        return
      }
      const col = Math.floor(x / width)
      const row = Math.floor(y / height)
      const index = row * gridSize.horizontal + col
      setHoveredSquare(index)
    }
    const clearHover = () => setHoveredSquare(null)
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerleave", clearHover)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerleave", clearHover)
    }
  }, [interactive, width, height, gridSize.horizontal, gridSize.vertical])

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
      {Array.from({ length: gridSize.horizontal * gridSize.vertical }).map((_, index) => {
        const x = (index % gridSize.horizontal) * width
        const y = Math.floor(index / gridSize.horizontal) * height
        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={width}
            height={height}
            className={cn(
              "transition-all duration-300 ease-out [&:not(:hover)]:duration-[1200ms]",
              hoveredSquare === index ? "drop-shadow-[0_10px_25px_rgba(193,18,31,0.35)]" : "",
              squaresClassName,
            )}
            fill={
              hoveredSquare === index
                ? highlightColor
                : "rgba(255,255,255,0.02)"
            }
            stroke={baseColor}
            strokeWidth={strokeWidth}
            shapeRendering="geometricPrecision"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      </svg>
    </div>
  )
}
