import { useEffect, useMemo, useState } from "react"
import API, { getApiErrorMessage } from "../api/api"
import SectionHeader from "../components/SectionHeader"
import SnapshotDetailsPanel from "../components/SnapshotDetailsPanel"
import { useAppState } from "../state/appState"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Brush,
} from "recharts"
import {
  Download,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  X,
  BarChart3,
  TableProperties,
  Target,
  ChevronDown,
  ChevronUp,
  FileSearch,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type Point = {
  year: number
  month: number
  emission_id: number
  total: number
  energy: number
  transport: number
  waste: number
  water: number
  supply_chain: number
}

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n)
}

/* ─── Chart colors aligned with design system ────────────────────────────── */
const COLORS = {
  Energy: "#f59e0b",
  Transport: "#3b82f6",
  Waste: "#1a6b3c",
  Water: "#0e7870",
  "Supply chain": "#8b5cf6",
}

/* ─── Metric card ─────────────────────────────────────────────────────────── */
function MetricCard({
  label,
  value,
  delta,
  index,
}: {
  label: string
  value: number | null
  delta: number | null
  index: number
}) {
  const isDown = delta !== null && delta < 0
  const isUp = delta !== null && delta > 0
  // const isFlat = delta !== null && delta === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="rounded-2xl p-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div
        className="text-[1.5rem] font-semibold leading-none mb-2"
        style={{ color: "var(--text)", fontFamily: '"DM Mono", monospace', letterSpacing: "-0.03em" }}
      >
        {value == null ? "—" : fmt(value)}
      </div>
      {value != null && (
        <div className="text-[11px]" style={{ color: "var(--muted)" }}>kg CO₂e</div>
      )}

      {delta != null && (
        <div
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium"
          style={
            isDown
              ? { background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--primary-muted)" }
              : isUp
              ? { background: "var(--error-soft)", color: "var(--error)", border: "1px solid color-mix(in srgb, var(--error) 20%, transparent)" }
              : { background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }
          }
        >
          {isDown ? <TrendingDown className="h-3 w-3" /> : isUp ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          <span style={{ fontFamily: '"DM Mono", monospace' }}>
            {delta >= 0 ? "+" : ""}{fmt(delta)} kg
          </span>
        </div>
      )}
    </motion.div>
  )
}

/* ─── Custom tooltip ──────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-4 py-3 text-[12px] min-w-[160px]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
        color: "var(--text)",
      }}
    >
      <div className="font-semibold mb-2" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: "var(--text-secondary)" }}>{p.name}</span>
          </div>
          <span style={{ fontFamily: '"DM Mono", monospace', color: "var(--text)" }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Analytics ───────────────────────────────────────────────────────────── */
