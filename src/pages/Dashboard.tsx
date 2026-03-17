import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Activity, ChevronDown, Database, Flame, Plus, Sparkles, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import API, { getApiErrorMessage } from "../api/api"
import CarbonChart from "../components/CarbonChart"
import DashboardInsights from "../components/DashboardInsights"
import SectionHeader from "../components/SectionHeader"
import SnapshotDetailsPanel from "../components/SnapshotDetailsPanel"
import { type Company, useAppState } from "../state/appState"

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n)
}

/* ═══════════════════════════════════════════════════
   FIELD
═══════════════════════════════════════════════════ */
function Field({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  min?: number
  max?: number
  step?: number
}) {
  const [focused, setFocused] = useState(false)
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>
        {unit && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "1px 6px",
            borderRadius: 4,
            background: "var(--surface-3)",
            color: "var(--muted)",
          }}>
            {unit}
          </span>
        )}
      </div>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          height: 34,
          padding: "0 10px",
          borderRadius: "var(--r-sm)",
          border: `1px solid ${focused ? "var(--primary)" : "var(--border-strong)"}`,
          background: focused ? "var(--surface)" : "var(--surface-2)",
          color: "var(--text)",
          fontSize: 13,
          fontFamily: '"DM Mono", monospace',
          outline: "none",
          boxShadow: focused ? "0 0 0 3px var(--primary-dim)" : "none",
          transition: "border-color 0.13s, box-shadow 0.13s, background 0.13s",
          width: "100%",
        }}
      />
    </label>
  )
}

/* ═══════════════════════════════════════════════════
   FORM CARD
═══════════════════════════════════════════════════ */
function FormCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)",
      boxShadow: "var(--shadow-sm)",
      padding: "18px 20px",
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "var(--muted)",
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: "1px solid var(--border)",
      }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   COLLAPSIBLE CARD
═══════════════════════════════════════════════════ */
function CollapsibleCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)",
      boxShadow: "var(--shadow-sm)",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "14px 16px",
          background: "var(--surface-2)",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}>
          {title}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 12 }}>
          {open ? "Hide" : "Show"}
          <ChevronDown style={{ width: 14, height: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "16px" }}>
              <div style={{ display: "grid", gap: 12 }}>{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   STYLED SELECT
═══════════════════════════════════════════════════ */
function StyledSelect({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            height: 34,
            paddingLeft: 10,
            paddingRight: 28,
            borderRadius: "var(--r-sm)",
            border: `1px solid ${focused ? "var(--primary)" : "var(--border-strong)"}`,
            background: focused ? "var(--surface)" : "var(--surface-2)",
            color: "var(--text)",
            fontSize: 13,
            fontFamily: "Outfit, sans-serif",
            appearance: "none",
            outline: "none",
            boxShadow: focused ? "0 0 0 3px var(--primary-dim)" : "none",
            transition: "border-color 0.13s, box-shadow 0.13s, background 0.13s",
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {children}
        </select>
        <ChevronDown style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 11,
          height: 11,
          color: "var(--muted)",
          pointerEvents: "none",
        }} />
      </div>
    </label>
  )
}

function SelectInline({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const [focused, setFocused] = useState(false)
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            height: 34,
            paddingLeft: 10,
            paddingRight: 28,
            borderRadius: "var(--r-sm)",
            border: `1px solid ${focused ? "var(--primary)" : "var(--border-strong)"}`,
            background: focused ? "var(--surface)" : "var(--surface-2)",
            color: "var(--text)",
            fontSize: 13,
            fontFamily: "Outfit, sans-serif",
            appearance: "none",
            outline: "none",
            boxShadow: focused ? "0 0 0 3px var(--primary-dim)" : "none",
            transition: "border-color 0.13s, box-shadow 0.13s, background 0.13s",
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 11,
            height: 11,
            color: "var(--muted)",
            pointerEvents: "none",
          }}
        />
      </div>
    </label>
  )
}

