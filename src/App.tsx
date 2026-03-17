import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Navbar from "./components/Navbar"
import Dashboard from "./pages/Dashboard"
import Simulator from "./pages/Simulator"
import Copilot from "./pages/Copilot"
import Reports from "./pages/Reports"
import Analytics from "./pages/Analytics"
import EmissionFactors from "./pages/EmissionFactors"

export type AppPage = "dashboard" | "analytics" | "simulator" | "copilot" | "reports" | "emission-factors"

export default function App() {
  const [page, setPage] = useState<AppPage>("dashboard")

  const content = useMemo(() => {
    if (page === "dashboard") return <Dashboard />
    if (page === "analytics") return <Analytics />
    if (page === "simulator") return <Simulator />
    if (page === "copilot") return <Copilot />
    if (page === "emission-factors") return <EmissionFactors />
    return <Reports />
  }, [page])

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text)" }}>
      <Navbar page={page} onNavigate={setPage} />

      <main style={{ width: "100%" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="page-wrap"
            style={{ paddingTop: 28, paddingBottom: 56 }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
