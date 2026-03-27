"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatCurrency, formatPercent, cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { getRiskDistribution, getReviewPerformance } from "@/lib/api"
import { getStoredUser } from "@/lib/auth"
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"

type Period = 7 | 30 | 90

const TIER_COLORS: Record<string, string> = { A: "#22c55e", B: "#3b82f6", C: "#f59e0b", F: "#ef4444" }

export default function RiskReportPage() {
  const [period, setPeriod] = useState<Period>(30)
  const user = typeof window !== "undefined" ? getStoredUser() : null
  const isManagerPlus = user?.role === "MANAGER" || user?.role === "ADMIN"

  const riskQuery = useQuery({
    queryKey: ["risk-dist", period],
    queryFn: () => getRiskDistribution(period),
  })

  const perfQuery = useQuery({
    queryKey: ["review-perf", period],
    queryFn: () => getReviewPerformance(period),
    enabled: isManagerPlus,
  })

  const tiers = riskQuery.data?.by_tier ?? []
  const perf = perfQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Report"
        description="Application distribution by risk tier and officer performance"
        action={
          <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
            {([7, 30, 90] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`rounded-md px-3 py-1 text-sm font-medium ${period === p ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{p}d</button>
            ))}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Donut: count by tier */}
        <div className="rounded-lg border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Applications by Risk Tier</h3>
          {riskQuery.isPending ? <Skeleton className="h-48 w-full" /> : tiers.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tiers} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="count" nameKey="tier">
                  {tiers.map((t) => <Cell key={t.tier} fill={TIER_COLORS[t.tier] ?? "#94a3b8"} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, `Tier ${n}`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-center py-12 text-gray-400">No data</p>}
        </div>

        {/* Bar: approval rate by tier */}
        <div className="rounded-lg border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Approval Rate by Tier</h3>
          {riskQuery.isPending ? <Skeleton className="h-48 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tiers} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                <Bar dataKey="approval_rate" name="Approval %" radius={[4, 4, 0, 0]}>
                  {tiers.map((t) => <Cell key={t.tier} fill={TIER_COLORS[t.tier] ?? "#94a3b8"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Per-tier table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-5 py-4 border-b"><h3 className="text-sm font-semibold text-gray-900">Risk Tier Details</h3></div>
        {riskQuery.isPending ? <Skeleton className="h-32 m-4" /> : (
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {["Tier", "Count", "Total Amount", "Avg Rate", "Approval Rate"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tiers.map((t) => (
                <tr key={t.tier} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: TIER_COLORS[t.tier] }}>{t.tier}</span>
                  </td>
                  <td className="px-4 py-2">{t.count}</td>
                  <td className="px-4 py-2">{formatCurrency(t.total_amount)}</td>
                  <td className="px-4 py-2">{formatPercent(t.avg_rate)}</td>
                  <td className="px-4 py-2">{formatPercent(t.approval_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Officer performance — MANAGER+ only */}
      {isManagerPlus && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Officer Performance</h3>
            {perf && (
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Override Rate: <strong>{formatPercent(perf.override_rate_percent)}</strong></span>
                <span>AI Agreement: <strong>{formatPercent(perf.ai_agreement_rate)}</strong></span>
              </div>
            )}
          </div>
          {perfQuery.isPending ? <Skeleton className="h-32 m-4" /> : perf?.by_officer && (
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Officer", "Reviewed", "Approved", "Rejected", "Overridden", "Avg Review Time"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {perf.by_officer.map((o) => (
                  <tr key={o.officer_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{o.officer_name}</td>
                    <td className="px-4 py-2">{o.reviewed_count}</td>
                    <td className="px-4 py-2 text-green-700">{o.approved}</td>
                    <td className="px-4 py-2 text-red-700">{o.rejected}</td>
                    <td className="px-4 py-2 text-purple-700">{o.overridden}</td>
                    <td className="px-4 py-2 text-gray-500">{o.avg_review_time_hours.toFixed(1)} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
