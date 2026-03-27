"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatCurrency, formatPercent } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { getDisbursementsReport } from "@/lib/api"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts"

type Period = 7 | 30 | 90
type GroupBy = "day" | "week" | "month"

export default function DisbursementsReportPage() {
  const [period, setPeriod] = useState<Period>(30)
  const [groupBy, setGroupBy] = useState<GroupBy>("day")

  const { data, isPending } = useQuery({
    queryKey: ["disb-report", period, groupBy],
    queryFn: () => getDisbursementsReport({ period_days: period, group_by: groupBy }),
  })

  const chart = data?.chart_data ?? []
  const summary = data?.summary

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disbursements Report"
        description="Loan disbursement volume, average loan size, and revenue projections"
        action={
          <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
            {([7, 30, 90] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`rounded-md px-3 py-1 text-sm font-medium ${period === p ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{p}d</button>
            ))}
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {isPending
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          : summary && [
            { label: "Total Count", value: String(summary.total_count) },
            { label: "Total Amount", value: formatCurrency(summary.total_amount) },
            { label: "Avg Loan", value: formatCurrency(summary.avg_loan_amount) },
            { label: "Avg Rate", value: formatPercent(summary.avg_interest_rate) },
            { label: "Avg Tenure", value: `${summary.avg_tenure_months.toFixed(0)} mo` },
            { label: "Interest Income", value: formatCurrency(summary.total_interest_income) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border bg-white p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
      </div>

      {/* Bar chart: volume over time */}
      <div className="rounded-lg border bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Disbursement Volume</h3>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            {(["day", "week", "month"] as GroupBy[]).map((g) => (
              <button key={g} onClick={() => setGroupBy(g)} className={`rounded px-2.5 py-1 text-xs capitalize ${groupBy === g ? "bg-blue-600 text-white" : "text-gray-600"}`}>{g}</button>
            ))}
          </div>
        </div>
        {isPending ? <Skeleton className="h-56 w-full" /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="count" name="Count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="total_amount" name="Total Amount ($)" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Line chart: avg loan size trend */}
      <div className="rounded-lg border bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Average Loan Size Trend</h3>
        {isPending ? <Skeleton className="h-48 w-full" /> : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chart} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Line type="monotone" dataKey="avg_amount" name="Avg Loan Size" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
