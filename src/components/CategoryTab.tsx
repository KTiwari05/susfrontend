import React from "react"
import { motion } from "framer-motion"

interface CategoryTabProps {
  group: string
  icon: React.ReactNode
  color: string
  bg: string
  active: boolean
  onClick: () => void
}

const CategoryTab: React.FC<CategoryTabProps> = ({ 
  group, 
  icon, 
  color, 
  bg, 
  active, 
  onClick 
}) => {
  return (
    <motion.button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 12px",
        borderRadius: "8px",
        border: "none",
        background: active ? bg : "transparent",
        color: active ? color : "#6b7280",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: active ? 600 : 500,
        transition: "all 0.2s ease",
        whiteSpace: "nowrap"
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {icon}
      <span>{group}</span>
    </motion.button>
  )
}

export default CategoryTab
