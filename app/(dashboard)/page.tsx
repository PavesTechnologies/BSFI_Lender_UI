"use client"

import { useQuery } from "@tanstack/react-query"
import { formatCurrency, formatPercent, formatDate, cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardKPIs, getApplicationsReport, getRiskDistribution } from "@/lib/api"
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts"
import { TrendingUp, Clock, CheckCircle, XCircle, DollarSign, BarChart2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  highlight?: boolean
}

function KpiCard({ label, value, sub, icon, highlight }: KpiCardProps) {
  return (
    <div className={cn("rounded-lg border bg-white p-5 flex items-start gap-4", highlight ? "border-red-300 bg-red-50" : "border-gray-200")}>
      <div className={cn("rounded-lg p-2.5", highlight ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-600")}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recharts custom tooltip
// ---------------------------------------------------------------------------
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-gray-700">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

const DECISION_COLORS: Record<string, string> = {
  approved: "#22c55e",
  declined: "#ef4444",
  counter_offer: "#f59e0b",
  pending: "#94a3b8",
}

const TIER_COLORS: Record<string, string> = { A: "#22c55e", B: "#3b82f6", C: "#f59e0b", F: "#ef4444" }

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const kpiQuery = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: () => getDashboardKPIs(30),
    refetchInterval: 60_000,
  })

  const appsReportQuery = useQuery({
    queryKey: ["apps-report", 30],
    queryFn: () => getApplicationsReport({ period_days: 30, group_by: "day" }),
  })

  const riskQuery = useQuery({
    queryKey: ["risk-dist", 30],
    queryFn: () => getRiskDistribution(30),
  })

  const kpi = kpiQuery.data
  const appsChart = appsReportQuery.data?.chart_data ?? []
  const riskData = riskQuery.data?.by_tier ?? []

  // Donut data
  const donutData = kpi ? [
    { name: "Approved", value: kpi.approved_today, color: "#22c55e" },
    { name: "Pending", value: kpi.pending_review + kpi.in_review, color: "#94a3b8" },
    { name: "Rejected", value: kpi.rejected_today, color: "#ef4444" },
  ].filter((d) => d.value > 0) : []

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Loan portfolio overview — last 30 days" />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpiQuery.isPending ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
        ) : kpi ? (
          <>
            <KpiCard label="Total Applications" value={String(kpi.total_applications)} icon={<BarChart2 className="h-5 w-5" />} />
            <KpiCard label="Pending Review" value={String(kpi.pending_review)} highlight={kpi.pending_review > 10} icon={<Clock className="h-5 w-5" />} sub="Awaiting officer" />
            <KpiCard label="Approved (30d)" value={String(kpi.approved_today)} icon={<CheckCircle className="h-5 w-5" />} />
            <KpiCard label="Approval Rate" value={formatPercent(kpi.approval_rate_percent)} icon={<TrendingUp className="h-5 w-5" />} />
            <KpiCard label="Total Disbursed" value={formatCurrency(kpi.total_disbursed_amount)} icon={<DollarSign className="h-5 w-5" />} />
            <KpiCard label="Avg Risk Score" value={kpi.avg_risk_score.toFixed(0)} icon={<XCircle className="h-5 w-5" />} />
          </>
        ) : null}
      </div>

      {/* Charts row */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Bar chart: volume by day */}
        <div className="rounded-lg border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Application Volume (30d)</h3>
          {appsReportQuery.isPending ? <Skeleton className="h-48 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={appsChart} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="approved" name="Approved" stackId="a" fill={DECISION_COLORS.approved} />
                <Bar dataKey="declined" name="Declined" stackId="a" fill={DECISION_COLORS.declined} />
                <Bar dataKey="pending" name="Pending" stackId="a" fill={DECISION_COLORS.pending} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut: decision breakdown */}
        <div className="rounded-lg border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Decision Breakdown</h3>
          {kpiQuery.isPending ? <Skeleton className="h-48 w-full" /> : donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-12">No data available</p>}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Risk tier table */}
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h3 className="text-sm font-semibold text-gray-900">Risk Tier Breakdown</h3>
          </div>
          {riskQuery.isPending ? <Skeleton className="h-32 m-4" /> : (
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Tier", "Applications", "Approval Rate", "Avg Loan"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {riskData.map((row) => (
                  <tr key={row.tier} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold", TIER_COLORS[row.tier] ? `text-white` : "")} style={{ backgroundColor: TIER_COLORS[row.tier] }}>{row.tier}</span>
                    </td>
                    <td className="px-4 py-2">{row.count}</td>
                    <td className="px-4 py-2">{formatPercent(row.approval_rate)}</td>
                    <td className="px-4 py-2">{row.total_amount && row.count ? formatCurrency(row.total_amount / row.count) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary stats */}
        {kpi && (
          <div className="rounded-lg border bg-white p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Portfolio Stats</h3>
            <dl className="space-y-2 text-sm">
              {[
                { label: "In Review", value: String(kpi.in_review) },
                { label: "Rejected (30d)", value: String(kpi.rejected_today) },
                { label: "Avg Loan Amount", value: formatCurrency(kpi.avg_loan_amount) },
                { label: "Avg Processing Time", value: `${kpi.avg_processing_time_hours.toFixed(1)} hrs` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1 border-b border-gray-50">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-semibold text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