/* ═══════════════════════════════════════════════════
   BTN helper (inline, consistent with new system)
═══════════════════════════════════════════════════ */
function Btn({
  onClick,
  disabled,
  variant = "ghost",
  children,
  style: extraStyle,
}: {
  onClick?: () => void
  disabled?: boolean
  variant?: "primary" | "ghost" | "soft"
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 34,
    padding: "0 14px",
    borderRadius: "var(--r-md)",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "Outfit, sans-serif",
    border: "none",
    outline: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    whiteSpace: "nowrap",
    transition: "background 0.13s, transform 0.11s, box-shadow 0.13s, color 0.13s",
    transform: pressed ? "scale(0.975)" : hovered && !disabled ? "translateY(-1px)" : "none",
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: hovered && !disabled ? "var(--primary-hover)" : "var(--primary)",
      color: "#fff",
      boxShadow: hovered && !disabled ? "0 4px 14px rgba(0,0,0,0.18)" : "0 1px 3px rgba(0,0,0,0.14)",
    },
    ghost: {
      background: hovered && !disabled ? "var(--surface-2)" : "var(--surface)",
      color: hovered && !disabled ? "var(--text)" : "var(--text-secondary)",
      border: "1px solid var(--border-strong)",
      boxShadow: hovered && !disabled ? "var(--shadow-sm)" : "var(--shadow-xs)",
    },
    soft: {
      background: hovered && !disabled ? "var(--surface-3)" : "var(--surface-2)",
      color: hovered && !disabled ? "var(--text)" : "var(--text-secondary)",
      border: "1px solid var(--border)",
    },
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{ ...base, ...variants[variant], ...extraStyle }}
    >
      {children}
    </button>
  )
}

