"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { formatPercent, formatCurrency, formatDate } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { getRiskTierConfigs, getPolicies } from "@/lib/api"
import { Settings, TrendingUp, ChevronRight } from "lucide-react"

const TIER_BG: Record<string, string> = {
  A: "bg-green-50 border-green-200",
  B: "bg-blue-50 border-blue-200",
  C: "bg-amber-50 border-amber-200",
  F: "bg-red-50 border-red-200",
}
const TIER_TEXT: Record<string, string> = { A: "text-green-800", B: "text-blue-800", C: "text-amber-800", F: "text-red-800" }

export default function ConfigPage() {
  const tiersQuery = useQuery({ queryKey: ["risk-tiers"], queryFn: getRiskTierConfigs })
  const policiesQuery = useQuery({ queryKey: ["policies"], queryFn: () => getPolicies() })

  const tiers = tiersQuery.data ?? []
  const policyCounts = (policiesQuery.data ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <PageHeader title="Configuration" description="Risk tier rates and loan policy settings" />

      {/* Tier summary cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Risk Tier Rates</h2>
        {tiersQuery.isPending ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiers.map((tier) => (
              <div key={tier.tier} className={`rounded-lg border p-5 ${TIER_BG[tier.tier] ?? "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-2xl font-black ${TIER_TEXT[tier.tier] ?? ""}`}>Tier {tier.tier}</span>
                  <TrendingUp className={`h-5 w-5 ${TIER_TEXT[tier.tier] ?? ""}`} />
                </div>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Default Rate</dt>
                    <dd className="font-semibold">{formatPercent(tier.default_interest_rate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Range</dt>
                    <dd className="font-medium">{formatPercent(tier.min_interest_rate)} – {formatPercent(tier.max_interest_rate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Max Loan</dt>
                    <dd className="font-medium">{formatCurrency(tier.max_loan_amount)}</dd>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-gray-200">
                    <dt>Effective</dt>
                    <dd>{formatDate(tier.effective_from, "MMM d, yyyy")}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <Link href="/config/interest-rates" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
            Manage Interest Rates <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Policy counts */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Loan Policies</h2>
        {policiesQuery.isPending ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(["LIMITS", "UNDERWRITING", "DISBURSEMENT", "KYC"] as const).map((cat) => (
              <div key={cat} className="rounded-lg border bg-white p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 capitalize">{cat.toLowerCase()}</p>
                  <p className="text-2xl font-bold text-gray-900">{policyCounts[cat] ?? 0}</p>
                  <p className="text-xs text-gray-400">active policies</p>
                </div>
                <Settings className="h-8 w-8 text-gray-200" />
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <Link href="/config/policies" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
            Manage Policies <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
