interface LeverChipProps {
  label: string
  value: number
  color: string
  onClick: () => void
}

export default function LeverChip({ label, value, color, onClick }: LeverChipProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-3)"
        e.currentTarget.style.transform = "translateY(-1px)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--surface-2)"
        e.currentTarget.style.transform = "translateY(0)"
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
        }}
      />
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ color: "var(--foreground)" }}>{value}%</span>
    </div>
  )
}
