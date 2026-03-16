import { useRef, useState } from "react"
import { motion } from "framer-motion"
import type React from "react"

export default function SimulationSlider({
  label,
  value,
  onChange,
  hint,
  icon,
  color = "var(--primary)",
}: {
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
  icon?: React.ReactNode
  color?: string
}) {
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onChange(Math.round(pct * 100))
  }

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 28px rgba(0,0,0,0.12)" }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient color glow behind card */}
      <div style={{
        position: "absolute",
        top: -20, right: -20,
        width: 80, height: 80,
        borderRadius: "50%",
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
        filter: "blur(20px)",
        pointerEvents: "none",
      }} />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {icon && (
            <div style={{
              width: 32, height: 32, flexShrink: 0,
              display: "grid", placeItems: "center",
              borderRadius: 10,
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
              color,
              border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
            }}>
              {icon}
            </div>
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
              {label}
            </div>
            {hint && (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, lineHeight: 1.35 }}>
                {hint}
              </div>
            )}
          </div>
        </div>

        {/* Animated value badge */}
        <motion.div
          key={value}
          initial={{ scale: 0.85, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          style={{
            flexShrink: 0,
            minWidth: 48,
            padding: "3px 8px",
            borderRadius: 8,
            textAlign: "center",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: '"DM Mono", monospace',
            letterSpacing: "-0.02em",
            background: `color-mix(in srgb, ${color} 14%, transparent)`,
            color,
            border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
          }}
        >
          {value}%
        </motion.div>
      </div>

      {/* Slider track */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", width: 12, textAlign: "right", flexShrink: 0, fontFamily: '"DM Mono", monospace' }}>
          0
        </span>

        <div
          ref={trackRef}
          onClick={handleTrackClick}
          style={{
            position: "relative",
            flex: 1,
            height: 20,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          {/* Track bg */}
          <div style={{
            position: "absolute", left: 0, right: 0,
            height: 5, borderRadius: 99,
            background: "var(--surface-3)",
          }} />

          {/* Filled track */}
          <motion.div
            animate={{ width: `${value}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: "absolute", left: 0,
              height: 5, borderRadius: 99,
              background: `linear-gradient(90deg, color-mix(in srgb, ${color} 70%, transparent), ${color})`,
              boxShadow: dragging ? `0 0 8px color-mix(in srgb, ${color} 60%, transparent)` : "none",
            }}
          />

          {/* Native range (invisible, on top for a11y) */}
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onMouseDown={() => setDragging(true)}
            onMouseUp={() => setDragging(false)}
            onTouchStart={() => setDragging(true)}
            onTouchEnd={() => setDragging(false)}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              opacity: 0, cursor: "pointer", zIndex: 3,
            }}
          />

          {/* Custom thumb */}
          <motion.div
            animate={{
              left: `calc(${value}% - 10px)`,
              scale: dragging ? 1.3 : 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{
              position: "absolute",
              width: 20, height: 20,
              borderRadius: "50%",
              background: "var(--surface)",
              border: `2.5px solid ${color}`,
              boxShadow: dragging
                ? `0 0 0 5px color-mix(in srgb, ${color} 22%, transparent), 0 2px 8px rgba(0,0,0,0.18)`
                : `0 0 0 3px color-mix(in srgb, ${color} 14%, transparent), 0 1px 4px rgba(0,0,0,0.12)`,
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
        </div>

        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", width: 24, flexShrink: 0, fontFamily: '"DM Mono", monospace' }}>
          100
        </span>
      </div>
    </motion.div>
  )
}