export default function Analytics() {
  const { company, year, month, snapshotLoading, emissionId, emissions, availablePeriods } = useAppState()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [series, setSeries] = useState<Point[]>([])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsEmissionId, setDetailsEmissionId] = useState<number | null>(null)
  const [showBreakdownTable, setShowBreakdownTable] = useState(false)
  const [showTargets, setShowTargets] = useState(false)
  const [targetBaselineYear, setTargetBaselineYear] = useState<number>(year)
  const [targetBaselineMonth, setTargetBaselineMonth] = useState<number>(month)
  const [targetReductionPct, setTargetReductionPct] = useState<number>(30)

  const canLoad = useMemo(() => !!company, [company])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!company) return
      setLoading(true)
      setError("")
      try {
        const res = await API.get("/emissions/timeseries", { params: { company_id: company.id } })
        const list = Array.isArray(res.data?.series) ? (res.data.series as Point[]) : []
        if (!mounted) return
        setSeries(list)
      } catch (e: any) {
        if (!mounted) return
        setError(getApiErrorMessage(e) ?? "Failed to load time series")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [company])

  const chartData = useMemo(() =>
    series.map((p) => ({
      name: `${String(p.month).padStart(2, "0")}/${p.year}`,
      Energy: p.energy,
      Transport: p.transport,
      Waste: p.waste,
      Water: p.water,
      "Supply chain": p.supply_chain,
    }))
  , [series])

  const breakdown = useMemo(() => {
    if (!emissions) return []
    return [
      { name: "Energy", value: emissions.energy_emissions, color: COLORS.Energy },
      { name: "Transport", value: emissions.transport_emissions, color: COLORS.Transport },
      { name: "Waste", value: emissions.waste_emissions, color: COLORS.Waste },
      { name: "Water", value: emissions.water_emissions, color: COLORS.Water },
      { name: "Supply chain", value: emissions.supply_chain_emissions, color: COLORS["Supply chain"] },
    ]
  }, [emissions])

  const previousPeriod = useMemo(() => {
    const sorted = [...availablePeriods].sort((a, b) => (a.year - b.year) * 100 + (a.month - b.month))
    const idx = sorted.findIndex((p) => p.year === year && p.month === month)
    if (idx > 0) return sorted[idx - 1]
    if (idx === -1 && sorted.length) return sorted[sorted.length - 1]
    return null
  }, [availablePeriods, year, month])

  const currentPoint = useMemo(() => series.find((p) => p.year === year && p.month === month) ?? null, [series, year, month])
  const previousPoint = useMemo(() => {
    if (!previousPeriod) return null
    return series.find((p) => p.year === previousPeriod.year && p.month === previousPeriod.month) ?? null
  }, [series, previousPeriod])

  const comparison = useMemo(() => {
    const curr = currentPoint
    const prev = previousPoint
    if (!curr || !prev) return null
    return {
      prevLabel: `${String(prev.month).padStart(2, "0")}/${prev.year}`,
      currLabel: `${String(curr.month).padStart(2, "0")}/${curr.year}`,
      totalDelta: curr.total - prev.total,
      energyDelta: curr.energy - prev.energy,
      transportDelta: curr.transport - prev.transport,
      wasteDelta: curr.waste - prev.waste,
      waterDelta: curr.water - prev.water,
      supplyDelta: curr.supply_chain - prev.supply_chain,
    }
  }, [currentPoint, previousPoint])

  const openDetails = (id: number | null) => {
    if (!id) return
    setDetailsEmissionId(id)
    setDetailsOpen(true)
  }

  const openDetailsForPeriod = async (p: { year: number; month: number } | null) => {
    if (!company || !p) return
    const inSeries = series.find((x) => x.year === p.year && x.month === p.month)
    if (inSeries?.emission_id) { openDetails(inSeries.emission_id); return }
    try {
      const res = await API.get("/emissions/by-period", { params: { company_id: company.id, year: p.year, month: p.month } })
      const id = typeof res.data?.emission_id === "number" ? (res.data.emission_id as number) : null
      openDetails(id)
    } catch (e: any) {
      setError(getApiErrorMessage(e) ?? "Failed to load snapshot")
    }
  }

  const exportCsv = (filename: string, rows: Record<string, any>[]) => {
    if (!rows.length) return
    const headers = Object.keys(rows[0])
    const esc = (v: any) => { const s = v == null ? "" : String(v); return s.includes(",") || s.includes('"') ? `"${s.replaceAll('"', '""')}"` : s }
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  const exportTimeseries = () => {
    exportCsv(`timeseries_${company?.id ?? "company"}.csv`, series.map((p) => ({
      year: p.year, month: p.month, emission_id: p.emission_id,
      total_kg_co2e: p.total, energy_kg: p.energy, transport_kg: p.transport,
      waste_kg: p.waste, water_kg: p.water, supply_chain_kg: p.supply_chain,
    })))
  }

  const exportCurrentBreakdown = () => {
    if (!emissions) return
    exportCsv(`breakdown_${company?.id ?? "company"}_${String(month).padStart(2, "0")}_${year}.csv`,
      breakdown.map((b) => ({
        company_id: company?.id ?? "", year, month, category: b.name, kg_co2e: b.value,
        pct_of_total: emissions.total_emissions ? Number(((b.value / emissions.total_emissions) * 100).toFixed(2)) : 0,
        emission_id: emissionId ?? "",
      }))
    )
  }

  return (
    <div className="mx-auto max-w-7xl grid gap-7">

      <SectionHeader
        eyebrow="Analytics"
        title="Trends & comparisons"
        subtitle={`Track emissions over time for ${company?.name ?? "—"}. Current context: ${String(month).padStart(2, "0")}/${year}.`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openDetails(emissionId)}
              disabled={!emissionId}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-medium transition-all duration-150 disabled:opacity-40"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--shadow-sm)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)" }}
            >
              <FileSearch className="h-3.5 w-3.5" />
              Current snapshot
            </button>
            <button
              onClick={() => openDetailsForPeriod(previousPeriod)}
              disabled={!previousPeriod}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-medium transition-all duration-150 disabled:opacity-40"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--shadow-sm)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)" }}
            >
              <FileSearch className="h-3.5 w-3.5" />
              Previous snapshot
            </button>
            <button
              onClick={exportTimeseries}
              disabled={!series.length}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-150 disabled:opacity-40"
              style={{ background: "var(--primary)", color: "#ffffff", boxShadow: "0 2px 8px rgba(26,107,60,0.25)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-hover)" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--primary)" }}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        }
      />

      {/* Alerts */}
      <AnimatePresence>
        {!canLoad && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px]"
            style={{ background: "var(--warning-soft)", border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)", color: "var(--warning)" }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Select a company in the top bar to view trends.
          </motion.div>
        )}
        {!!error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-[13px]"
            style={{ background: "var(--error-soft)", border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)", color: "var(--error)" }}
          >
            <span>{error}</span>
            <button onClick={() => setError("")}><X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <SnapshotDetailsPanel
        open={detailsOpen}
        emissionId={detailsEmissionId}
        onClose={() => setDetailsOpen(false)}
        title={`${company?.name ?? "Snapshot"} · ${String(month).padStart(2, "0")}/${year}`}
      />

      {/* ── Period comparison metrics ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Period comparison</div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
              Current period vs previous available month
            </div>
          </div>
          {comparison && (
            <span
              className="text-[12px] font-medium px-3 py-1 rounded-lg shrink-0"
              style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)", fontFamily: '"DM Mono", monospace' }}
            >
              {comparison.prevLabel} → {comparison.currLabel}
            </span>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total", value: emissions?.total_emissions ?? null, delta: comparison?.totalDelta ?? null },
            { label: "Energy", value: emissions?.energy_emissions ?? null, delta: comparison?.energyDelta ?? null },
            { label: "Transport", value: emissions?.transport_emissions ?? null, delta: comparison?.transportDelta ?? null },
            { label: "Waste", value: emissions?.waste_emissions ?? null, delta: comparison?.wasteDelta ?? null },
            { label: "Water", value: emissions?.water_emissions ?? null, delta: comparison?.waterDelta ?? null },
            { label: "Supply chain", value: emissions?.supply_chain_emissions ?? null, delta: comparison?.supplyDelta ?? null },
          ].map((m, i) => (
            <MetricCard key={m.label} label={m.label} value={m.value} delta={m.delta} index={i} />
          ))}
        </div>
      </div>

      {/* ── Timeseries chart ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Emissions over time</div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
              Monthly snapshot history — stacked by category
            </div>
          </div>
          <span
            className="text-[12px] px-3 py-1 rounded-lg"
            style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
          >
            {loading || snapshotLoading ? "Loading…" : `${series.length} months`}
          </span>
        </div>

        <div style={{ height: 360 }}>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {Object.entries(COLORS).map(([key, color]) => (
                    <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.04} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: '"DM Mono", monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: '"DM Mono", monospace' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)", paddingTop: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
                {Object.entries(COLORS).map(([key, color]) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#grad-${key})`}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
                <Brush
                  height={22}
                  travellerWidth={8}
                  stroke="var(--border-strong)"
                  fill="var(--surface-2)"
                  style={{ fontSize: 10 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="h-full grid place-items-center rounded-xl text-[13px] text-center"
              style={{ background: "var(--surface-2)", border: "1px dashed var(--border-strong)", color: "var(--muted)" }}
            >
              <div>
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" style={{ color: "var(--primary)" }} />
                <p>{canLoad ? "No monthly history yet. Calculate snapshots in Dashboard to build trends." : "Select a company."}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Current period breakdown ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Current period breakdown</div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
              Composition for {String(month).padStart(2, "0")}/{year}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBreakdownTable((v) => !v)}
              disabled={!emissions}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-all duration-150 disabled:opacity-40"
              style={{
                background: showBreakdownTable ? "var(--primary-soft)" : "var(--surface-2)",
                border: `1px solid ${showBreakdownTable ? "var(--primary-muted)" : "var(--border)"}`,
                color: showBreakdownTable ? "var(--primary)" : "var(--text-secondary)",
              }}
            >
              {showBreakdownTable ? <BarChart3 className="h-3.5 w-3.5" /> : <TableProperties className="h-3.5 w-3.5" />}
              {showBreakdownTable ? "Chart" : "Table"}
            </button>
            <button
              onClick={exportCurrentBreakdown}
              disabled={!emissions}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-all duration-150 disabled:opacity-40"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        {!emissions ? (
          <div
            className="rounded-xl px-4 py-3 text-[13px]"
            style={{ background: "var(--warning-soft)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)", color: "var(--warning)" }}
          >
            No snapshot loaded for the current period. Calculate or select a saved period in Dashboard.
          </div>
        ) : !showBreakdownTable ? (
          /* Pie chart */
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {breakdown.map((b) => <Cell key={b.name} fill={b.color} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0]
                    return (
                      <div className="rounded-xl px-3 py-2 text-[12px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                        <div className="font-semibold mb-1" style={{ color: "var(--text)" }}>{p.name}</div>
                        <div style={{ color: "var(--muted)", fontFamily: '"DM Mono", monospace' }}>{fmt(Number(p.value))} kg CO₂e</div>
                      </div>
                    )
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-2">
              {breakdown.map((b) => {
                const pct = emissions.total_emissions ? (b.value / emissions.total_emissions) * 100 : 0
                return (
                  <div key={b.name} className="grid gap-1">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: b.color }} />
                        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{b.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ color: "var(--muted)", fontFamily: '"DM Mono", monospace', fontSize: 11 }}>{fmt(b.value)} kg</span>
                        <span className="w-10 text-right" style={{ color: "var(--text)", fontFamily: '"DM Mono", monospace', fontSize: 11 }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: b.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Table view */
          <div className="overflow-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                  {["Category", "kg CO₂e", "% of total"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider ${h !== "Category" ? "text-right" : "text-left"}`} style={{ color: "var(--muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b, i) => {
                  const pct = emissions.total_emissions ? (b.value / emissions.total_emissions) * 100 : 0
                  return (
                    <tr
                      key={b.name}
                      style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                          <span style={{ color: "var(--text)", fontWeight: 500 }}>{b.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "var(--text)", fontFamily: '"DM Mono", monospace' }}>
                        {fmt(b.value)}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "var(--muted)", fontFamily: '"DM Mono", monospace' }}>
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
                <tr style={{ background: "var(--primary-soft)", borderTop: "2px solid var(--primary-muted)" }}>
                  <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: "var(--primary)" }}>Total</td>
                  <td className="px-4 py-3 text-right text-[13px] font-semibold" style={{ color: "var(--primary)", fontFamily: '"DM Mono", monospace' }}>
                    {fmt(emissions.total_emissions)}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] font-semibold" style={{ color: "var(--primary)", fontFamily: '"DM Mono", monospace' }}>
                    100%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Targets ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <button
          className="w-full flex items-center justify-between px-5 py-4 transition-colors"
          onClick={() => setShowTargets((v) => !v)}
          style={{ borderBottom: showTargets ? "1px solid var(--border)" : "none" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
        >
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" style={{ color: "var(--primary)" }} />
            <div className="text-left">
              <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Targets & trajectory</div>
              <div className="text-[11px]" style={{ color: "var(--muted)" }}>Configure reduction targets</div>
            </div>
          </div>
          {showTargets
            ? <ChevronUp className="h-4 w-4" style={{ color: "var(--muted)" }} />
            : <ChevronDown className="h-4 w-4" style={{ color: "var(--muted)" }} />
          }
        </button>

        <AnimatePresence>
          {showTargets && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 py-4 grid gap-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { label: "Baseline year", value: targetBaselineYear, set: (v: number) => setTargetBaselineYear(v), min: 2000, max: 2100 },
                    { label: "Baseline month", value: targetBaselineMonth, set: (v: number) => setTargetBaselineMonth(v), min: 1, max: 12 },
                    { label: "Reduction target (%)", value: targetReductionPct, set: (v: number) => setTargetReductionPct(v), min: 0, max: 95 },
                  ].map(({ label, value, set, min, max }) => (
                    <label key={label} className="grid gap-1.5">
                      <span className="text-[12.5px] font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => set(Math.max(min, Math.min(max, Math.floor(Number(e.target.value) || value))))}
                        className="h-9 rounded-lg px-3 text-[13px] outline-none transition-all duration-150"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: '"DM Mono", monospace' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,107,60,0.10)" }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none" }}
                      />
                    </label>
                  ))}
                </div>
                <div
                  className="rounded-xl px-4 py-3 text-[12.5px]"
                  style={{ background: "var(--warning-soft)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)", color: "var(--warning)" }}
                >
                  Coming soon: baseline lookup from saved snapshots and target tracking over time.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}