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
import { useAppState } from "../state/appState"

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n)
}

/* ═══════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════ */
const LEVER_GROUPS = [
  {
    key: "energy",
    group: "Energy",
    icon: <Zap size={18} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    levers: [
      { key: "renewable",  label: "Renewable electricity", hint: "Increase clean energy procurement",   icon: <Zap size={15} /> },
      { key: "efficiency", label: "Energy efficiency",     hint: "Retrofits, controls, optimization",   icon: <Gauge size={15} /> },
    ],
  },
  {
    key: "transport",
    group: "Transport",
    icon: <Car size={18} />,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.10)",
    levers: [
      { key: "evFleet",         label: "EV fleet transition", hint: "Electrify vehicles and logistics", icon: <Car size={15} /> },
      { key: "flightReduction", label: "Flight reduction",    hint: "Cut travel, switch to rail",        icon: <Plane size={15} /> },
    ],
  },
  {
    key: "waste",
    group: "Waste & Supply",
    icon: <Recycle size={18} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    levers: [
      { key: "recycling", label: "Waste recycling",        hint: "Circular practices, diversion",    icon: <Recycle size={15} /> },
      { key: "supplier",  label: "Supplier sustainability", hint: "Lower Scope 3 engagement",         icon: <Factory size={15} /> },
    ],
  },
]

const ALL_LEVER_KEYS = LEVER_GROUPS.flatMap(g => g.levers.map(l => ({ ...l, color: g.color })))

const SCENARIOS = [
  { name: "Quick wins",       emoji: "⚡", desc: "Efficiency + recycling + flight reduction",   values: { renewable: 20, evFleet: 15, flightReduction: 40, recycling: 60, supplier: 20, efficiency: 35 } },
  { name: "Renewables first", emoji: "☀️", desc: "Maximize clean energy & electrification",     values: { renewable: 90, evFleet: 70, flightReduction: 20, recycling: 30, supplier: 25, efficiency: 50 } },
  { name: "Scope 3 focus",    emoji: "🔗", desc: "Supplier roadmap + data engagement",           values: { renewable: 30, evFleet: 20, flightReduction: 25, recycling: 40, supplier: 85, efficiency: 30 } },
]

const DEFAULT_SLIDERS = { renewable: 40, evFleet: 30, flightReduction: 20, recycling: 50, supplier: 30, efficiency: 25 }

/* ═══════════════════════════════════════════════
   VERTICAL REDUCTION METER
═══════════════════════════════════════════════ */
function ReductionMeter({ pct }: { pct: number | null }) {
  const clamped = Math.min(100, Math.max(0, pct ?? 0))
  const milestones = [
    { label: "Net Zero", at: 100, color: "#22c55e" },
    { label: "−80%",     at: 80,  color: "#4ade80" },
    { label: "−50%",     at: 50,  color: "#86efac" },
  ]

  const gradColor = clamped > 75 ? "#22c55e" : clamped > 40 ? "#60a5fa" : "#f59e0b"

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, userSelect: "none", minWidth: 64 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
        Reduction
      </div>

      {/* Bar */}
      <div style={{ position: "relative", width: 40, height: 200 }}>
        {/* Track */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: 12,
          background: "var(--surface-3)",
          border: "1px solid var(--border)",
        }} />

        {/* Fill */}
        <motion.div
          animate={{ height: `${clamped}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderRadius: 12,
            background: `linear-gradient(to top, ${gradColor}, color-mix(in srgb, ${gradColor} 50%, #fff))`,
            boxShadow: `0 0 16px color-mix(in srgb, ${gradColor} 40%, transparent)`,
          }}
        />

        {/* Milestone ticks */}
        {milestones.map((m) => (
          <div key={m.label} style={{
            position: "absolute", left: 0, right: 0,
            bottom: `${m.at}%`,
            height: 1,
            background: `color-mix(in srgb, ${m.color} 70%, transparent)`,
            transform: "translateY(50%)",
          }} />
        ))}
      </div>

      {/* Milestone labels */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        {milestones.map((m) => (
          <span key={m.label} style={{
            fontSize: 9.5, fontWeight: 600,
            padding: "1px 7px", borderRadius: 99,
            background: `color-mix(in srgb, ${m.color} 15%, transparent)`,
            color: m.color,
            whiteSpace: "nowrap",
          }}>
            {m.label}
          </span>
        ))}
      </div>

      {/* Big number */}
      <motion.div
        key={Math.round(clamped)}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        style={{
          padding: "8px 12px", borderRadius: 10, textAlign: "center",
          background: "var(--primary-soft)",
          border: "1px solid var(--primary-muted)",
        }}
      >
        <div style={{
          fontSize: 20, fontWeight: 800,
          fontFamily: '"DM Mono", monospace',
          letterSpacing: "-0.04em",
          color: "var(--primary)",
          lineHeight: 1,
        }}>
          {pct !== null ? `−${clamped.toFixed(0)}%` : "—"}
        </div>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--muted)", marginTop: 3 }}>CO₂e</div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   OUTCOME ROW
═══════════════════════════════════════════════ */
function OutcomeRow({ label, value, unit, highlight, icon }: {
  label: string; value: string; unit?: string; highlight?: boolean; icon?: React.ReactNode
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px", borderRadius: 10,
      background: highlight ? "var(--primary-soft)" : "var(--surface-2)",
      border: `1px solid ${highlight ? "var(--primary-muted)" : "var(--border)"}`,
      transition: "all 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ color: highlight ? "var(--primary)" : "var(--muted)", display: "flex" }}>{icon}</span>}
        <span style={{ fontSize: 12.5, fontWeight: 500, color: highlight ? "var(--primary)" : "var(--text-secondary)" }}>
          {label}
        </span>
      </div>
      <div>
        <span style={{
          fontSize: 15, fontWeight: 700,
          fontFamily: '"DM Mono", monospace',
          letterSpacing: "-0.025em",
          color: highlight ? "var(--primary)" : "var(--text)",
        }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 5 }}>{unit}</span>}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CATEGORY TAB
═══════════════════════════════════════════════ */
function CategoryTab({ group, icon, color, bg, active, onClick }: {
  group: string; icon: React.ReactNode; color: string; bg: string; active: boolean; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        padding: "10px 14px", borderRadius: 12, minWidth: 80,
        background: active ? bg : hovered ? "var(--surface-2)" : "transparent",
        border: `1px solid ${active ? `color-mix(in srgb, ${color} 30%, transparent)` : hovered ? "var(--border)" : "transparent"}`,
        color: active ? color : hovered ? "var(--text-secondary)" : "var(--muted)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <div style={{
        width: 36, height: 36, display: "grid", placeItems: "center",
        borderRadius: 10,
        background: active ? `color-mix(in srgb, ${color} 18%, transparent)` : "var(--surface-3)",
        border: `1px solid ${active ? `color-mix(in srgb, ${color} 28%, transparent)` : "var(--border)"}`,
        color: active ? color : "var(--muted)",
        transition: "all 0.15s",
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.01em" }}>{group}</span>
    </button>
  )
}

/* ═══════════════════════════════════════════════
   LEVER CHIP (summary strip)
═══════════════════════════════════════════════ */
function LeverChip({ label, value, color, onClick }: {
  label: string; value: number; color: string; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 8, cursor: "pointer",
        background: hovered
          ? `color-mix(in srgb, ${color} 18%, transparent)`
          : `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} ${hovered ? "35%" : "20%"}, transparent)`,
        color,
        transition: "all 0.13s",
        transform: hovered ? "translateY(-1px)" : "none",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: '"DM Mono", monospace' }}>{value}%</span>
      <span style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.85 }}>{label}</span>
    </button>
  )
}

