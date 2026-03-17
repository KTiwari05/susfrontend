import SectionHeader from "../components/SectionHeader"

const EMISSION_FACTOR_URL = "https://carbon-app-uadb.onrender.com"

export default function EmissionFactors() {
  return (
    <div className="grid gap-6">
      <SectionHeader
        eyebrow="Emission Factors"
        title=""
      />

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
          height: "calc(100dvh - 140px)",
          minHeight: 650,
          width: "100%",
          maxWidth: 2800,
          margin: "0 auto",
        }}
      >
        <iframe
          title="Emission factors"
          src={EMISSION_FACTOR_URL}
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        />
      </div>
    </div>
  )
}
