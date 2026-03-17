import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import API, { getApiErrorMessage } from "../api/api"

export type Emissions = {
  energy_emissions: number
  transport_emissions: number
  waste_emissions: number
  water_emissions: number
  supply_chain_emissions: number
  packaging_emissions?: number | null
  retail_operations_emissions?: number | null
  procurement_emissions?: number | null
  total_emissions: number
}

export type SimulationResult = {
  baseline_emissions: number
  new_total_emissions: number
  carbon_reduction_percentage: number
  sustainability_score: number
  estimated_cost_impact: number
}

export type Company = {
  id: number
  name: string
  industry?: string | null
  country?: string | null
}

export type Period = {
  year: number
  month: number
}

type AppStateValue = {
  company: Company | null
  setCompany: (value: Company | null) => void
  year: number
  setYear: (value: number) => void
  month: number
  setMonth: (value: number) => void
  availablePeriods: Period[]
  periodsLoading: boolean
  snapshotLoading: boolean
  snapshotError: string
  snapshotSource: "loaded" | "calculated" | ""
  emissions: Emissions | null
  emissionId: number | null
  setEmissions: (value: Emissions | null) => void
  setEmissionId: (value: number | null) => void
  simulationResult: SimulationResult | null
  setSimulationResult: (value: SimulationResult | null) => void
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [emissions, setEmissions] = useState<Emissions | null>(null)
  const [emissionId, setEmissionId] = useState<number | null>(null)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)

  const [availablePeriods, setAvailablePeriods] = useState<Period[]>([])
  const [periodsLoading, setPeriodsLoading] = useState(false)

  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotError, setSnapshotError] = useState("")
  const [snapshotSource, setSnapshotSource] = useState<"loaded" | "calculated" | "">("")

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sustainai_context")
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (typeof parsed?.year === "number") setYear(parsed.year)
      if (typeof parsed?.month === "number") setMonth(parsed.month)
      if (parsed?.company && typeof parsed.company.id === "number") {
        setCompany(parsed.company)
      }
    } catch {
      // ignore
    }
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("sustainai_context", JSON.stringify({ company, year, month }))
    } catch {
      // ignore
    }
  }, [company, year, month])

  useEffect(() => {
    let mounted = true
    const loadPeriods = async () => {
      if (!company) {
        setAvailablePeriods([])
        return
      }
      setPeriodsLoading(true)
      try {
        const res = await API.get("/emissions/periods", { params: { company_id: company.id } })
        const list = Array.isArray(res.data) ? (res.data as Period[]) : []
        if (!mounted) return
        setAvailablePeriods(list)
      } catch {
        if (!mounted) return
        setAvailablePeriods([])
      } finally {
        if (mounted) setPeriodsLoading(false)
      }
    }

    loadPeriods()
    return () => {
      mounted = false
    }
  }, [company])

  useEffect(() => {
    let mounted = true
    const loadSnapshot = async () => {
      if (!company) return
      setSnapshotLoading(true)
      setSnapshotError("")
      try {
        const res = await API.get("/emissions/by-period", {
          params: { company_id: company.id, year, month },
        })
        if (!mounted) return
        setEmissions(res.data?.emissions ?? null)
        setEmissionId(typeof res.data?.emission_id === "number" ? res.data.emission_id : null)
        setSnapshotSource("loaded")
      } catch (e: any) {
        const status = e?.response?.status
        if (!mounted) return
        if (status === 404) {
          setEmissions(null)
          setEmissionId(null)
          setSnapshotSource("")
        } else {
          setSnapshotError(getApiErrorMessage(e))
        }
      } finally {
        if (mounted) setSnapshotLoading(false)
      }
    }

    loadSnapshot()
    return () => {
      mounted = false
    }
  }, [company, year, month])

  const value = useMemo<AppStateValue>(
    () => ({
      company,
      setCompany,
      year,
      setYear,
      month,
      setMonth,
      availablePeriods,
      periodsLoading,
      snapshotLoading,
      snapshotError,
      snapshotSource,
      emissions,
      emissionId,
      setEmissions,
      setEmissionId: (v) => {
        setEmissionId(v)
        setSnapshotSource(v ? "calculated" : "")
      },
      simulationResult,
      setSimulationResult,
    }),
    [
      company,
      year,
      month,
      availablePeriods,
      periodsLoading,
      snapshotLoading,
      snapshotError,
      snapshotSource,
      emissions,
      emissionId,
      simulationResult,
    ]
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider")
  }
  return ctx
}