/* ═══════════════════════════════════════════════
   SCENARIO CARD
═══════════════════════════════════════════════ */
function ScenarioCard({ scenario, onApply }: { scenario: typeof SCENARIOS[0]; onApply: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onApply}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", gap: 6,
        padding: "14px 16px", borderRadius: 12, textAlign: "left", cursor: "pointer",
        background: hovered ? "var(--primary-soft)" : "var(--surface-2)",
        border: `1px solid ${hovered ? "var(--primary-muted)" : "var(--border)"}`,
        transition: "all 0.15s",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "var(--shadow)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{scenario.emoji}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: hovered ? "var(--primary)" : "var(--text)", letterSpacing: "-0.01em" }}>
            {scenario.name}
          </span>
        </div>
        <ChevronRight size={13} style={{ color: hovered ? "var(--primary)" : "var(--muted)", opacity: hovered ? 1 : 0.5, transition: "all 0.13s", transform: hovered ? "translateX(2px)" : "none" }} />
      </div>
      <p style={{ fontSize: 11.5, color: hovered ? "var(--primary)" : "var(--muted)", margin: 0, lineHeight: 1.45, opacity: hovered ? 0.85 : 1 }}>
        {scenario.desc}
      </p>
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════
   SIMULATOR PAGE
═══════════════════════════════════════════════ */
export default function Simulator() {
  const { emissionId, simulationResult, setSimulationResult, emissions, company, year, month } = useAppState()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [activeGroup, setActiveGroup] = useState(0)
  const [sliders, setSliders] = useState(DEFAULT_SLIDERS)

  const set = (key: keyof typeof sliders) => (v: number) => setSliders(s => ({ ...s, [key]: v }))
  const resetSliders = () => setSliders(DEFAULT_SLIDERS)
  const applyScenario = (s: typeof SCENARIOS[0]) => setSliders(s.values)
  const canRun = useMemo(() => typeof emissionId === "number", [emissionId])
  const currentGroup = LEVER_GROUPS[activeGroup]

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
        subtitle={`Tune interventions for ${company?.name ?? "your company"} (${String(month).padStart(2, "0")}/${year}) and model emissions reduction, sustainability score, and cost impact.`}
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
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr minmax(280px, 340px)", alignItems: "start" }}
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
                  {currentGroup.levers.map((lever) => (
                    <SimulationSlider
                      key={lever.key}
                      label={lever.label}
                      value={sliders[lever.key as keyof typeof sliders]}
                      onChange={set(lever.key as keyof typeof sliders)}
                      hint={lever.hint}
                      icon={lever.icon}
                      color={currentGroup.color}
                    />
                  ))}
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
        </div>

        {/* ── RIGHT: Outcome panel ── */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
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

      {/* Responsive breakpoints */}
      <style>{`
        @media (max-width: 900px) {
          .sim-grid { grid-template-columns: 1fr !important; }
          .scenarios-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .sliders-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
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