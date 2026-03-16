import { Moon, Sun } from "lucide-react"
import { motion } from "framer-motion"
import { useTheme } from "../state/theme"

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)] shadow-sm transition"
      title="Toggle theme"
    >
      {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
    </motion.button>
  )
}
