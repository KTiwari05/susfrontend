import type React from "react"
import { motion } from "framer-motion"

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
    >
      <div className="grid gap-1.5">
        <div
          className="inline-flex items-center gap-2 w-fit"
        >
          <span
            className="h-px w-5 rounded-full"
            style={{ background: "var(--primary)" }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--primary)" }}
          >
            {eyebrow}
          </span>
        </div>
        <h1
          className="text-[1.6rem] font-semibold leading-tight"
          style={{ color: "var(--text)", letterSpacing: "-0.025em" }}
        >
          {title}
        </h1>
        {!!subtitle && (
          <p
            className="max-w-2xl text-[13.5px] leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </motion.div>
  )
}