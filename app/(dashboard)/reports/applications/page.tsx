"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatCurrency, formatPercent } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getApplicationsReport } from "@/lib/api"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts"

type Period = 7 | 30 | 90
type GroupBy = "day" | "week" | "month"

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
]

const LOAN_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"]

export default function ApplicationsReportPage() {
  const [period, setPeriod] = useState<Period>(30)
  const [groupBy, setGroupBy] = useState<GroupBy>("day")

  const { data, isPending } = useQuery({
    queryKey: ["apps-report", period, groupBy],
    queryFn: () => getApplicationsReport({ period_days: period, group_by: groupBy }),
  })

  const chart = data?.chart_data ?? []
  const summary = data?.summary

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications Report"
        description="Application volume, trends, and decision breakdown"
        action={
          <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setPeriod(o.value)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${period === o.value ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {isPending
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          : summary && (
            [
              { label: "Total", value: String(summary.total) },
              { label: "Approved", value: String(summary.approved), color: "text-green-700" },
              { label: "Declined", value: String(summary.declined), color: "text-red-700" },
              { label: "Counter Offer", value: String(summary.counter_offer), color: "text-amber-700" },
              { label: "Pending Review", value: String(summary.pending_human_review), color: "text-blue-700" },
              { label: "Human Rejected", value: String(summary.human_rejected), color: "text-red-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border bg-white p-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${color ?? "text-gray-900"}`}>{value}</p>
              </div>
            ))
          )}
      </div>

      {/* Line chart */}
      <div className="rounded-lg border bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Applications Over Time</h3>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            {(["day", "week", "month"] as GroupBy[]).map((g) => (
              <button key={g} onClick={() => setGroupBy(g)} className={`rounded px-2.5 py-1 text-xs capitalize ${groupBy === g ? "bg-blue-600 text-white" : "text-gray-600"}`}>{g}</button>
            ))}
          </div>
        </div>
        {isPending ? <Skeleton className="h-56 w-full" /> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chart} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" name="Total" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="approved" name="Approved" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="declined" name="Declined" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bar chart: by loan type (from chart data, grouped) */}
      {!isPending && chart.length > 0 && (
        <div className="rounded-lg border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Summary Statistics Table</h3>
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {["Metric", "Value"].map((h) => <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary && Object.entries(summary).map(([k, v]) => (
                <tr key={k} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-600 capitalize">{k.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2 font-semibold">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
