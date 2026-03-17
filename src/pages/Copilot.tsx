import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUp,
  Leaf,
  Sparkles,
  User,
  AlertTriangle,
  X,
  GitCompare,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Zap,
  TrendingDown,
  Lightbulb,
  MessageSquare,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import API, { getApiErrorMessage } from "../api/api"
import SectionHeader from "../components/SectionHeader"
import SnapshotDetailsPanel from "../components/SnapshotDetailsPanel"
import { useAppState } from "../state/appState"
import { PieChart, Pie, ResponsiveContainer, Cell, Tooltip } from "recharts"

type Msg = { role: "user" | "assistant"; content: string }

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n)
}

/* ─── Typing dots ─────────────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      {[0, 0.15, 0.30].map((d, i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--muted)" }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: d, ease: "easeInOut" }}
        />
      ))}
    </span>
  )
}

/* ─── Message bubble ──────────────────────────────────────────────────────── */
function MessageBubble({ msg, idx }: { msg: Msg; idx: number }) {
  const isUser = msg.role === "user"
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: idx * 0.02 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className="shrink-0 grid h-7 w-7 place-items-center rounded-xl mt-0.5"
        style={{
          background: isUser ? "var(--primary-soft)" : "var(--surface-3)",
          border: "1px solid var(--border)",
        }}
      >
        {isUser
          ? <User className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
          : <Leaf className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
        }
      </div>

      {/* Bubble */}
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed"
        style={
          isUser
            ? {
                background: "var(--primary-soft)",
                border: "1px solid var(--primary-muted)",
                color: "var(--text)",
                borderBottomRightRadius: 6,
              }
            : {
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderBottomLeftRadius: 6,
                boxShadow: "var(--shadow-sm)",
              }
        }
      >
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: isUser ? "var(--primary)" : "var(--muted)" }}>
          {isUser ? "You" : "SustainAI"}
        </div>
        <div className="whitespace-pre-wrap">{msg.content}</div>
      </div>
    </motion.div>
  )
}

/* ─── KPI row ─────────────────────────────────────────────────────────────── */
function KpiRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="text-[12.5px] font-medium tabular-nums" style={{ color: "var(--text)", fontFamily: '"DM Mono", monospace' }}>
        {value}
      </span>
    </div>
  )
}

