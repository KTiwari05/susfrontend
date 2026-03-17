import type React from "react"
import {
  Brain,
  ChartPie,
  Leaf,
  LineChart,
  MessageSquare,
  SlidersHorizontal,
  Calculator,
  ChevronDown,
  Building2,
  Calendar,
  Hash,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { AppPage } from "../App"
import ThemeToggle from "./ThemeToggle"
import { useEffect, useState } from "react"
import API from "../api/api"
import { type Company, useAppState } from "../state/appState"

/* ════════════════════════════════════════════════════════
   NAV ITEMS CONFIG
════════════════════════════════════════════════════════ */
const NAV_ITEMS: { page: AppPage; label: string; icon: React.ReactNode }[] = [
  { page: "dashboard", label: "Dashboard",  icon: <ChartPie className="h-[15px] w-[15px]" /> },
  { page: "simulator", label: "Simulator",  icon: <SlidersHorizontal className="h-[15px] w-[15px]" /> },
  { page: "copilot",   label: "Copilot",    icon: <MessageSquare className="h-[15px] w-[15px]" /> },
  { page: "analytics", label: "Analytics",  icon: <LineChart className="h-[15px] w-[15px]" /> },
  { page: "reports",   label: "Reports",    icon: <Brain className="h-[15px] w-[15px]" /> },
]

const EMISSION_FACTOR_URL = "https://carbon-app-uadb.onrender.com"

/* ════════════════════════════════════════════════════════
   NAV ITEM
════════════════════════════════════════════════════════ */
function NavItem({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean
  label: string
  onClick: () => void
  icon: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-2 px-1 outline-none"
      style={{
        height: "var(--nav-h)",
        color: active ? "var(--primary)" : hovered ? "var(--text)" : "var(--muted)",
        transition: "color 0.15s ease",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        letterSpacing: "-0.01em",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0 2px",
      }}
    >
      {/* Icon with gentle scale on hover */}
      <motion.span
        animate={{ scale: hovered || active ? 1.08 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        style={{ display: "flex", opacity: active ? 1 : 0.75 }}
      >
        {icon}
      </motion.span>

      <span className="hidden sm:inline">{label}</span>

      {/* Active underline — shared layoutId so it slides */}
      <AnimatePresence>
        {active && (
          <motion.span
            layoutId="nav-pill"
            initial={{ opacity: 0, scaleX: 0.5 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0.5 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              borderRadius: 99,
              background: "var(--primary)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Hover background fill */}
      {hovered && !active && (
        <motion.span
          layoutId="nav-hover-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          style={{
            position: "absolute",
            inset: "10px -6px",
            borderRadius: 8,
            background: "var(--surface-2)",
            zIndex: -1,
          }}
        />
      )}
    </button>
  )
}

function NavExternal({
  label,
  href,
  icon,
}: {
  label: string
  href: string
  icon: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={href}
      target="_self"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-2 px-1 outline-none"
      style={{
        height: "var(--nav-h)",
        color: hovered ? "var(--text)" : "var(--muted)",
        transition: "color 0.15s ease",
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "-0.01em",
        textDecoration: "none",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0 2px",
      }}
    >
      <motion.span
        animate={{ scale: hovered ? 1.08 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        style={{ display: "flex", opacity: 0.8 }}
      >
        {icon}
      </motion.span>
      <span className="hidden sm:inline">{label}</span>

      {hovered && (
        <motion.span
          layoutId="nav-hover-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          style={{
            position: "absolute",
            inset: "10px -6px",
            borderRadius: 8,
            background: "var(--surface-2)",
            zIndex: -1,
          }}
        />
      )}
    </a>
  )
}

/* ════════════════════════════════════════════════════════
   CONTROL FIELD — shared wrapper for navbar inputs
════════════════════════════════════════════════════════ */
function ControlField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 px-0.5">
        <span style={{ color: "var(--muted)", display: "flex" }}>{icon}</span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   COMPANY SELECTOR
════════════════════════════════════════════════════════ */
function CompanySelector({
  companies,
  company,
  loading,
  onChange,
}: {
  companies: Company[]
  company: Company | null
  loading: boolean
  onChange: (c: Company | null) => void
}) {
  const [focused, setFocused] = useState(false)

  return (
    <ControlField icon={<Building2 className="h-3 w-3" />} label="Company">
      <div className="relative" style={{ minWidth: 148, maxWidth: 200 }}>
        <select
          value={company ? String(company.id) : ""}
          disabled={loading}
          onChange={(e) => onChange(companies.find((x) => String(x.id) === e.target.value) ?? null)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            height: 32,
            paddingLeft: 10,
            paddingRight: 26,
            borderRadius: "var(--r-sm)",
            border: `1px solid ${focused ? "var(--primary)" : "var(--border-strong)"}`,
            background: focused ? "var(--surface)" : "var(--surface-2)",
            color: "var(--text)",
            fontSize: 12.5,
            fontFamily: "Outfit, sans-serif",
            fontWeight: 500,
            appearance: "none",
            outline: "none",
            boxShadow: focused ? "0 0 0 3px var(--primary-dim)" : "none",
            transition: "border-color 0.13s, box-shadow 0.13s, background 0.13s",
            cursor: "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {!companies.length && (
            <option value="">{loading ? "Loading…" : "No companies"}</option>
          )}
          {companies.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute"
          style={{
            right: 7,
            top: "50%",
            transform: "translateY(-50%)",
            height: 11,
            width: 11,
            color: "var(--muted)",
          }}
        />
      </div>
    </ControlField>
  )
}

/* ════════════════════════════════════════════════════════
   NUMBER FIELD (year / month)
════════════════════════════════════════════════════════ */
function NumberField({
  label,
  icon,
  value,
  onChange,
  min,
  max,
  width,
}: {
  label: string
  icon: React.ReactNode
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  width: number
}) {
  const [focused, setFocused] = useState(false)

  return (
    <ControlField icon={icon} label={label}>
      <input
        type="number"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) =>
          onChange(Math.max(min, Math.min(max, Math.floor(Number(e.target.value) || value))))
        }
        style={{
          width,
          height: 32,
          paddingInline: 9,
          borderRadius: "var(--r-sm)",
          border: `1px solid ${focused ? "var(--primary)" : "var(--border-strong)"}`,
          background: focused ? "var(--surface)" : "var(--surface-2)",
          color: "var(--text)",
          fontSize: 12.5,
          fontFamily: '"DM Mono", monospace',
          fontWeight: 500,
          outline: "none",
          boxShadow: focused ? "0 0 0 3px var(--primary-dim)" : "none",
          transition: "border-color 0.13s, box-shadow 0.13s, background 0.13s",
        }}
      />
    </ControlField>
  )
}

/* ════════════════════════════════════════════════════════
   NAVBAR
════════════════════════════════════════════════════════ */
export default function Navbar({
  page,
  onNavigate,
}: {
  page: AppPage
  onNavigate: (p: AppPage) => void
}) {
  const { company, setCompany, year, setYear, month, setMonth } = useAppState()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)

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
  }, [setCompany])

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        width: "100%",
        /* Edge-to-edge background */
        background: "color-mix(in srgb, var(--bg) 85%, transparent)",
        backdropFilter: "blur(16px) saturate(1.6)",
        WebkitBackdropFilter: "blur(16px) saturate(1.6)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* ── Main bar — full width, padded inside ── */}
      <div
        className="page-wrap"
        style={{
          display: "flex",
          alignItems: "center",
          height: "var(--nav-h)",
          gap: 0,
        }}
      >
        {/* ── Brand ── */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginRight: 32,
            flexShrink: 0,
            cursor: "default",
          }}
        >
          <motion.div
            whileHover={{ rotate: -6 }}
            transition={{ type: "spring", stiffness: 300, damping: 16 }}
            style={{
              width: 34,
              height: 34,
              display: "grid",
              placeItems: "center",
              borderRadius: 10,
              background: "var(--primary-soft)",
              border: "1px solid var(--primary-muted)",
              flexShrink: 0,
            }}
          >
            <Leaf style={{ width: 16, height: 16, color: "var(--primary)" }} />
          </motion.div>

          <div style={{ lineHeight: 1.25 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "var(--text)",
              }}
            >
              TCS Envirozone AI
            </div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              Carbon Intelligence
            </div>
          </div>
        </motion.div>

        {/* ── Desktop nav links ── */}
        <nav
          className="hidden md:flex"
          style={{ alignItems: "center", gap: 20, flex: 1 }}
        >
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.page}
              active={page === item.page}
              label={item.label}
              onClick={() => onNavigate(item.page)}
              icon={item.icon}
            />
          ))}
          <NavExternal
            label="EF Agent"
            href={EMISSION_FACTOR_URL}
            icon={<Calculator className="h-[15px] w-[15px]" />}
          />
        </nav>

        {/* ── Right controls ── */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginLeft: "auto" }}>
          {/* Context controls — lg+ only */}
          <div
            className="hidden lg:flex"
            style={{
              alignItems: "flex-end",
              gap: 6,
              padding: "5px 10px",
              borderRadius: "var(--r-md)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <CompanySelector
              companies={companies}
              company={company}
              loading={loadingCompanies}
              onChange={setCompany}
            />

            {/* Separator */}
            <div style={{ width: 1, height: 28, background: "var(--border-strong)", alignSelf: "flex-end", marginBottom: 2 }} />

            <NumberField
              label="Year"
              icon={<Calendar className="h-3 w-3" />}
              value={year}
              onChange={setYear}
              min={2000}
              max={2100}
              width={76}
            />
            <NumberField
              label="Month"
              icon={<Hash className="h-3 w-3" />}
              value={month}
              onChange={setMonth}
              min={1}
              max={12}
              width={60}
            />
          </div>

          <ThemeToggle />
        </div>
      </div>

      {/* ── Mobile nav + context controls (no hamburger) ── */}
      <div className="page-wrap md:hidden" style={{ paddingTop: 8, paddingBottom: 12 }}>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: 2,
          }}
        >
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.page}
              active={page === item.page}
              label={item.label}
              onClick={() => onNavigate(item.page)}
              icon={item.icon}
            />
          ))}
          <NavExternal
            label="Emission Factors"
            href={EMISSION_FACTOR_URL}
            icon={<Calculator className="h-[15px] w-[15px]" />}
          />
        </nav>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: 8,
            marginTop: 10,
            padding: "10px 10px",
            borderRadius: "var(--r-md)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}
        >
          <CompanySelector
            companies={companies}
            company={company}
            loading={loadingCompanies}
            onChange={setCompany}
          />
          <NumberField
            label="Year"
            icon={<Calendar className="h-3 w-3" />}
            value={year}
            onChange={setYear}
            min={2000}
            max={2100}
            width={84}
          />
          <NumberField
            label="Month"
            icon={<Hash className="h-3 w-3" />}
            value={month}
            onChange={setMonth}
            min={1}
            max={12}
            width={68}
          />
        </div>
      </div>
    </header>
  )
}
