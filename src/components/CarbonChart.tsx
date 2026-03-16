import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts"

const COLORS = ["#22c55e", "#60a5fa", "#f59e0b", "#a78bfa", "#f43f5e"]

export default function CarbonChart({ data }: any) {

  const chartData = [
    {name:"Energy", value:data.energy_emissions},
    {name:"Transport", value:data.transport_emissions},
    {name:"Waste", value:data.waste_emissions},
    {name:"Water", value:data.water_emissions},
    {name:"Supply Chain", value:data.supply_chain_emissions},
  ]

  return (
    <div className="grid w-full gap-4 md:grid-cols-[320px_1fr] md:items-center">
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>

            <Pie data={chartData} dataKey="value" outerRadius={120} innerRadius={70} paddingAngle={2}>
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--text)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-2">
        {chartData.map((d, idx) => (
          <div
            key={d.name}
            className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
              <span className="text-sm text-[color:var(--text)]">{d.name}</span>
            </div>
            <span className="text-sm text-[color:var(--muted)]">{Number(d.value).toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}