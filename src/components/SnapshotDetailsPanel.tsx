import { useEffect, useMemo, useState } from "react"
import { X, Cpu, FileInput, TrendingDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import API, { getApiErrorMessage } from "../api/api"

type SnapshotDetails = {
  emission_id: number
  company: { id: number; name: string | null }
  period: { year: number | null; month: number | null }
  inputs: Record<string, number | null>
  emissions: {
    energy_emissions: number
    transport_emissions: number
    waste_emissions: number
    water_emissions: number
    supply_chain_emissions: number
    total_emissions: number
  }
  method: {
    calculator: string
    emission_factor_version: string
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
}

function labelize(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

/* ─── Section block ───────────────────────────────────────────────────────── */
function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
      >
        <span style={{ color: "var(--primary)" }}>{icon}</span>
        <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{title}</span>
      </div>
      <div className="p-4 grid gap-0">{children}</div>
    </div>
  )
}

/* ─── Data row ────────────────────────────────────────────────────────────── */
function DataRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div
      className="flex items-center justify-between py-2.5 px-1"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <span className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span
        className="text-[12.5px] font-medium"
        style={{
          color: highlight ? "var(--primary)" : "var(--text)",
          fontFamily: mono ? '"DM Mono", monospace' : "inherit",
        }}
      >
        {value}
      </span>
    </div>
  )
}

/* ─── Emission bar ────────────────────────────────────────────────────────── */
function EmissionBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="py-2.5 px-1 grid gap-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="text-[12.5px] font-medium tabular-nums" style={{ color: "var(--text)", fontFamily: '"DM Mono", monospace' }}>
          {fmt(value)} kg
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

/* ─── Panel ───────────────────────────────────────────────────────────────── */
export default function SnapshotDetailsPanel({
  open,
  emissionId,
  onClose,
  title,
}: {
  open: boolean
  emissionId: number | null
  onClose: () => void
  title?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [data, setData] = useState<SnapshotDetails | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!open || !emissionId) return
      setLoading(true)
      setError("")
      try {
        const res = await API.get("/emissions/snapshot-details", { params: { emission_id: emissionId } })
        if (!mounted) return
        setData(res.data as SnapshotDetails)
      } catch (e: any) {
        if (!mounted) return
        setError(getApiErrorMessage(e) ?? "Failed to load snapshot details")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [open, emissionId])

  useEffect(() => {
    if (!open) { setError(""); setLoading(false); setData(null) }
  }, [open])

  const periodText = useMemo(() => {
    const y = data?.period?.year
    const m = data?.period?.month
    if (!y || !m) return "—"
    return `${String(m).padStart(2, "0")}/${y}`
  }, [data])

  const total = data?.emissions.total_emissions ?? 1

  const emissionBreakdown = data ? [
    { label: "Energy", value: data.emissions.energy_emissions, color: "#f59e0b" },
    { label: "Transport", value: data.emissions.transport_emissions, color: "#3b82f6" },
    { label: "Waste", value: data.emissions.waste_emissions, color: "var(--primary)" },
    { label: "Water", value: data.emissions.water_emissions, color: "var(--accent)" },
    { label: "Supply chain", value: data.emissions.supply_chain_emissions, color: "#8b5cf6" },
  ] : []

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 h-full w-full max-w-[540px] overflow-y-auto"
            style={{
              background: "var(--bg)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-start justify-between gap-3 px-6 py-4"
              style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
            >
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--primary)" }}>
                  Snapshot details
                </div>
                <div className="text-[17px] font-semibold leading-tight" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
                  {title ?? data?.company?.name ?? "Snapshot"}
                </div>
                <div className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>
                  Period: {periodText} · ID: <span style={{ fontFamily: '"DM Mono", monospace' }}>{emissionId}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-xl transition-colors shrink-0 mt-0.5"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 grid gap-4">
              {/* Error */}
              {!!error && (
                <div
                  className="rounded-xl px-4 py-3 text-[13px]"
                  style={{ background: "var(--error-soft)", border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)", color: "var(--error)" }}
                >
                  {error}
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="grid gap-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-24 rounded-2xl animate-pulse"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    />
                  ))}
                </div>
              )}

              {!!data && !loading && (
                <>
                  {/* Total highlight */}
                  <div
                    className="rounded-2xl px-5 py-4 flex items-center justify-between"
                    style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-muted)" }}
                  >
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--primary)" }}>
                        Total emissions
                      </div>
                      <div
                        className="text-[2rem] font-semibold leading-none"
                        style={{ color: "var(--primary)", fontFamily: '"DM Mono", monospace', letterSpacing: "-0.04em" }}
                      >
                        {fmt(data.emissions.total_emissions)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: "var(--primary)", opacity: 0.7 }}>kg CO₂e</div>
                      <div className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>{periodText}</div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <Section title="Emissions breakdown" icon={<TrendingDown className="h-4 w-4" />}>
                    {emissionBreakdown.map((e) => (
                      <EmissionBar key={e.label} label={e.label} value={e.value} total={total} color={e.color} />
                    ))}
                  </Section>

                  {/* Raw inputs */}
                  <Section title="Raw inputs" icon={<FileInput className="h-4 w-4" />}>
                    {Object.entries(data.inputs).map(([k, v]) => (
                      <DataRow key={k} label={labelize(k)} value={v == null ? "—" : String(v)} mono />
                    ))}
                  </Section>

                  {/* Method */}
                  <Section title="Method" icon={<Cpu className="h-4 w-4" />}>
                    <DataRow label="Calculator" value={data.method.calculator} />
                    <DataRow label="Emission factor version" value={data.method.emission_factor_version} />
                    <DataRow label="Emission ID" value={String(data.emission_id)} mono highlight />
                  </Section>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}