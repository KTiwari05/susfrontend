import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

export type ThemeMode = "light" | "dark"

type ThemeValue = {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeValue | null>(null)

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  root.setAttribute("data-theme", theme)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem("sustainai_theme")
    return stored === "light" || stored === "dark" ? stored : "light"
  })

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem("sustainai_theme", theme)
  }, [theme])

  const value = useMemo<ThemeValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggle: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
