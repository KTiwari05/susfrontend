import { useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import API from "../api/api"
import KpiCard from "./KpiCard"

type SeriesPoint = {
  year: number
  month: number
  emission_id: number
  total: number
  energy: number
  transport: number
  waste: number
  water: number
  supply_chain: number
  packaging?: number | null
  retail_operations?: number | null
  procurement?: number | null
}

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n)
}

function ymKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`
}

export default function DashboardInsights({
  companyId,
  selectedYear,
  selectedMonth,
  snapshot,
}: {
  companyId: number | null
  selectedYear: number
  selectedMonth: number
  snapshot: any | null
}) {
  const [series, setSeries] = useState<SeriesPoint[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!companyId) {
        setSeries([])
        return
      }
      setLoading(true)
      try {
        const res = await API.get(`/emissions/timeseries?company_id=${companyId}`)
        const rows: SeriesPoint[] = Array.isArray(res.data?.series) ? res.data.series : []
        if (!mounted) return
        setSeries(rows)
      } catch {
        if (!mounted) return
        setSeries([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [companyId])

  const last12 = useMemo(() => {
    if (!series.length) return []
    const sorted = [...series].sort((a, b) => (a.year - b.year) || (a.month - b.month))
    return sorted.slice(Math.max(0, sorted.length - 12))
  }, [series])

  const currentPoint = useMemo(() => {
    const key = ymKey(selectedYear, selectedMonth)
    const hit = series.find((p) => ymKey(p.year, p.month) === key)
    return hit ?? null
  }, [series, selectedYear, selectedMonth])

  const prevPoint = useMemo(() => {
    if (!currentPoint) return null
    const sorted = [...series].sort((a, b) => (a.year - b.year) || (a.month - b.month))
    const idx = sorted.findIndex((p) => p.year === currentPoint.year && p.month === currentPoint.month)
    if (idx <= 0) return null
    return sorted[idx - 1]
  }, [series, currentPoint])

  const kpis = useMemo(() => {
    const baseTotal = snapshot?.total_emissions ?? currentPoint?.total ?? null
    const prevTotal = prevPoint?.total ?? null
    const totalDelta = baseTotal != null && prevTotal != null && prevTotal > 0 ? ((baseTotal - prevTotal) / prevTotal) * 100 : undefined

    const scope3 = (snapshot?.supply_chain_emissions ?? currentPoint?.supply_chain ?? 0) + (snapshot?.procurement_emissions ?? currentPoint?.procurement ?? 0)

    const retailOps = snapshot?.retail_operations_emissions ?? currentPoint?.retail_operations ?? null
    const packaging = snapshot?.packaging_emissions ?? currentPoint?.packaging ?? null

    return {
      total: { value: baseTotal, delta: typeof totalDelta === "number" ? totalDelta : undefined },
      scope3: { value: scope3 },
      retailOps: { value: retailOps },
      packaging: { value: packaging },
    }
  }, [snapshot, currentPoint, prevPoint])

  const categoryBars = useMemo(() => {
    const src = snapshot || currentPoint
    if (!src) return []

    const rows = [
      { name: "Energy", value: Number(src.energy_emissions ?? src.energy ?? 0) },
      { name: "Transport", value: Number(src.transport_emissions ?? src.transport ?? 0) },
      { name: "Waste", value: Number(src.waste_emissions ?? src.waste ?? 0) },
      { name: "Water", value: Number(src.water_emissions ?? src.water ?? 0) },
      { name: "Supply chain", value: Number(src.supply_chain_emissions ?? src.supply_chain ?? 0) },
      { name: "Packaging", value: Number(src.packaging_emissions ?? src.packaging ?? 0) },
      { name: "Retail operations", value: Number(src.retail_operations_emissions ?? src.retail_operations ?? 0) },
      { name: "Procurement", value: Number(src.procurement_emissions ?? src.procurement ?? 0) },
    ]

    return rows.filter((r) => Number.isFinite(r.value) && r.value > 0).sort((a, b) => b.value - a.value)
  }, [snapshot, currentPoint])

  const trendData = useMemo(() => {
    return last12.map((p) => ({
      period: `${String(p.month).padStart(2, "0")}/${p.year}`,
      total: p.total,
      energy: p.energy,
      transport: p.transport,
      supply_chain: p.supply_chain,
      packaging: p.packaging ?? 0,
      retail_operations: p.retail_operations ?? 0,
      procurement: p.procurement ?? 0,
    }))
  }, [last12])

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }} className="dash-kpis">
        <KpiCard
          label="Total emissions"
          value={kpis.total.value == null ? "—" : fmt(kpis.total.value)}
          unit="kg CO₂e"
          delta={typeof kpis.total.delta === "number" ? kpis.total.delta : undefined}
          tone={typeof kpis.total.delta === "number" && kpis.total.delta > 0 ? "warn" : "neutral"}
        />
        <KpiCard
          label="Scope 3 (supply + procurement)"
          value={fmt(kpis.scope3.value)}
          unit="kg CO₂e"
        />
        <KpiCard
          label="Retail operations"
          value={kpis.retailOps.value == null ? "—" : fmt(kpis.retailOps.value)}
          unit="kg CO₂e"
        />
        <KpiCard
          label="Packaging"
          value={kpis.packaging.value == null ? "—" : fmt(kpis.packaging.value)}
          unit="kg CO₂e"
        />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1.4fr 1fr" }} className="dash-insights-grid">
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: 16,
            minHeight: 240,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>12-month trend</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{loading ? "Loading…" : "Total + major drivers"}</div>
            </div>
          </div>

          {trendData.length ? (
            <div style={{ width: "100%", height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fill: "var(--muted)", fontSize: 10 }} interval={Math.max(0, trendData.length - 6)} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="total" name="Total" stroke="#2563eb" fill="url(#totalFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="supply_chain" name="Supply chain" stroke="#8b5cf6" fillOpacity={0.08} fill="#8b5cf6" />
                  <Area type="monotone" dataKey="procurement" name="Procurement" stroke="#f43f5e" fillOpacity={0.06} fill="#f43f5e" />
                  <Area type="monotone" dataKey="retail_operations" name="Retail ops" stroke="#06b6d4" fillOpacity={0.06} fill="#06b6d4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{
              height: 190,
              display: "grid",
              placeItems: "center",
              borderRadius: 12,
              border: "1px dashed var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--muted)",
              fontSize: 12.5,
              textAlign: "center",
              padding: 12,
            }}>
              {companyId ? "No historical data loaded yet." : "Select a company to see trends."}
            </div>
          )}
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: 16,
            minHeight: 240,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Drivers (this period)</div>

          {categoryBars.length ? (
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBars} layout="vertical" margin={{ top: 6, right: 12, left: 6, bottom: 6 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} width={92} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" }} />
                  <Bar dataKey="value" name="kg CO₂e" fill="#2563eb" radius={[6, 6, 6, 6]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{
              height: 200,
              display: "grid",
              placeItems: "center",
              borderRadius: 12,
              border: "1px dashed var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--muted)",
              fontSize: 12.5,
              textAlign: "center",
              padding: 12,
            }}>
              {snapshot ? "No non-zero drivers found." : "Calculate a snapshot to see drivers."}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .dash-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .dash-insights-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
