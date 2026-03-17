import { useMemo, useState } from "react"
import {
  Download,
  FileText,
  Sparkles,
  AlertTriangle,
  X,
  Users,
  MessageSquare,
  AlignLeft,
  CheckCircle2,
  Clock,
  BookOpen,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import API, { getApiErrorMessage } from "../api/api"
import { useAppState } from "../state/appState"
import SectionHeader from "../components/SectionHeader"

/* ─── Select field ────────────────────────────────────────────────────────── */
function ConfigSelect({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  label: string
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-1.5">
        <span style={{ color: "var(--muted)" }}>{icon}</span>
        <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          {label}
        </span>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-lg pl-3 pr-8 text-[13px] outline-none transition-all duration-150 cursor-pointer"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,107,60,0.10)" }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none" }}
        >
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: "var(--muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

/* ─── Length toggle ───────────────────────────────────────────────────────── */
function LengthToggle({
  value,
  onChange,
}: {
  value: "Short" | "Medium" | "Detailed"
  onChange: (v: "Short" | "Medium" | "Detailed") => void
}) {
  const options = [
    { key: "Short" as const, icon: <AlignLeft className="h-3.5 w-3.5" />, desc: "~300 words" },
    { key: "Medium" as const, icon: <FileText className="h-3.5 w-3.5" />, desc: "~600 words" },
    { key: "Detailed" as const, icon: <BookOpen className="h-3.5 w-3.5" />, desc: "~1200 words" },
  ]
  return (
    <div className="grid gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
        Report length
      </span>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className="flex flex-col items-center gap-1 rounded-xl py-2.5 px-2 text-center transition-all duration-150"
            style={{
              background: value === o.key ? "var(--primary-soft)" : "var(--surface-2)",
              border: `1px solid ${value === o.key ? "var(--primary-muted)" : "var(--border)"}`,
              color: value === o.key ? "var(--primary)" : "var(--muted)",
            }}
          >
            {o.icon}
            <span className="text-[12px] font-semibold">{o.key}</span>
            <span className="text-[10px]" style={{ opacity: 0.7 }}>{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Section block ───────────────────────────────────────────────────────── */
function ReportSection({ section, index }: { section: { title: string; content: string }; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3"
        style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="grid h-5 w-5 place-items-center rounded-md text-[10px] font-bold"
          style={{ background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--primary-muted)" }}
        >
          {index + 1}
        </span>
        <span className="text-[12.5px] font-semibold" style={{ color: "var(--text)" }}>{section.title}</span>
      </div>
      <div
        className="px-5 py-4 text-[13.5px] leading-relaxed whitespace-pre-wrap"
        style={{ color: "var(--text-secondary)", background: "var(--surface)" }}
      >
        {section.content}
      </div>
    </motion.div>
  )
}

/* ─── Reports ─────────────────────────────────────────────────────────────── */
export default function Reports() {
  const { emissionId, company, year, month } = useAppState()
  const [loading, setLoading] = useState(false)
  const [reportText, setReportText] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [templates, setTemplates] = useState<{ key: string; name: string; description?: string }[]>([])
  const [templateKey, setTemplateKey] = useState<string>("executive")
  const [sections, setSections] = useState<{ title: string; content: string }[]>([])
  const [generatedReportId, setGeneratedReportId] = useState<number | null>(null)
  const [audience, setAudience] = useState("Executive / Leadership")
  const [tone, setTone] = useState("Professional")
  const [length, setLength] = useState<"Short" | "Medium" | "Detailed">("Medium")

  const canGenerate = useMemo(() => typeof emissionId === "number", [emissionId])

  useMemo(() => {
    if (templates.length) return
    API.get("/report/templates")
      .then((res) => {
        const list = Array.isArray(res.data) ? (res.data as any[]) : []
        setTemplates(list.map((t) => ({ key: String(t.key), name: String(t.name), description: t.description ?? "" })))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generate = async () => {
    if (!canGenerate || emissionId == null) return
    setLoading(true)
    setError("")
    try {
      const res = await API.post("/report/generate", {
        emission_id: emissionId,
        audience,
        tone,
        length,
        template_key: templateKey,
      })
      setReportText(res.data?.report ?? "")
      setSections(Array.isArray(res.data?.sections) ? (res.data.sections as any) : [])
      setGeneratedReportId(typeof res.data?.report_id === "number" ? (res.data.report_id as number) : null)
    } catch (e: any) {
      setError(getApiErrorMessage(e) ?? "Failed to generate report")
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = () => {
    if (!generatedReportId) return
    window.open(`${API.defaults.baseURL ?? ""}/report/download/${generatedReportId}`, "_blank")
  }

  const hasReport = !!reportText || sections.length > 0

  return (
    <div className="mx-auto max-w-7xl grid gap-7">

      <SectionHeader
        eyebrow="ESG Report Studio"
        title="AI-generated sustainability narrative"
        // subtitle={`Generate an executive-ready monthly narrative for ${company?.name ?? "your company"} (${String(month).padStart(2, "0")}/${year}). Uses your stored emissions snapshot and backend LLM.`}
      />

      {/* Alerts */}
      <AnimatePresence>
        {!canGenerate && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px]"
            style={{ background: "var(--warning-soft)", border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)", color: "var(--warning)" }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Go to Dashboard and calculate an emissions snapshot before generating a report.
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

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">

        {/* ── Config panel ── */}
        <div
          className="rounded-2xl p-5 grid gap-5 content-start"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
        >
          {/* Context badge */}
          <div
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-muted)" }}
            >
              <FileText className="h-4 w-4" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                {company?.name ?? "No company selected"}
              </div>
              <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                {String(month).padStart(2, "0")}/{year} · Snapshot{" "}
                <span style={{ fontFamily: '"DM Mono", monospace' }}>#{emissionId ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Template */}
          <div className="grid gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Template
            </span>
            <div className="relative">
              <select
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg pl-3 pr-8 text-[13px] outline-none transition-all duration-150 cursor-pointer"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,107,60,0.10)" }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none" }}
              >
                {!templates.length && <option value="executive">Executive Summary</option>}
                {templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: "var(--muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Audience */}
          <ConfigSelect
            label="Audience"
            icon={<Users className="h-3.5 w-3.5" />}
            value={audience}
            onChange={setAudience}
            options={["Executive / Leadership", "Operations", "Compliance", "Investors"]}
          />

          {/* Tone */}
          <ConfigSelect
            label="Tone"
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            value={tone}
            onChange={setTone}
            options={["Professional", "Board-ready", "Neutral", "Technical"]}
          />

          {/* Length */}
          <LengthToggle value={length} onChange={setLength} />

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border)" }} />

          {/* Actions */}
          <div className="grid gap-2">
            <button
              disabled={!canGenerate || loading}
              onClick={generate}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-150 disabled:opacity-50"
              style={{ background: "var(--primary)", color: "#ffffff", boxShadow: "0 2px 8px rgba(26,107,60,0.25)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-hover)" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--primary)" }}
            >
              {loading
                ? <><Clock className="h-3.5 w-3.5 animate-spin" />Generating…</>
                : <><Sparkles className="h-3.5 w-3.5" />Generate report</>
              }
            </button>

            <button
              disabled={!generatedReportId}
              onClick={downloadPdf}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-150 disabled:opacity-40"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </button>
          </div>
        </div>

        {/* ── Preview panel ── */}
        <div
          className="rounded-2xl overflow-hidden flex flex-col"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", minHeight: 480 }}
        >
          {/* Preview header */}
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
          >
            <div>
              <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Report preview</div>
              <div className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
                {hasReport
                  ? `${sections.length ? sections.length + " sections" : "Plain text"} · ${audience} · ${tone} · ${length}`
                  : "Configure and generate a report on the left"
                }
              </div>
            </div>
            {hasReport && (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--primary-muted)" }}
              >
                <CheckCircle2 className="h-3 w-3" />
                Generated
              </span>
            )}
          </div>

          {/* Preview content */}
          <div className="flex-1 overflow-y-auto p-5">
            {!hasReport ? (
              <div className="h-full grid place-items-center">
                <div className="text-center grid gap-3">
                  <div
                    className="mx-auto grid h-14 w-14 place-items-center rounded-2xl"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                  >
                    <FileText className="h-6 w-6" style={{ color: "var(--muted)" }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium" style={{ color: "var(--text)" }}>No report yet</p>
                    <p className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>
                      Configure options on the left and click <strong style={{ color: "var(--text)" }}>Generate report</strong>
                    </p>
                  </div>
                </div>
              </div>
            ) : sections.length > 0 ? (
              /* Sectioned report */
              <div className="grid gap-3">
                {/* Report meta strip */}
                <div
                  className="flex flex-wrap gap-2 mb-2 rounded-xl px-4 py-3"
                  style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-muted)" }}
                >
                  {[
                    { label: "Company", value: company?.name ?? "—" },
                    { label: "Period", value: `${String(month).padStart(2, "0")}/${year}` },
                    { label: "Audience", value: audience },
                    { label: "Tone", value: tone },
                    { label: "Length", value: length },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>{label}:</span>
                      <span className="text-[11px] font-semibold" style={{ color: "var(--primary)" }}>{value}</span>
                      <span className="text-[11px]" style={{ color: "var(--primary-muted)" }}>·</span>
                    </div>
                  ))}
                </div>

                {sections.map((s, idx) => (
                  <ReportSection key={idx} section={s} index={idx} />
                ))}
              </div>
            ) : (
              /* Plain text report */
              <div>
                {/* Report meta strip */}
                <div
                  className="flex flex-wrap gap-2 mb-4 rounded-xl px-4 py-3"
                  style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-muted)" }}
                >
                  {[
                    { label: "Company", value: company?.name ?? "—" },
                    { label: "Period", value: `${String(month).padStart(2, "0")}/${year}` },
                    { label: "Audience", value: audience },
                    { label: "Tone", value: tone },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>{label}:</span>
                      <span className="text-[11px] font-semibold" style={{ color: "var(--primary)" }}>{value}</span>
                      <span className="text-[11px]" style={{ color: "var(--primary-muted)" }}>·</span>
                    </div>
                  ))}
                </div>
                <div
                  className="whitespace-pre-wrap text-[13.5px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {reportText}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}