/* ═══════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════ */
export default function Dashboard() {
  const {
    emissions, setEmissions, setEmissionId, emissionId,
    company, setCompany, year, setYear, month, setMonth,
    availablePeriods, periodsLoading,
    snapshotLoading, snapshotError, snapshotSource,
  } = useAppState()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [newCompanyOpen, setNewCompanyOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyIndustry, setNewCompanyIndustry] = useState("")
  const [newCompanyCountry, setNewCompanyCountry] = useState("")
  const [creatingCompany, setCreatingCompany] = useState(false)

  const [form, setForm] = useState({
    electricity_kwh: 0,
    renewable_electricity_percentage: 0,
    diesel_liters: 0,
    petrol_liters: 0,
    flight_km: 0,
    shipping_km: 0,
    waste_kg: 0,
    recycled_waste_kg: 0,
    water_usage_m3: 0,
    supplier_emissions: 0,
    packaging_material_type: "plastic",
    packaging_weight_kg: 0,
    packaging_recycled_material_pct: 0,
    packaging_emission_per_kg: 2,
    packaging_to_product_ratio: 0.08,
    packaging_recyclability_pct: 70,
    store_electricity_kwh: 0,
    hvac_kwh: 0,
    refrigeration_kwh: 0,
    refrigeration_leakage_kg: 0,
    lighting_kwh: 0,
    store_floor_area_sqft: 0,
    store_operating_hours: 0,
    supplier_emission_intensity: 0,
    procurement_material_type: "cocoa butter milk chocolate",
    sourcing_geography: "APAC",
    lifecycle_emissions_per_unit: 0,
    quantity_purchased: 0,
  })

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoadingCompanies(true)
      try {
        const res = await API.get("/companies")
        const list = Array.isArray(res.data) ? (res.data as Company[]) : []
        if (!mounted) return
        setCompanies(list)
        if (!company && list.length) setCompany(list[0])
      } catch { /* silent */ }
      finally { if (mounted) setLoadingCompanies(false) }
    }
    load()
    return () => { mounted = false }
  }, [company, setCompany])

  const refreshCompanies = async () => {
    const res = await API.get("/companies")
    const list = Array.isArray(res.data) ? (res.data as Company[]) : []
    setCompanies(list)
    return list
  }

  const createCompany = async () => {
    const name = newCompanyName.trim()
    if (!name) { setError("Company name is required"); return }
    setCreatingCompany(true)
    setError("")
    try {
      const res = await API.post("/companies", {
        name,
        industry: newCompanyIndustry.trim() || null,
        country: newCompanyCountry.trim() || null,
      })
      const created: Company | null = res.data?.id ? (res.data as Company) : null
      const list = await refreshCompanies()
      const chosen = created ? list.find((c) => c.id === created.id) ?? created : list[0] ?? null
      setCompany(chosen)
      setNewCompanyOpen(false)
      setNewCompanyName("")
      setNewCompanyIndustry("")
      setNewCompanyCountry("")
    } catch (e: any) {
      setError(getApiErrorMessage(e) ?? "Failed to create company")
    } finally {
      setCreatingCompany(false)
    }
  }

  useEffect(() => { if (snapshotError) setError(snapshotError) }, [snapshotError])

  const hotspots = useMemo(() => {
    if (!emissions) return []
    const list = [
      ["Energy", emissions.energy_emissions],
      ["Transport", emissions.transport_emissions],
      ["Waste", emissions.waste_emissions],
      ["Water", emissions.water_emissions],
      ["Supply chain", emissions.supply_chain_emissions],
      ["Packaging", emissions.packaging_emissions ?? 0],
      ["Retail operations", emissions.retail_operations_emissions ?? 0],
      ["Procurement", emissions.procurement_emissions ?? 0],
    ] as const
    return [...list].filter(([, v]) => Number(v) > 0).sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [emissions])

  const hotspotMax = useMemo(() =>
    hotspots.length ? Math.max(...hotspots.map(([, v]) => v), 1) : 1
  , [hotspots])

  const calculate = async () => {
    setLoading(true)
    setError("")
    try {
      if (!company) { setError("Select a company to calculate emissions"); return }
      const res = await API.post("/emissions/calculate", { company_id: company.id, year, month, ...form })
      setEmissions(res.data.emissions)
      setEmissionId(res.data.emission_id)
    } catch (e: any) {
      setError(getApiErrorMessage(e) ?? "Failed to calculate emissions")
    } finally {
      setLoading(false)
    }
  }

  const loadSample = () => {
    setForm({
      electricity_kwh: 20000,
      renewable_electricity_percentage: 20,
      diesel_liters: 1000,
      petrol_liters: 500,
      flight_km: 10000,
      shipping_km: 20000,
      waste_kg: 2000,
      recycled_waste_kg: 800,
      water_usage_m3: 500,
      supplier_emissions: 100,
      packaging_material_type: "plastic",
      packaging_weight_kg: 650,
      packaging_recycled_material_pct: 35,
      packaging_emission_per_kg: 2.4,
      packaging_to_product_ratio: 0.09,
      packaging_recyclability_pct: 72,
      store_electricity_kwh: 18000,
      hvac_kwh: 4200,
      refrigeration_kwh: 3800,
      refrigeration_leakage_kg: 2.1,
      lighting_kwh: 2400,
      store_floor_area_sqft: 9500,
      store_operating_hours: 320,
      supplier_emission_intensity: 2.1,
      procurement_material_type: "cocoa butter milk chocolate",
      sourcing_geography: "APAC",
      lifecycle_emissions_per_unit: 7.2,
      quantity_purchased: 4800,
    })
  }

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 7 }, (_, i) => now - 5 + i)
  }, [])

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])

  const HOTSPOT_COLORS = ["var(--primary)", "var(--accent)", "var(--primary-muted)"]

  return (
    <div style={{ display: "grid", gap: 28 }}>

      {/* ── Header ── */}
      <SectionHeader
        eyebrow="Sustainability Intelligence"
        title="Carbon footprint "
        // subtitle="Enter operational data for an organization. We compute an emissions snapshot and reuse the same record for simulation, reporting and the AI copilot."
        right={
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <Btn onClick={() => setDetailsOpen(true)} disabled={!emissionId} variant="ghost">
              View snapshot
            </Btn>
            <Btn onClick={loadSample} disabled={loading} variant="ghost">
              <Database style={{ width: 13, height: 13 }} />
              Load sample
            </Btn>
            <Btn onClick={calculate} disabled={loading || snapshotLoading} variant="primary">
              <Sparkles style={{ width: 13, height: 13 }} />
              {snapshotLoading ? "Loading…" : loading ? "Calculating…" : "Calculate"}
            </Btn>
          </div>
        }
      />

      {/* ── Status banner ── */}
      <AnimatePresence>
        {(snapshotSource === "loaded" || snapshotSource === "calculated") && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 16px", borderRadius: "var(--r-md)",
              background: "var(--primary-soft)",
              border: "1px solid var(--primary-muted)",
              color: "var(--primary)", fontSize: 13,
            }}
          >
            <Activity style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>
              Snapshot {snapshotSource === "loaded" ? "loaded" : "calculated"}
            </span>
            <span style={{ color: "var(--muted)" }}>
              {company?.name} · {String(month).padStart(2, "0")}/{year}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      <AnimatePresence>
        {!!error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "10px 16px", borderRadius: "var(--r-md)",
              background: "var(--error-soft)",
              border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)",
              color: "var(--error)", fontSize: 13,
            }}
          >
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", opacity: 0.6, padding: 2 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.6" }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <SnapshotDetailsPanel
        open={detailsOpen}
        emissionId={emissionId}
        onClose={() => setDetailsOpen(false)}
        title={`${company?.name ?? "Snapshot"} · ${String(month).padStart(2, "0")}/${year}`}
      />

      {/* ══════════════════════════════════════════════════
          MAIN GRID
          Left (inputs): fixed comfortable width, min 300px
          Right (results): fills remaining space
      ══════════════════════════════════════════════════ */}
      <div style={{
        display: "grid",
        gap: 20,
        gridTemplateColumns: "minmax(300px, 520px) 1fr",
        alignItems: "start",
      }}
        className="dashboard-grid"
      >

        {/* ── LEFT: Inputs ── */}
        <div style={{ display: "grid", gap: 16 }}>

          {/* Organization & Period */}
          <FormCard title="Organization & Period">
            {/* Company + Year + Month row */}
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 88px 72px" }}>
              <StyledSelect
                label="Company"
                value={company ? String(company.id) : ""}
                disabled={loadingCompanies}
                onChange={(id) => setCompany(companies.find((x) => String(x.id) === id) ?? null)}
              >
                {!companies.length && <option value="">{loadingCompanies ? "Loading…" : "No companies"}</option>}
                {companies.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </StyledSelect>
              <StyledSelect label="Year" value={String(year)} onChange={(v) => setYear(Number(v))}>
                {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </StyledSelect>
              <StyledSelect label="Month" value={String(month)} onChange={(v) => setMonth(Number(v))}>
                {months.map((m) => <option key={m} value={String(m)}>{String(m).padStart(2, "0")}</option>)}
              </StyledSelect>
            </div>

            {/* Saved periods */}
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <StyledSelect
                label="Saved periods"
                value={company ? `${year}-${month}` : ""}
                disabled={!company || periodsLoading || !availablePeriods.length}
                onChange={(v) => {
                  const [y, m] = v.split("-")
                  const yy = Number(y), mm = Number(m)
                  if (Number.isFinite(yy) && Number.isFinite(mm)) { setYear(yy); setMonth(mm) }
                }}
              >
                {!company && <option value="">Select company first</option>}
                {!!company && !availablePeriods.length && <option value="">{periodsLoading ? "Loading…" : "No saved periods"}</option>}
                {availablePeriods.map((p) => (
                  <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                    {String(p.month).padStart(2, "0")}/{p.year}
                  </option>
                ))}
              </StyledSelect>
              <div style={{
                display: "flex", alignItems: "center",
                padding: "0 12px",
                borderRadius: "var(--r-sm)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                fontSize: 11.5,
                color: "var(--muted)",
                lineHeight: 1.45,
                marginTop: 18, // aligns with input (label height offset)
              }}>
                Jump to a saved snapshot month.
              </div>
            </div>

            {/* Add company */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 2 }}>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Manage workspace companies</span>
              <Btn onClick={() => setNewCompanyOpen((v) => !v)} variant="soft" style={{ height: 30, padding: "0 10px", fontSize: 12 }}>
                {newCompanyOpen ? <X style={{ width: 11, height: 11 }} /> : <Plus style={{ width: 11, height: 11 }} />}
                {newCompanyOpen ? "Close" : "Add company"}
              </Btn>
            </div>

            {/* New company form */}
            <AnimatePresence>
              {newCompanyOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{
                    display: "grid", gap: 12, marginTop: 4,
                    padding: 14, borderRadius: "var(--r-md)",
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                  }}>
                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr" }}>
                      {[
                        { label: "Company name", val: newCompanyName, set: setNewCompanyName },
                        { label: "Industry", val: newCompanyIndustry, set: setNewCompanyIndustry },
                        { label: "Country", val: newCompanyCountry, set: setNewCompanyCountry },
                      ].map(({ label, val, set }) => (
                        <InlineInput key={label} label={label} value={val} onChange={set} />
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <Btn onClick={() => setNewCompanyOpen(false)} variant="ghost" style={{ height: 30, fontSize: 12 }}>Cancel</Btn>
                      <Btn onClick={createCompany} disabled={creatingCompany} variant="primary" style={{ height: 30, fontSize: 12 }}>
                        {creatingCompany ? "Creating…" : "Create"}
                      </Btn>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </FormCard>

          <CollapsibleCard title="Energy" defaultOpen>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Electricity consumption" value={form.electricity_kwh} onChange={(v) => setForm((f) => ({ ...f, electricity_kwh: Math.max(0, v) }))} unit="kWh" min={0} />
              <Field label="Renewable electricity" value={form.renewable_electricity_percentage} onChange={(v) => setForm((f) => ({ ...f, renewable_electricity_percentage: Math.min(100, Math.max(0, v)) }))} unit="%" min={0} max={100} />
            </div>
          </CollapsibleCard>

          <CollapsibleCard title="Transport" defaultOpen>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Diesel used" value={form.diesel_liters} onChange={(v) => setForm((f) => ({ ...f, diesel_liters: Math.max(0, v) }))} unit="L" min={0} />
              <Field label="Petrol used" value={form.petrol_liters} onChange={(v) => setForm((f) => ({ ...f, petrol_liters: Math.max(0, v) }))} unit="L" min={0} />
              <Field label="Business flights" value={form.flight_km} onChange={(v) => setForm((f) => ({ ...f, flight_km: Math.max(0, v) }))} unit="km" min={0} />
              <Field label="Shipping distance" value={form.shipping_km} onChange={(v) => setForm((f) => ({ ...f, shipping_km: Math.max(0, v) }))} unit="km" min={0} />
            </div>
          </CollapsibleCard>

          <CollapsibleCard title="Waste, Water & Supply chain" defaultOpen>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Waste generated" value={form.waste_kg} onChange={(v) => setForm((f) => ({ ...f, waste_kg: Math.max(0, v) }))} unit="kg" min={0} />
              <Field label="Recycled waste" value={form.recycled_waste_kg} onChange={(v) => setForm((f) => ({ ...f, recycled_waste_kg: Math.max(0, v) }))} unit="kg" min={0} />
              <Field label="Water usage" value={form.water_usage_m3} onChange={(v) => setForm((f) => ({ ...f, water_usage_m3: Math.max(0, v) }))} unit="m³" min={0} />
              <Field label="Supplier emissions" value={form.supplier_emissions} onChange={(v) => setForm((f) => ({ ...f, supplier_emissions: Math.max(0, v) }))} unit="kg CO₂e" min={0} />
            </div>
          </CollapsibleCard>

          <CollapsibleCard title="Packaging" defaultOpen={false}>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <SelectInline
                label="Material type"
                value={form.packaging_material_type}
                onChange={(v) => setForm((f) => ({ ...f, packaging_material_type: v }))}
                options={[
                  { value: "plastic", label: "Plastic" },
                  { value: "glass", label: "Glass" },
                  { value: "aluminum", label: "Aluminum" },
                  { value: "paper", label: "Paper" },
                ]}
              />
              <Field
                label="Weight of packaging"
                value={form.packaging_weight_kg}
                onChange={(v) => setForm((f) => ({ ...f, packaging_weight_kg: Math.max(0, v) }))}
                unit="kg"
                min={0}
              />
              <Field
                label="Virgin vs recycled material"
                value={form.packaging_recycled_material_pct}
                onChange={(v) => setForm((f) => ({ ...f, packaging_recycled_material_pct: Math.min(100, Math.max(0, v)) }))}
                unit="%"
                min={0}
                max={100}
              />
              <Field
                label="Emission per kg of material"
                value={form.packaging_emission_per_kg}
                onChange={(v) => setForm((f) => ({ ...f, packaging_emission_per_kg: Math.max(0, v) }))}
                unit="kg CO₂e/kg"
                min={0}
                step={0.1}
              />
              <Field
                label="Packaging-to-product ratio"
                value={form.packaging_to_product_ratio}
                onChange={(v) => setForm((f) => ({ ...f, packaging_to_product_ratio: Math.max(0, v) }))}
                unit="ratio"
                min={0}
                step={0.01}
              />
              <Field
                label="Recyclability"
                value={form.packaging_recyclability_pct}
                onChange={(v) => setForm((f) => ({ ...f, packaging_recyclability_pct: Math.min(100, Math.max(0, v)) }))}
                unit="%"
                min={0}
                max={100}
              />
            </div>
          </CollapsibleCard>

          <CollapsibleCard title="Retail Operations" defaultOpen={false}>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <Field
                label="Store electricity consumption"
                value={form.store_electricity_kwh}
                onChange={(v) => setForm((f) => ({ ...f, store_electricity_kwh: Math.max(0, v) }))}
                unit="kWh"
                min={0}
              />
              <Field
                label="HVAC usage"
                value={form.hvac_kwh}
                onChange={(v) => setForm((f) => ({ ...f, hvac_kwh: Math.max(0, v) }))}
                unit="kWh"
                min={0}
              />
              <Field
                label="Refrigeration systems"
                value={form.refrigeration_kwh}
                onChange={(v) => setForm((f) => ({ ...f, refrigeration_kwh: Math.max(0, v) }))}
                unit="kWh"
                min={0}
              />
              <Field
                label="Refrigeration leakage"
                value={form.refrigeration_leakage_kg}
                onChange={(v) => setForm((f) => ({ ...f, refrigeration_leakage_kg: Math.max(0, v) }))}
                unit="kg"
                min={0}
                step={0.1}
              />
              <Field
                label="Lighting"
                value={form.lighting_kwh}
                onChange={(v) => setForm((f) => ({ ...f, lighting_kwh: Math.max(0, v) }))}
                unit="kWh"
                min={0}
              />
              <Field
                label="Store floor area"
                value={form.store_floor_area_sqft}
                onChange={(v) => setForm((f) => ({ ...f, store_floor_area_sqft: Math.max(0, v) }))}
                unit="sq ft"
                min={0}
              />
              <Field
                label="Store operating hours"
                value={form.store_operating_hours}
                onChange={(v) => setForm((f) => ({ ...f, store_operating_hours: Math.max(0, v) }))}
                unit="hrs/month"
                min={0}
              />
            </div>
          </CollapsibleCard>

          <CollapsibleCard title="Raw Materials & Procurement" defaultOpen={false}>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <Field
                label="Supplier emission intensity"
                value={form.supplier_emission_intensity}
                onChange={(v) => setForm((f) => ({ ...f, supplier_emission_intensity: Math.max(0, v) }))}
                unit="kg CO₂e/unit"
                min={0}
                step={0.1}
              />
              <SelectInline
                label="Material type"
                value={form.procurement_material_type}
                onChange={(v) => setForm((f) => ({ ...f, procurement_material_type: v }))}
                options={[
                  { value: "cocoa butter milk chocolate", label: "Cocoa butter milk chocolate" },
                  { value: "meat", label: "Meat" },
                  { value: "butter", label: "Butter" },
                  { value: "milk", label: "Milk" },
                  { value: "fish", label: "Fish" },
                  { value: "chicken", label: "Chicken" },
                  { value: "fruits", label: "Fruits" },
                  { value: "nuts", label: "Nuts" },
                  { value: "soy", label: "Soy" },
                ]}
              />
              <SelectInline
                label="Sourcing geography"
                value={form.sourcing_geography}
                onChange={(v) => setForm((f) => ({ ...f, sourcing_geography: v }))}
                options={[
                  { value: "EU", label: "EU" },
                  { value: "SEA", label: "SEA" },
                  { value: "LATAM", label: "LATAM" },
                  { value: "NA", label: "NA" },
                  { value: "APAC", label: "APAC" },
                ]}
              />
              <Field
                label="Lifecycle emissions per material"
                value={form.lifecycle_emissions_per_unit}
                onChange={(v) => setForm((f) => ({ ...f, lifecycle_emissions_per_unit: Math.max(0, v) }))}
                unit="kg CO₂e/unit"
                min={0}
                step={0.1}
              />
              <Field
                label="Quantity purchased"
                value={form.quantity_purchased}
                onChange={(v) => setForm((f) => ({ ...f, quantity_purchased: Math.max(0, v) }))}
                unit="units"
                min={0}
              />
            </div>
          </CollapsibleCard>
        </div>

        {/* ── RIGHT: Results ── */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>

          <DashboardInsights
            companyId={company?.id ?? null}
            selectedYear={year}
            selectedMonth={month}
            snapshot={emissions}
          />

          {/* Chart card */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: "20px",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>
                  Emissions breakdown
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Calculated from your submitted operational data
                </div>
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 8,
                background: "var(--accent-soft)",
                border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                color: "var(--accent)", fontSize: 11, fontWeight: 600,
              }}>
                <Activity style={{ width: 11, height: 11 }} />
                Live snapshot
              </span>
            </div>

            {emissions ? (
              <CarbonChart data={emissions} />
            ) : (
              <div style={{
                minHeight: 280,
                display: "grid", placeItems: "center",
                borderRadius: "var(--r-md)",
                border: "1px dashed var(--border-strong)",
                background: "var(--surface-2)",
                color: "var(--muted)", fontSize: 13, textAlign: "center",
              }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <Sparkles style={{ width: 28, height: 28, margin: "0 auto", opacity: 0.25, color: "var(--primary)" }} />
                  <span>Enter data and click <strong style={{ color: "var(--text)" }}>Calculate</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Hotspots card */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: "20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>
                  Emission hotspots
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Top contributors by category</div>
              </div>
              <Flame style={{ width: 15, height: 15, color: "var(--muted)" }} />
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {(hotspots.length ? hotspots : [["Energy", 0], ["Transport", 0], ["Waste", 0]] as any)
                .map(([name, val]: any, idx: number) => {
                  const pct = emissions ? (val / hotspotMax) * 100 : 0
                  return (
                    <div key={idx} style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-secondary)" }}>{name}</span>
                        <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: '"DM Mono", monospace' }}>
                          {emissions ? `${fmt(val)} kg CO₂e` : "—"}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden" }}>
                        <motion.div
                          style={{ height: "100%", borderRadius: 99, background: HOTSPOT_COLORS[idx] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.55, ease: "easeOut", delay: idx * 0.08 }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive: stack on narrow screens */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

/* ── Inline text input helper for the add-company form ── */
function InlineInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          height: 32, padding: "0 9px",
          borderRadius: "var(--r-sm)",
          border: `1px solid ${focused ? "var(--primary)" : "var(--border-strong)"}`,
          background: focused ? "var(--surface)" : "var(--surface-2)",
          color: "var(--text)", fontSize: 12.5,
          fontFamily: "Outfit, sans-serif",
          outline: "none",
          boxShadow: focused ? "0 0 0 3px var(--primary-dim)" : "none",
          transition: "border-color 0.13s, box-shadow 0.13s, background 0.13s",
          width: "100%",
        }}
      />
    </label>
  )
}