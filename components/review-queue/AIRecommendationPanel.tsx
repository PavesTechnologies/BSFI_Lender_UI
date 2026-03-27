"use client"

import { useState } from "react"
import { cn, formatCurrency, formatPercent } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { CounterOfferOption, UnderwritingResultDetail } from "@/types"

interface AIRecommendationPanelProps {
  underwriting: UnderwritingResultDetail
  requestedAmount?: number | null
  requestedTenure?: number | null
  className?: string
}

const DECISION_CONFIG = {
  APPROVE: { label: "Approve", headerBg: "bg-green-50", headerBorder: "border-green-200", badgeClass: "bg-green-100 text-green-800 border-green-200" },
  COUNTER_OFFER: { label: "Counter Offer", headerBg: "bg-amber-50", headerBorder: "border-amber-200", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  DECLINE: { label: "Decline", headerBg: "bg-red-50", headerBorder: "border-red-200", badgeClass: "bg-red-100 text-red-800 border-red-200" },
}

function RiskScoreMeter({ score }: { score: number }) {
  // score is 0-1, normalise to percentage
  const pct = Math.min(100, Math.max(0, score > 1 ? score / 10 : score * 100))
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Risk Score</span>
        <span className="font-semibold text-gray-900">{score > 1 ? score.toFixed(0) : (score * 1000).toFixed(0)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CounterOfferCard({ option }: { option: CounterOfferOption }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
      <p className="text-xs font-semibold text-amber-800">{option.label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-gray-500">Amount</span>
        <span className="font-medium">{formatCurrency(option.principal_amount)}</span>
        <span className="text-gray-500">Rate</span>
        <span className="font-medium">{formatPercent(option.interest_rate)}</span>
        <span className="text-gray-500">Tenure</span>
        <span className="font-medium">{option.tenure_months} mo</span>
        <span className="text-gray-500">Monthly EMI</span>
        <span className="font-medium">{formatCurrency(option.monthly_emi)}</span>
      </div>
    </div>
  )
}

export function AIRecommendationPanel({ underwriting, requestedAmount, requestedTenure, className }: AIRecommendationPanelProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false)
  const cfg = DECISION_CONFIG[underwriting.decision] ?? DECISION_CONFIG.DECLINE

  return (
    <div className={cn("rounded-lg border bg-white overflow-hidden", cfg.headerBorder, className)}>
      {/* Header */}
      <div className={cn("px-4 py-3 border-b flex items-center gap-3", cfg.headerBg, cfg.headerBorder)}>
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", cfg.badgeClass)}>
          {cfg.label}
        </span>
        <span className="text-sm font-medium text-gray-700">AI Underwriting Recommendation</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Risk score meter */}
        {underwriting.risk_score != null && (
          <RiskScoreMeter score={underwriting.risk_score} />
        )}

        {/* Risk tier */}
        {underwriting.risk_tier && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Risk Tier</span>
            <Badge variant="outline" className="font-bold">{underwriting.risk_tier}</Badge>
          </div>
        )}

        {/* Comparison table */}
        {(requestedAmount != null || requestedTenure != null) && underwriting.decision === "APPROVE" && (
          <div className="rounded-md border border-gray-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Term</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Requested</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">AI Suggests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requestedAmount != null && (
                  <tr>
                    <td className="px-3 py-2 text-gray-600">Amount</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(requestedAmount)}</td>
                    <td className="px-3 py-2 text-right font-medium">{underwriting.approved_amount != null ? formatCurrency(underwriting.approved_amount) : "—"}</td>
                  </tr>
                )}
                {underwriting.interest_rate != null && (
                  <tr>
                    <td className="px-3 py-2 text-gray-600">Rate</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right font-medium">{formatPercent(underwriting.interest_rate)}</td>
                  </tr>
                )}
                {requestedTenure != null && (
                  <tr>
                    <td className="px-3 py-2 text-gray-600">Tenure</td>
                    <td className="px-3 py-2 text-right">{requestedTenure} mo</td>
                    <td className="px-3 py-2 text-right font-medium">{underwriting.tenure_months ?? "—"} mo</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* APPROVE: terms */}
        {underwriting.decision === "APPROVE" && underwriting.approved_amount != null && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-gray-50 p-2">
              <p className="text-xs text-gray-500">Amount</p>
              <p className="font-semibold">{formatCurrency(underwriting.approved_amount)}</p>
            </div>
            {underwriting.interest_rate != null && (
              <div className="rounded-md bg-gray-50 p-2">
                <p className="text-xs text-gray-500">Rate</p>
                <p className="font-semibold">{formatPercent(underwriting.interest_rate)}</p>
              </div>
            )}
            {underwriting.tenure_months != null && (
              <div className="rounded-md bg-gray-50 p-2">
                <p className="text-xs text-gray-500">Tenure</p>
                <p className="font-semibold">{underwriting.tenure_months} months</p>
              </div>
            )}
          </div>
        )}

        {/* COUNTER_OFFER: option cards */}
        {underwriting.decision === "COUNTER_OFFER" && underwriting.counter_offer_options && (
          <div className="space-y-2">
            {underwriting.counter_offer_options.map((opt) => (
              <CounterOfferCard key={opt.offer_id} option={opt} />
            ))}
          </div>
        )}

        {/* DECLINE: reason */}
        {underwriting.decision === "DECLINE" && underwriting.decline_reason && (
          <div className="rounded-md bg-red-50 border border-red-100 p-3 text-sm text-red-800">
            {underwriting.decline_reason}
          </div>
        )}

        {/* Reasoning accordion */}
        {underwriting.reasoning_steps.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setReasoningOpen((o) => !o)}
              className="flex w-full items-center gap-2 text-xs text-gray-500 hover:text-gray-700"
            >
              {reasoningOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              AI Reasoning ({underwriting.reasoning_steps.length} steps)
            </button>
            {reasoningOpen && (
              <ol className="mt-2 space-y-1 pl-4 text-xs text-gray-600">
                {underwriting.reasoning_steps.map((step, i) => (
                  <li key={i} className="list-decimal">{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
