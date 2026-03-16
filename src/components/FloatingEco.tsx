import type React from "react"
import { motion } from "framer-motion"
import { Droplet, Leaf, Wind } from "lucide-react"

function FloatIcon({
  children,
  className,
  delay,
}: {
  children: React.ReactNode
  className: string
  delay: number
}) {
  return (
    <motion.div
      className={
        "pointer-events-none absolute grid place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]/70 text-[color:var(--muted)] shadow-sm backdrop-blur " +
        className
      }
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      <motion.div
        animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export default function FloatingEco() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <FloatIcon className="left-[6%] top-[14%] h-14 w-14" delay={0.1}>
        <Leaf className="h-6 w-6" />
      </FloatIcon>
      <FloatIcon className="right-[10%] top-[18%] h-16 w-16" delay={0.25}>
        <Wind className="h-7 w-7" />
      </FloatIcon>
      <FloatIcon className="right-[14%] bottom-[14%] h-14 w-14" delay={0.4}>
        <Droplet className="h-6 w-6" />
      </FloatIcon>
      <motion.div
        className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  )
}
