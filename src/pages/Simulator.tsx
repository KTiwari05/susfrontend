import { useMemo, useState } from "react"
import {
  Play, Zap, Car, Plane, Recycle, Factory, Gauge,
  TrendingDown, TrendingUp, Leaf, AlertTriangle,
  CheckCircle2, X, RotateCcw, Flame, ChevronRight,
  Target,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type React from "react"
import API, { getApiErrorMessage } from "../api/api"
import SectionHeader from "../components/SectionHeader"
import SimulationSlider from "../components/SimulationSlider"
import CategoryTab from "../components/CategoryTab"
import LeverChip from "../components/LeverChip"
import { useAppState } from "../state/appState"

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n)
}

type SliderState = {
  renewable: number
  evFleet: number
  flightReduction: number
  recycling: number
  supplier: number
  efficiency: number
}

type ActionPlanItem = {
  id: string
  title: string
  summary: string
  why: string
  effort: "Low" | "Medium" | "High"
  time: "0-3 mo" | "3-9 mo" | "9-24 mo"
  levers: Partial<SliderState>
  estReductionKg: number
  estReductionPct: number
}

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" }) {
  const style: React.CSSProperties =
    tone === "good"
      ? { background: "var(--primary-soft)", border: "1px solid var(--primary-muted)", color: "var(--primary)" }
      : tone === "warn"
      ? { background: "var(--warning-soft)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)", color: "var(--warning)" }
      : { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      ...style,
    }}>
      {children}
    </span>
  )
}

function applyLeverPreset(
  base: SliderState,
  patch: Partial<SliderState>
): SliderState {
  return { ...base, ...patch }
}

function clampPct(x: number) {
  return Math.max(0, Math.min(100, x))
}

