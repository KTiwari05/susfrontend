import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { motion } from "framer-motion"

export default function KpiCard({
  label,
  value,
  unit,
  delta,
  tone = "neutral",
}: {
  label: string
  value: string
  unit?: string
  delta?: number
  tone?: "neutral" | "good" | "warn"
}) {
  const valueColor =
    tone === "good"
      ? "var(--primary)"
      : tone === "warn"
      ? "var(--warning)"
      : "var(--text)"

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "var(--shadow)" }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Subtle top accent bar */}
      {tone !== "neutral" && (
        <span
          className="absolute top-0 left-5 right-5 h-[2px] rounded-full"
          style={{
            background: tone === "good" ? "var(--primary)" : "var(--warning)",
            opacity: 0.6,
          }}
        />
      )}

      <div
        className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-3"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div
            className="text-[1.7rem] font-semibold leading-none"
            style={{ color: valueColor, letterSpacing: "-0.03em", fontFamily: '"DM Mono", monospace' }}
          >
            {value}
          </div>
          {!!unit && (
            <div
              className="mt-1.5 text-[11px] font-medium"
              style={{ color: "var(--muted)" }}
            >
              {unit}
            </div>
          )}
        </div>

        {typeof delta === "number" && (
          <div
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium"
            style={
              delta < 0
                ? {
                    background: "var(--primary-soft)",
                    color: "var(--primary)",
                    border: "1px solid var(--primary-muted)",
                  }
                : {
                    background: "var(--error-soft)",
                    color: "var(--error)",
                    border: "1px solid color-mix(in srgb, var(--error) 20%, transparent)",
                  }
            }
          >
            {delta < 0 ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <ArrowUpRight className="h-3 w-3" />
            )}
            <span>{Math.abs(delta).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}