/* ─── Copilot ─────────────────────────────────────────────────────────────── */
export default function Copilot() {
  const { emissionId, company, year, month, emissions, availablePeriods } = useAppState()

  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [changeLoading, setChangeLoading] = useState(false)
  const [prevEmissionId, setPrevEmissionId] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsEmissionId, setDetailsEmissionId] = useState<number | null>(null)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [actions, setActions] = useState<{ title: string; rationale: string; expected_impact: string; citation: string }[]>([])
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Ask me about your hotspots, Scope 3 reduction, or what strategy gives the best modelled reduction. I'll use your emissions dataset + sustainability knowledge base.",
    },
  ])

  const endRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const scrollToEnd = () => {
    window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 30)
  }

  const canChat = useMemo(() => typeof emissionId === "number", [emissionId])

  const previousPeriod = useMemo(() => {
    const sorted = [...availablePeriods].sort((a, b) => (a.year - b.year) * 100 + (a.month - b.month))
    const idx = sorted.findIndex((p) => p.year === year && p.month === month)
    if (idx > 0) return sorted[idx - 1]
    if (idx === -1 && sorted.length) return sorted[sorted.length - 1]
    return null
  }, [availablePeriods, year, month])

  const kpis = useMemo(() => {
    if (!emissions) return null
    return {
      Total: emissions.total_emissions,
      Energy: emissions.energy_emissions,
      Transport: emissions.transport_emissions,
      Waste: emissions.waste_emissions,
      Water: emissions.water_emissions,
      "Supply chain": emissions.supply_chain_emissions,
      Packaging: emissions.packaging_emissions ?? 0,
      "Retail operations": emissions.retail_operations_emissions ?? 0,
      Procurement: emissions.procurement_emissions ?? 0,
    }
  }, [emissions])

  const breakdown = useMemo(() => {
    if (!emissions) return []
    const rows = [
      { name: "Energy", value: emissions.energy_emissions, color: "#f59e0b" },
      { name: "Transport", value: emissions.transport_emissions, color: "#3b82f6" },
      { name: "Waste", value: emissions.waste_emissions, color: "#10b981" },
      { name: "Water", value: emissions.water_emissions, color: "#38bdf8" },
      { name: "Supply chain", value: emissions.supply_chain_emissions, color: "#8b5cf6" },
      ...(typeof emissions.packaging_emissions === "number" ? [{ name: "Packaging", value: emissions.packaging_emissions, color: "#2563eb" }] : []),
      ...(typeof emissions.retail_operations_emissions === "number"
        ? [{ name: "Retail operations", value: emissions.retail_operations_emissions, color: "#06b6d4" }]
        : []),
      ...(typeof emissions.procurement_emissions === "number" ? [{ name: "Procurement", value: emissions.procurement_emissions, color: "#f43f5e" }] : []),
    ]
    return rows.filter((r) => Number.isFinite(r.value) && r.value > 0)
  }, [emissions])

  const ask = async (question?: string) => {
    const text = (question ?? q).trim()
    if (!text || !canChat || emissionId == null) return
    setError("")
    setLoading(true)
    setQ("")
    setMessages((m) => [...m, { role: "user", content: text }])
    scrollToEnd()
    try {
      const res = await API.post("/chat/ask", { emission_id: emissionId, question: text })
      const answer = res.data?.answer ?? ""
      setMessages((m) => [...m, { role: "assistant", content: answer }])
      scrollToEnd()
    } catch (e: any) {
      setError(getApiErrorMessage(e) ?? "Failed to get answer")
    } finally {
      setLoading(false)
    }
  }

  const runChangeInsight = async () => {
    if (!company || emissionId == null || !previousPeriod) return
    setError("")
    setChangeLoading(true)
    try {
      const prevRes = await API.get("/emissions/by-period", {
        params: { company_id: company.id, year: previousPeriod.year, month: previousPeriod.month },
      })

      const prevId = typeof prevRes.data?.emission_id === "number" ? (prevRes.data.emission_id as number) : null
      if (!prevId) { setError("No previous snapshot found"); return }
      setPrevEmissionId(prevId)

      const [currDetails, prevDetails] = await Promise.all([
        API.get("/emissions/snapshot-details", { params: { emission_id: emissionId } }),
        API.get("/emissions/snapshot-details", { params: { emission_id: prevId } }),
      ])
      const c = currDetails.data?.emissions
      const p = prevDetails.data?.emissions
      if (!c || !p) { setError("Snapshot details unavailable"); return }

      const deltas = {
        total: (c.total_emissions ?? 0) - (p.total_emissions ?? 0),
        energy: (c.energy_emissions ?? 0) - (p.energy_emissions ?? 0),
        transport: (c.transport_emissions ?? 0) - (p.transport_emissions ?? 0),
        waste: (c.waste_emissions ?? 0) - (p.waste_emissions ?? 0),
        water: (c.water_emissions ?? 0) - (p.water_emissions ?? 0),
        supply: (c.supply_chain_emissions ?? 0) - (p.supply_chain_emissions ?? 0),
      }

      const drivers = [["Energy", deltas.energy], ["Transport", deltas.transport], ["Waste", deltas.waste], ["Water", deltas.water], ["Supply chain", deltas.supply]] as const
      const top = [...drivers].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3)
      const prevLabel = `${String(previousPeriod.month).padStart(2, "0")}/${previousPeriod.year}`
      const currLabel = `${String(month).padStart(2, "0")}/${year}`

      const lines = [
        `Period comparison: ${prevLabel} → ${currLabel}`,
        `Total change: ${deltas.total >= 0 ? "+" : ""}${fmt(deltas.total)} kg CO₂e`,
        `Top drivers:`,
        ...top.map(([name, v]) => `  ${name}: ${v >= 0 ? "+" : ""}${fmt(v)} kg`),
        `\nCitations: current #${emissionId}, previous #${prevId}`,
      ]

      setMessages((m) => [...m, { role: "assistant", content: lines.join("\n") }])
      setInsightsOpen(true)

      const topDriver = top[0]?.[0] ?? "Total"
      setActions([
        { title: `Investigate ${topDriver} increase`, rationale: `Largest change driver is ${topDriver}. Validate operational changes and data inputs to confirm root cause.`, expected_impact: "Better diagnosis and correction of avoidable drivers.", citation: `current:${emissionId};previous:${prevId}` },
        { title: "Lock a reduction lever for next month", rationale: "Pick 1–2 near-term levers (renewables, EV fleet, travel reduction, recycling) and commit an owner + timeline.", expected_impact: "Short-term reduction momentum and clearer accountability.", citation: `current:${emissionId}` },
        { title: "Create a supplier engagement shortlist", rationale: "If supply chain is material, identify top suppliers to request activity data and reduction commitments.", expected_impact: "Medium-term Scope 3 impact and better supplier data coverage.", citation: `current:${emissionId}` },
      ])
      scrollToEnd()
    } catch (e: any) {
      setError(getApiErrorMessage(e) ?? "Failed to compute changes")
    } finally {
      setChangeLoading(false)
    }
  }

  const openDetails = (id: number | null) => {
    if (!id) return
    setDetailsEmissionId(id)
    setDetailsOpen(true)
  }

  const suggestions = [
    "What is our biggest emission source and why?",
    "Give 5 strategies to reduce Scope 3 emissions.",
    "Which lever should we prioritize for fastest reduction?",
    "Draft an executive summary for this emissions snapshot.",
  ]

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [q])

  // Auto-scroll chat on new messages / loading
  useEffect(() => {
    scrollToEnd()
  }, [messages.length, loading])

  return (
    <div className="mx-auto max-w-7xl grid gap-7">

      <SectionHeader
        eyebrow="AI Sustainability Copilot"
        title="Ask. Diagnose. Decide."
        // subtitle={`Grounded answers for ${company?.name ?? "your company"} (${String(month).padStart(2, "0")}/${year}) using your emissions snapshot and a sustainability knowledge base.`}
      />

      <SnapshotDetailsPanel
        open={detailsOpen}
        emissionId={detailsEmissionId}
        onClose={() => setDetailsOpen(false)}
        title={`${company?.name ?? "Snapshot"} · Copilot citation`}
      />

      {/* Alerts */}
      <AnimatePresence>
        {!canChat && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px]"
            style={{ background: "var(--warning-soft)", border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)", color: "var(--warning)" }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Calculate an emissions snapshot first (Dashboard). Copilot uses that snapshot as context.
          </motion.div>
        )}
        {!!error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-[13px]"
            style={{ background: "var(--error-soft)", border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)", color: "var(--error)" }}
          >
            <span>{error}</span>
            <button onClick={() => setError("")}><X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-5">

        {/* ── Chat panel ── */}
        <div
          className="copilot-chat flex flex-col overflow-hidden rounded-2xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
            minHeight: 560,
          }}
        >
          {/* Chat header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 shrink-0"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-muted)" }}
              >
                <Leaf className="h-4.5 w-4.5" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <div className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>SustainAI Copilot</div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                  {company?.name ?? "No company"} · {String(month).padStart(2, "0")}/{year}
                </div>
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium"
              style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}
            >
              <Sparkles className="h-3 w-3" />
              Grounded
            </span>
          </div>

          {/* Messages */}
          <div className="copilot-messages flex-1 overflow-y-auto px-5 py-5 grid content-start gap-4">
            {messages.map((m, idx) => (
              <MessageBubble key={idx} msg={m} idx={idx} />
            ))}

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div
                  className="shrink-0 grid h-7 w-7 place-items-center rounded-xl mt-0.5"
                  style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}
                >
                  <Leaf className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                </div>
                <div
                  className="rounded-2xl px-4 py-3 text-[13px]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottomLeftRadius: 6, boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>SustainAI</div>
                  <div className="flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                    <span className="text-[13px]">Thinking</span>
                    <TypingDots />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick suggestions (shown only when empty-ish) */}
          {messages.length <= 1 && !loading && (
            <div className="px-5 pb-3 grid grid-cols-2 gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  disabled={!canChat}
                  className="rounded-xl px-3 py-2.5 text-left text-[12px] leading-snug transition-all duration-150 disabled:opacity-40"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-soft)" }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div
            className="px-4 py-3 shrink-0"
            style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}
          >
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,107,60,0.08)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "none" }}
            >
              <textarea
                ref={textareaRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                rows={1}
                disabled={!canChat || loading}
                placeholder={canChat ? "Message SustainAI…" : "Calculate emissions first…"}
                className="flex-1 resize-none bg-transparent text-[13.5px] outline-none placeholder:opacity-50"
                style={{ color: "var(--text)", minHeight: 28, maxHeight: 120 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask() }
                }}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => ask()}
                disabled={!canChat || loading || !q.trim()}
                className="shrink-0 grid h-8 w-8 place-items-center rounded-lg transition-all duration-150 disabled:opacity-40"
                style={{
                  background: q.trim() && canChat ? "var(--primary)" : "var(--surface-3)",
                  color: q.trim() && canChat ? "#fff" : "var(--muted)",
                }}
              >
                <ArrowUp className="h-4 w-4" />
              </motion.button>
            </div>
            <p className="mt-1.5 text-[11px] px-1" style={{ color: "var(--muted)" }}>
              <span style={{ color: "var(--text-secondary)" }}>Enter</span> to send · <span style={{ color: "var(--text-secondary)" }}>Shift+Enter</span> for newline
            </p>
          </div>
        </div>

        {/* ── Insight cards ── */}
        <div className="copilot-cards">

          {/* Context card */}
          <div
            className="copilot-card rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="text-[13px] font-semibold mb-3" style={{ color: "var(--text)" }}>Context</div>

            <div className="grid gap-0 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {[
                { label: "Company", value: company?.name ?? "—" },
                { label: "Period", value: `${String(month).padStart(2, "0")}/${year}` },
                { label: "Snapshot ID", value: emissionId != null ? `#${emissionId}` : "—" },
              ].map(({ label, value }, i, arr) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-3 py-2.5"
                  style={{
                    background: i % 2 === 0 ? "var(--surface-2)" : "var(--surface)",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span className="text-[12px]" style={{ color: "var(--muted)" }}>{label}</span>
                  <span className="text-[12.5px] font-medium" style={{ color: "var(--text)", fontFamily: label === "Snapshot ID" ? '"DM Mono", monospace' : "inherit" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Decision assistant */}
            <div className="mt-4 grid gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Decision assistant
              </div>
              <button
                onClick={runChangeInsight}
                disabled={!canChat || changeLoading || !previousPeriod}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-150 disabled:opacity-40"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "var(--primary-soft)"; el.style.borderColor = "var(--primary-muted)"; el.style.color = "var(--primary)" }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "var(--surface-2)"; el.style.borderColor = "var(--border)"; el.style.color = "var(--text)" }}
              >
                <GitCompare className="h-4 w-4 shrink-0" />
                {changeLoading ? "Computing…" : "What changed vs previous period?"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => openDetails(emissionId ?? null)}
                  disabled={!canChat}
                  className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-150 disabled:opacity-40"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)" }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
                >
                  <FileSearch className="h-3.5 w-3.5" />
                  Current
                </button>
                <button
                  onClick={() => openDetails(prevEmissionId)}
                  disabled={!prevEmissionId}
                  className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-150 disabled:opacity-40"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)" }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
                >
                  <FileSearch className="h-3.5 w-3.5" />
                  Previous
                </button>
              </div>
            </div>
          </div>

          {/* Insights & actions */}
          <div
            className="copilot-card rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
          >
            <button
              className="w-full flex items-center justify-between px-5 py-4 transition-colors"
              onClick={() => setInsightsOpen((v) => !v)}
              style={{ borderBottom: insightsOpen ? "1px solid var(--border)" : "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Insights & actions</span>
                {!!actions.length && (
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                    {actions.length}
                  </span>
                )}
              </div>
              {insightsOpen ? <ChevronUp className="h-4 w-4" style={{ color: "var(--muted)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "var(--muted)" }} />}
            </button>

            <AnimatePresence>
              {insightsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 py-4 grid gap-3">
                    {!actions.length ? (
                      <p className="text-[12.5px] rounded-xl px-3 py-2.5" style={{ background: "var(--warning-soft)", color: "var(--warning)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)" }}>
                        Run "What changed vs previous period" to populate insights.
                      </p>
                    ) : (
                      actions.map((a, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl p-3"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                        >
                          <div className="flex items-start gap-2 mb-1.5">
                            <TrendingDown className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
                            <span className="text-[12.5px] font-semibold" style={{ color: "var(--text)" }}>{a.title}</span>
                          </div>
                          <p className="text-[12px] leading-relaxed mb-2" style={{ color: "var(--muted)" }}>{a.rationale}</p>
                          <div className="text-[11.5px]" style={{ color: "var(--text-secondary)" }}>
                            Impact: <span style={{ color: "var(--text)" }}>{a.expected_impact}</span>
                          </div>
                          <div className="mt-1 text-[10.5px]" style={{ color: "var(--muted)", fontFamily: '"DM Mono", monospace' }}>
                            {a.citation}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Snapshot KPIs */}
          <div
            className="copilot-card rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4" style={{ color: "var(--accent)" }} />
              <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Snapshot KPIs</span>
            </div>

            {!kpis ? (
              <p className="text-[12.5px] rounded-xl px-3 py-2.5" style={{ background: "var(--warning-soft)", color: "var(--warning)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)" }}>
                No snapshot loaded. Calculate on Dashboard first.
              </p>
            ) : (
              <div>
                {Object.entries(kpis).map(([label, value]) => (
                  <KpiRow key={label} label={label} value={`${fmt(value)} kg CO₂e`} />
                ))}
              </div>
            )}
          </div>

          {/* Emissions breakdown */}
          <div
            className="copilot-card rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4" style={{ color: "var(--primary)" }} />
              <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Breakdown</span>
            </div>
            {!breakdown.length ? (
              <p
                className="text-[12.5px] rounded-xl px-3 py-2.5"
                style={{ background: "var(--warning-soft)", color: "var(--warning)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)" }}
              >
                No breakdown available. Load a snapshot first.
              </p>
            ) : (
              <div className="grid gap-3">
                <div style={{ height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={0}>
                        {breakdown.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          color: "var(--text)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-2">
                  {breakdown.slice(0, 6).map((d) => (
                    <div key={d.name} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>{d.name}</span>
                      </div>
                      <span className="text-[12.5px]" style={{ color: "var(--text)", fontFamily: '"DM Mono", monospace' }}>{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div
            className="copilot-card rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4" style={{ color: "var(--muted)" }} />
              <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Quick prompts</span>
            </div>
            <div className="grid gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  disabled={!canChat || loading}
                  className="rounded-xl px-3 py-2.5 text-left text-[12.5px] leading-snug transition-all duration-150 disabled:opacity-40"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "var(--primary-muted)"; el.style.background = "var(--primary-soft)"; el.style.color = "var(--primary)" }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "var(--border)"; el.style.background = "var(--surface-2)"; el.style.color = "var(--text-secondary)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .copilot-chat {
          height: min(720px, calc(100vh - 220px));
        }
        .copilot-messages {
          scroll-behavior: smooth;
        }
        .copilot-cards {
          column-count: 2;
          column-gap: 16px;
        }
        .copilot-card {
          break-inside: avoid;
          margin: 0 0 16px;
          display: block;
        }
        @media (max-width: 1280px) {
          .copilot-chat { height: auto; }
        }
        @media (max-width: 980px) {
          .copilot-cards { column-count: 1; }
        }
      `}</style>
    </div>
  )
}