function ReductionMeter({ pct }: { pct: number | null }) {
  const value = pct == null ? null : clampPct(Number(pct))
  const size = 110
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = value == null ? 0 : (value / 100) * c

  return (
    <div style={{
      width: size,
      flexShrink: 0,
      display: "grid",
      placeItems: "center",
      position: "relative",
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
          opacity={0.9}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 220ms ease" }}
          opacity={value == null ? 0.35 : 1}
        />
      </svg>

      <div style={{
        position: "absolute",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        gap: 2,
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)" }}>
          {value == null ? "—" : `${value.toFixed(0)}%`}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
          reduction
        </div>
      </div>
    </div>
  )
}

function estimateReductionsFromLevers(emissions: any, levers: Partial<SliderState>) {
  const renewable = clampPct(levers.renewable ?? 0)
  const efficiency = clampPct(levers.efficiency ?? 0)
  const evFleet = clampPct(levers.evFleet ?? 0)
  const flightReduction = clampPct(levers.flightReduction ?? 0)
  const recycling = clampPct(levers.recycling ?? 0)
  const supplier = clampPct(levers.supplier ?? 0)

  const energy = Number(emissions?.energy_emissions ?? 0)
  const transport = Number(emissions?.transport_emissions ?? 0)
  const waste = Number(emissions?.waste_emissions ?? 0)
  const supply = Number(emissions?.supply_chain_emissions ?? 0)
  const packaging = Number(emissions?.packaging_emissions ?? 0)
  const retailOps = Number(emissions?.retail_operations_emissions ?? 0)
  const procurement = Number(emissions?.procurement_emissions ?? 0)
  const total = Number(emissions?.total_emissions ?? (energy + transport + waste + Number(emissions?.water_emissions ?? 0) + supply + packaging + retailOps + procurement))

  const energyRenewable = energy * (renewable / 100) * 0.8
  const energyEfficiency = (energy - energyRenewable) * (efficiency / 100) * 0.5

  const transportEv = transport * (evFleet / 100) * 0.6
  const transportAfterEv = transport - transportEv
  const transportFlight = transportAfterEv * (flightReduction / 100) * 0.4

  const wasteRecycling = waste * (recycling / 100) * 0.7
  const supplySupplier = supply * (supplier / 100) * 0.5
  const procurementSupplier = procurement * (supplier / 100) * 0.35

  const retailEff = retailOps * (efficiency / 100) * 0.35
  const retailAfterEff = retailOps - retailEff
  const retailRenewable = retailAfterEff * (renewable / 100) * 0.5

  const packagingRecycling = packaging * (recycling / 100) * 0.15

  const kg =
    energyRenewable +
    energyEfficiency +
    transportEv +
    transportFlight +
    wasteRecycling +
    supplySupplier +
    procurementSupplier +
    retailEff +
    retailRenewable +
    packagingRecycling

  const pct = total > 0 ? (kg / total) * 100 : 0
  return { kg, pct }
}

const LEVER_GROUPS: {
  key: string
  group: string
  icon: React.ReactNode
  color: string
  bg: string
  levers: { key: keyof SliderState; label: string; hint: string; icon: React.ReactNode }[]
}[] = [
  {
    key: "energy",
    group: "Energy",
    icon: <Zap size={18} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    levers: [
      { key: "renewable", label: "Renewable electricity", hint: "Increase clean energy procurement", icon: <Zap size={15} /> },
      { key: "efficiency", label: "Energy efficiency", hint: "Retrofits, controls, optimization", icon: <Gauge size={15} /> },
    ],
  },
  {
    key: "transport",
    group: "Transport",
    icon: <Car size={18} />,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.10)",
    levers: [
      { key: "evFleet", label: "EV fleet transition", hint: "Electrify vehicles and logistics", icon: <Car size={15} /> },
      { key: "flightReduction", label: "Flight reduction", hint: "Cut travel, switch to rail", icon: <Plane size={15} /> },
    ],
  },
  {
    key: "waste",
    group: "Waste & Supply",
    icon: <Recycle size={18} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    levers: [
      { key: "recycling", label: "Waste recycling", hint: "Circular practices, diversion", icon: <Recycle size={15} /> },
      { key: "supplier", label: "Supplier sustainability", hint: "Lower Scope 3 engagement", icon: <Factory size={15} /> },
    ],
  },
]

const ALL_LEVER_KEYS = LEVER_GROUPS.flatMap((g) => g.levers.map((l) => ({ ...l, color: g.color })))

const DEFAULT_SLIDERS: SliderState = {
  renewable: 40,
  evFleet: 30,
  flightReduction: 20,
  recycling: 50,
  supplier: 30,
  efficiency: 25,
}

const SCENARIOS: { name: string; emoji: string; desc: string; values: SliderState }[] = [
  {
    name: "Quick wins",
    emoji: "⚡",
    desc: "Efficiency + recycling + flight reduction",
    values: { renewable: 20, evFleet: 15, flightReduction: 40, recycling: 60, supplier: 20, efficiency: 35 },
  },
  {
    name: "Renewables first",
    emoji: "☀️",
    desc: "Maximize clean energy & electrification",
    values: { renewable: 90, evFleet: 70, flightReduction: 20, recycling: 30, supplier: 25, efficiency: 50 },
  },
  {
    name: "Scope 3 focus",
    emoji: "🔗",
    desc: "Supplier roadmap + data engagement",
    values: { renewable: 30, evFleet: 20, flightReduction: 25, recycling: 40, supplier: 85, efficiency: 30 },
  },
]

/* ═══════════════════════════════════════════════
   SIMULATOR PAGE
═══════════════════════════════════════════════ */
export default function Simulator() {
  const { emissionId, simulationResult, setSimulationResult, emissions } = useAppState()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [activeGroup, setActiveGroup] = useState(0)
  const [sliders, setSliders] = useState<SliderState>(DEFAULT_SLIDERS)
  const [strategyOpen, setStrategyOpen] = useState(true)

  const actionPlan = useMemo(() => {
    if (!emissions) return null

    const rows = [
      ["Energy", emissions.energy_emissions],
      ["Transport", emissions.transport_emissions],
      ["Waste", emissions.waste_emissions],
      ["Water", emissions.water_emissions],
      ["Supply chain", emissions.supply_chain_emissions],
      ["Packaging", (emissions as any).packaging_emissions ?? 0],
      ["Retail operations", (emissions as any).retail_operations_emissions ?? 0],
      ["Procurement", (emissions as any).procurement_emissions ?? 0],
    ] as const
    const top = [...rows].sort((a, b) => (Number(b[1] ?? 0) - Number(a[1] ?? 0))).slice(0, 3)

    const candidates: Omit<ActionPlanItem, "estReductionKg" | "estReductionPct">[] = [
      {
        id: "efficiency",
        title: "Energy + retail efficiency sprint",
        summary: "Controls, retrofits, HVAC scheduling, refrigeration tuning.",
        why: "Fastest way to cut operational emissions without changing demand.",
        effort: "Low",
        time: "0-3 mo",
        levers: { efficiency: 45 },
      },
      {
        id: "renewables",
        title: "Renewables procurement",
        summary: "Increase renewable electricity share via contracts / RECs.",
        why: "Large impact if Energy or Retail ops is a hotspot.",
        effort: "Medium",
        time: "3-9 mo",
        levers: { renewable: 80 },
      },
      {
        id: "logistics",
        title: "Logistics decarbonization",
        summary: "EV transition + routing + fewer flights.",
        why: "Reduces Transport quickly; improves resilience against fuel volatility.",
        effort: "Medium",
        time: "3-9 mo",
        levers: { evFleet: 55, flightReduction: 40 },
      },
      {
        id: "supplier",
        title: "Scope 3 supplier program",
        summary: "Supplier targets, contracts, primary data, and preferred suppliers.",
        why: "If Supply chain / Procurement dominate, this is your biggest lever.",
        effort: "High",
        time: "9-24 mo",
        levers: { supplier: 70 },
      },
      {
        id: "circular",
        title: "Packaging + circularity program",
        summary: "Increase recycled content + lightweighting + recycling partnerships.",
        why: "Reduces Packaging/Waste and improves brand + compliance posture.",
        effort: "Medium",
        time: "3-9 mo",
        levers: { recycling: 70 },
      },
    ]

    const enriched: ActionPlanItem[] = candidates
      .map((c) => {
        const est = estimateReductionsFromLevers(emissions, c.levers)
        return {
          ...c,
          estReductionKg: est.kg,
          estReductionPct: est.pct,
        }
      })
      .sort((a, b) => b.estReductionKg - a.estReductionKg)

    const currentEst = estimateReductionsFromLevers(emissions, sliders)

    const totalEmissions = Number(emissions?.total_emissions ?? rows.reduce((s, r) => s + Number(r[1] ?? 0), 0))
    const topCategory = top[0]?.[0] ?? "Emissions"
    const topValue = Number(top[0]?.[1] ?? 0)
    const topShare = totalEmissions > 0 ? (topValue / totalEmissions) * 100 : 0

    const underused: string[] = []
    if (sliders.renewable < 45) underused.push("renewables")
    if (sliders.efficiency < 35) underused.push("efficiency")
    if (sliders.evFleet < 35) underused.push("EV fleet")
    if (sliders.flightReduction < 25) underused.push("flight reduction")
    if (sliders.recycling < 45) underused.push("recycling")
    if (sliders.supplier < 35) underused.push("supplier program")

    const topMoves = enriched.slice(0, 2).map((i) => i.title)

    const insights = [
      {
        title: "Primary hotspot",
        detail: `${topCategory} contributes ~${topShare.toFixed(0)}% of total emissions. Prioritize actions that attack this first.`,
      },
      {
        title: "Best near-term moves",
        detail: topMoves.length ? `${topMoves.join(" and ")} deliver the highest modeled impact right now.` : "No high-impact moves available yet.",
      },
      {
        title: underused.length ? "Underused levers" : "Balanced lever mix",
        detail: underused.length
          ? `Increase ${underused.slice(0, 3).join(", ")} to improve short-term reduction depth.`
          : "Your current lever mix is balanced. Focus on execution and measurement.",
      },
    ]

    return {
      top,
      items: enriched,
      currentEst,
      insights,
    }
  }, [emissions, sliders])

  const set = (key: keyof SliderState) => (v: number) => setSliders(s => ({ ...s, [key]: v }))
  const resetSliders = () => setSliders(DEFAULT_SLIDERS)
  const applyScenario = (s: typeof SCENARIOS[0]) => setSliders(s.values as SliderState)
  const canRun = useMemo(() => typeof emissionId === "number", [emissionId])
  const currentGroup = LEVER_GROUPS[activeGroup] as (typeof LEVER_GROUPS)[number]

  const runSimulation = async () => {
    if (!canRun || emissionId == null) return
    setLoading(true)
    setError("")
    try {
      const res = await API.post("/simulation/run", {
        emission_id: emissionId,
        renewable_percentage: sliders.renewable,
        ev_fleet_percentage: sliders.evFleet,
        flight_reduction_percentage: sliders.flightReduction,
        waste_recycling_percentage: sliders.recycling,
        supplier_sustainability_percentage: sliders.supplier,
        energy_efficiency_percentage: sliders.efficiency,
      })
      setSimulationResult(res.data)
    } catch (e: any) {
      setError(getApiErrorMessage(e) ?? "Failed to run simulation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "grid", gap: 28 }}>

      {/* ── Header ── */}
      <SectionHeader
        eyebrow="Decarbonization Simulator"
        title="Model strategy levers"
        // subtitle={`Tune interventions for ${company?.name ?? "your company"} (${String(month).padStart(2, "0")}/${year}) and model emissions reduction, sustainability score, and cost impact.`}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SimBtn onClick={resetSliders} variant="ghost">
              <RotateCcw size={13} /> Reset
            </SimBtn>
            <SimBtn onClick={runSimulation} disabled={!canRun || loading} variant="primary">
              <Play size={13} /> {loading ? "Running…" : "Run simulation"}
            </SimBtn>
          </div>
        }
      />

      {/* ── Alerts ── */}
      <AnimatePresence>
        {!canRun && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, fontSize: 13, background: "var(--warning-soft)", border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)", color: "var(--warning)" }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            Go to Dashboard and calculate an emissions snapshot before running simulations.
          </motion.div>
        )}
        {!!error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px", borderRadius: 10, fontSize: 13, background: "var(--error-soft)", border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)", color: "var(--error)" }}
          >
            <span>{error}</span>
            <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", padding: 2 }}>
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          MAIN GRID
          Left (levers): fills space
          Right (outcome): fixed comfortable width
      ══════════════════════════════════════════════ */}
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr minmax(300px, 380px)", alignItems: "start" }}
        className="sim-grid"
      >

        {/* ── LEFT: Levers ── */}
        <div style={{ display: "grid", gap: 16 }}>

          {/* ── Category tabs + sliders card ── */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}>
            {/* Card header */}
            <div style={{
              padding: "18px 20px 14px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>
                  Strategy levers
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                  Tune interventions then run simulation
                </div>
              </div>
              {/* Active group dots */}
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {LEVER_GROUPS.map((g, i) => (
                  <motion.div
                    key={g.key}
                    animate={{ scale: i === activeGroup ? 1.5 : 1, opacity: i === activeGroup ? 1 : 0.35 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    style={{ width: 6, height: 6, borderRadius: 99, background: g.color }}
                  />
                ))}
              </div>
            </div>

            {/* Category tabs */}
            <div style={{ padding: "12px 16px 0", display: "flex", gap: 4, overflowX: "auto" }}>
              {LEVER_GROUPS.map((g, i) => (
                <CategoryTab
                  key={g.key}
                  group={g.group}
                  icon={g.icon}
                  color={g.color}
                  bg={g.bg}
                  active={activeGroup === i}
                  onClick={() => setActiveGroup(i)}
                />
              ))}
            </div>

            {/* Active group sliders */}
            <div style={{ padding: "16px 20px 20px" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeGroup}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}
                  className="sliders-grid"
                >
                  {currentGroup.levers.map((lever) => {
                    const k = lever.key as keyof SliderState
                    return (
                      <SimulationSlider
                        key={String(k)}
                        label={lever.label}
                        value={sliders[k]}
                        onChange={set(k)}
                        hint={lever.hint}
                        icon={lever.icon}
                        color={currentGroup.color}
                      />
                    )
                  })}
                </motion.div>
              </AnimatePresence>

              {/* All-levers summary strip */}
              <div style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 10,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                display: "flex", flexWrap: "wrap", gap: 6,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", alignSelf: "center", marginRight: 4 }}>
                  All levers
                </span>
                {Object.entries(sliders).map(([key, val]) => {
                  const meta = ALL_LEVER_KEYS.find(l => l.key === key)
                  const groupIdx = LEVER_GROUPS.findIndex(g => g.levers.some(l => l.key === key))
                  return (
                    <LeverChip
                      key={key}
                      label={meta?.label.split(" ")[0] ?? key}
                      value={val}
                      color={meta?.color ?? "var(--primary)"}
                      onClick={() => { if (groupIdx !== -1) setActiveGroup(groupIdx) }}
                    />
                  )
                })}
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT: Outcome panel ── */}
        <div className="sim-right" style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            boxShadow: "var(--shadow-sm)",
            padding: "20px",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Ambient glow */}
            {simulationResult && (
              <div style={{
                position: "absolute", top: -40, right: -40, width: 160, height: 160,
                borderRadius: "50%",
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                filter: "blur(40px)", pointerEvents: "none",
              }} />
            )}

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>Modeled outcome</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                  Emission ID: <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11 }}>{emissionId ?? "—"}</span>
                </div>
              </div>
              <AnimatePresence>
                {simulationResult && (
                  <motion.span
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "3px 10px", borderRadius: 8, flexShrink: 0,
                      background: "var(--primary-soft)", color: "var(--primary)",
                      border: "1px solid var(--primary-muted)",
                      fontSize: 11, fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 size={11} />
                    Computed
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Meter + metrics */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <ReductionMeter pct={simulationResult?.carbon_reduction_percentage ?? null} />

              <div style={{ flex: 1, display: "grid", gap: 8 }}>
                <OutcomeRow label="Baseline"      value={emissions ? fmt(emissions.total_emissions) : "—"}                                  unit="kg CO₂e" icon={<Flame size={13} />} />
                <OutcomeRow label="After strategy" value={simulationResult ? fmt(simulationResult.new_total_emissions) : "—"}                unit="kg CO₂e" highlight={!!simulationResult} icon={<TrendingDown size={13} />} />
                <OutcomeRow label="Reduction"      value={simulationResult ? `${simulationResult.carbon_reduction_percentage.toFixed(1)}%` : "—"} highlight={!!simulationResult} icon={<TrendingDown size={13} />} />
                <OutcomeRow label="Score"          value={simulationResult ? String(simulationResult.sustainability_score) : "—"}             icon={<Leaf size={13} />} />
                <OutcomeRow label="Cost impact"    value={simulationResult ? fmt(simulationResult.estimated_cost_impact) : "—"}               icon={<TrendingUp size={13} />} />
              </div>
            </div>

            {/* Footnote */}
            <div style={{
              marginTop: 14,
              padding: "8px 12px", borderRadius: 8,
              background: "var(--surface-2)", border: "1px solid var(--border)",
              fontSize: 11, color: "var(--muted)", lineHeight: 1.5,
            }}>
              Cost and reduction logic is heuristic. Use for stakeholder tradeoff exploration.
            </div>
          </div>

        </div>
      </div>

      {/* ── Scenario presets ── */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        boxShadow: "var(--shadow-sm)",
        padding: "18px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>Scenario presets</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Apply a decarbonization playbook instantly</div>
          </div>
          <Target size={15} style={{ color: "var(--muted)" }} />
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, 1fr)" }} className="scenarios-grid">
          {SCENARIOS.map(s => (
            <ScenarioCard key={s.name} scenario={s} onApply={() => applyScenario(s)} />
          ))}
        </div>
      </div>

      {/* ── Action plan ── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setStrategyOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            background: "var(--surface-2)",
            borderBottom: strategyOpen ? "1px solid var(--border)" : "none",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Leaf size={15} style={{ color: "var(--primary)" }} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Action plan</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Prioritized initiatives you can apply to levers</div>
            </div>
          </div>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>{strategyOpen ? "Hide" : "Show"}</span>
        </button>

        <AnimatePresence>
          {strategyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ padding: "14px 16px", display: "grid", gap: 12 }}>
                {!actionPlan ? (
                  <div style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--warning-soft)",
                    border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)",
                    color: "var(--warning)",
                    fontSize: 12.5,
                  }}>
                    Calculate or load a snapshot in Dashboard to unlock strategy guidance.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{
                      padding: "12px 12px",
                      borderRadius: 12,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      display: "grid",
                      gap: 8,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
                          Hotspots
                        </div>
                        <Tag tone="neutral">Current levers est. −{actionPlan.currentEst.pct.toFixed(1)}%</Tag>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                        {actionPlan.top.map((t) => `${t[0]} (${fmt(Number(t[1] ?? 0))} kg)`).join(" · ")}
                      </div>
                    </div>

                    <div className="ai-insights-grid" style={{ display: "grid", gap: 10 }}>
                      {actionPlan.insights.map((insight) => (
                        <div
                          key={insight.title}
                          style={{
                            padding: "12px 12px",
                            borderRadius: 12,
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            display: "grid",
                            gap: 6,
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
                            AI insight
                          </div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{insight.title}</div>
                          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            {insight.detail}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="action-grid" style={{ display: "grid", gap: 12 }}>
                      {actionPlan.items.map((it) => {
                        const tone = it.estReductionPct >= 8 ? "good" : it.estReductionPct >= 4 ? "neutral" : "warn"
                        return (
                          <div key={it.id} style={{
                            padding: "12px 12px",
                            borderRadius: 14,
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            display: "grid",
                            gap: 8,
                          }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>{it.title}</div>
                                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.45 }}>{it.summary}</div>
                              </div>
                              <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                                <Tag tone={tone as any}>Est. −{it.estReductionPct.toFixed(1)}%</Tag>
                                <span style={{ fontSize: 12, fontWeight: 800, fontFamily: '"DM Mono", monospace', color: "var(--text)" }}>
                                  −{fmt(it.estReductionKg)}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                              <Tag tone="neutral">Effort: {it.effort}</Tag>
                              <Tag tone="neutral">Time: {it.time}</Tag>
                              {Object.entries(it.levers).map(([k, v]) => (
                                <Tag key={k} tone="neutral">{k}:{v}%</Tag>
                              ))}
                              <ChevronRight size={13} style={{ color: "var(--muted)" }} />
                            </div>

                            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                              <span style={{ color: "var(--muted)", fontWeight: 700 }}>Why:</span> {it.why}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                              <SimBtn
                                variant="ghost"
                                onClick={() => setSliders((s) => applyLeverPreset(s, it.levers))}
                              >
                                Apply to levers
                              </SimBtn>
                              <SimBtn
                                variant="primary"
                                onClick={() => {
                                  setSliders((s) => applyLeverPreset(s, it.levers))
                                  runSimulation()
                                }}
                                disabled={!canRun || loading}
                              >
                                Apply + run
                              </SimBtn>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Responsive breakpoints */}
      <style>{`
        @media (max-width: 900px) {
          .sim-grid { grid-template-columns: 1fr !important; }
          .scenarios-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .sliders-grid { grid-template-columns: 1fr !important; }
        }
        .action-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .ai-insights-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        @media (max-width: 1100px) {
          .ai-insights-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 980px) {
          .action-grid { grid-template-columns: 1fr; }
          .ai-insights-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function OutcomeRow({ label, value, unit, icon, highlight }: { 
  label: string; 
  value: string; 
  unit?: string; 
  icon?: React.ReactNode; 
  highlight?: boolean 
}) {
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between", 
      gap: 8,
      padding: "4px 0"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ 
          fontSize: 12, 
          fontWeight: 600, 
          color: highlight ? "var(--primary)" : "var(--text)",
          fontFamily: '"DM Mono", monospace'
        }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{unit}</span>
        )}
      </div>
    </div>
  )
}

function ScenarioCard({ scenario, onApply }: { scenario: (typeof SCENARIOS)[number]; onApply: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={onApply}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        textAlign: "left",
        width: "100%",
        background: hovered ? "var(--surface-2)" : "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "12px 12px",
        cursor: "pointer",
        boxShadow: hovered ? "var(--shadow-sm)" : "var(--shadow-xs)",
        transform: pressed ? "scale(0.985)" : hovered ? "translateY(-1px)" : "none",
        transition: "background 0.13s, transform 0.11s, box-shadow 0.13s",
        outline: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>
            {scenario.name}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.35 }}>
            {scenario.desc}
          </div>
        </div>
        <div style={{ fontSize: 18, lineHeight: 1, marginTop: 1 }} aria-hidden>
          {scenario.emoji}
        </div>
      </div>
    </button>
  )
}

/* ── Inline button component (avoids prop drilling) ── */
function SimBtn({ onClick, disabled, variant, children }: {
  onClick?: () => void; disabled?: boolean; variant: "primary" | "ghost"; children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 34, padding: "0 14px",
        borderRadius: 10, fontSize: 13, fontWeight: 600,
        fontFamily: "Outfit, sans-serif",
        border: variant === "ghost" ? "1px solid var(--border-strong)" : "none",
        background: variant === "primary"
          ? (hovered ? "var(--primary-hover)" : "var(--primary)")
          : (hovered ? "var(--surface-2)" : "var(--surface)"),
        color: variant === "primary" ? "#fff" : (hovered ? "var(--text)" : "var(--text-secondary)"),
        boxShadow: variant === "primary"
          ? (hovered ? "0 4px 14px rgba(0,0,0,0.18)" : "0 1px 3px rgba(0,0,0,0.14)")
          : (hovered ? "var(--shadow-sm)" : "var(--shadow-xs)"),
        transform: pressed ? "scale(0.975)" : hovered ? "translateY(-1px)" : "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 0.13s, transform 0.11s, box-shadow 0.13s, color 0.13s",
        outline: "none",
      }}
    >
      {children}
    </button>
  )
}
