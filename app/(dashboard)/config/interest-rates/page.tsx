"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatPercent, formatCurrency, formatDate } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { getRiskTierConfigs, getRiskTierHistory, updateRiskTier } from "@/lib/api"
import { getStoredUser } from "@/lib/auth"
import { Edit2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"
import type { RiskTierConfig } from "@/types"

// ---------------------------------------------------------------------------
// Edit dialog (inline, not a modal — simpler for this context)
// ---------------------------------------------------------------------------
interface EditFormProps {
  tier: RiskTierConfig
  onClose: () => void
}

function EditRiskTierForm({ tier, onClose }: EditFormProps) {
  const qc = useQueryClient()
  const [step, setStep] = useState<"edit" | "review">("edit")
  const [form, setForm] = useState({
    default_interest_rate: String(tier.default_interest_rate),
    min_interest_rate: String(tier.min_interest_rate),
    max_interest_rate: String(tier.max_interest_rate),
    max_loan_amount: String(tier.max_loan_amount),
    min_loan_amount: String(tier.min_loan_amount),
    min_credit_score: String(tier.min_credit_score),
    max_dti_ratio: String(tier.max_dti_ratio),
    effective_from: new Date().toISOString().slice(0, 16),
    notes: "",
  })

  const f = (k: keyof typeof form) => Number(form[k])
  const isValid = f("min_interest_rate") <= f("default_interest_rate") && f("default_interest_rate") <= f("max_interest_rate")

  const mutation = useMutation({
    mutationFn: () =>
      updateRiskTier(tier.tier, {
        default_interest_rate: f("default_interest_rate"),
        min_interest_rate: f("min_interest_rate"),
        max_interest_rate: f("max_interest_rate"),
        max_loan_amount: f("max_loan_amount"),
        min_loan_amount: f("min_loan_amount"),
        min_credit_score: f("min_credit_score"),
        max_dti_ratio: f("max_dti_ratio"),
        effective_from: new Date(form.effective_from).toISOString(),
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["risk-tiers"] })
      qc.invalidateQueries({ queryKey: ["risk-tier-history"] })
      onClose()
    },
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  if (step === "review") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">This will affect all new applications from the effective date.</p>
        </div>
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-gray-500">Default Rate</dt><dd className="font-semibold">{formatPercent(f("default_interest_rate"))}</dd>
          <dt className="text-gray-500">Rate Range</dt><dd>{formatPercent(f("min_interest_rate"))} – {formatPercent(f("max_interest_rate"))}</dd>
          <dt className="text-gray-500">Max Loan</dt><dd>{formatCurrency(f("max_loan_amount"))}</dd>
          <dt className="text-gray-500">Effective From</dt><dd>{form.effective_from}</dd>
        </dl>
        <div className="flex gap-2">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex-1">{mutation.isPending ? "Saving…" : "Confirm & Save"}</Button>
          <Button variant="outline" onClick={() => setStep("edit")}>Back</Button>
        </div>
        {mutation.isError && <p className="text-xs text-red-600">Save failed. Please try again.</p>}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-4">
      {!isValid && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
          Min rate ≤ Default rate ≤ Max rate
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {(["min_interest_rate", "default_interest_rate", "max_interest_rate"] as const).map((k) => (
          <div key={k} className="space-y-1">
            <Label className="text-xs capitalize">{k.replace(/_/g, " ")} (%)</Label>
            <Input type="number" step="0.01" value={form[k]} onChange={set(k)} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["min_loan_amount", "max_loan_amount", "min_credit_score", "max_dti_ratio"] as const).map((k) => (
          <div key={k} className="space-y-1">
            <Label className="text-xs capitalize">{k.replace(/_/g, " ")}</Label>
            <Input type="number" value={form[k]} onChange={set(k)} />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Effective From</Label>
        <Input type="datetime-local" value={form.effective_from} onChange={set("effective_from")} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="Reason for change…" />
      </div>
      <div className="flex gap-2">
        <Button disabled={!isValid} onClick={() => setStep("review")} className="flex-1">Review Changes</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// History panel
// ---------------------------------------------------------------------------
function HistoryPanel({ tier }: { tier: string }) {
  const [open, setOpen] = useState(false)
  const { data } = useQuery({
    queryKey: ["risk-tier-history", tier],
    queryFn: () => getRiskTierHistory({ tier, page: 1, page_size: 10 }),
    enabled: open,
  })

  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Change History
      </button>
      {open && data && (
        <table className="mt-2 min-w-full text-xs divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>{["Rate", "Range", "Effective From", "Changed By", "Notes"].map((h) => <th key={h} className="px-3 py-1.5 text-left text-gray-500">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.items.map((h) => (
              <tr key={h.id}>
                <td className="px-3 py-1.5">{formatPercent(h.default_interest_rate)}</td>
                <td className="px-3 py-1.5">{formatPercent(h.min_interest_rate)} – {formatPercent(h.max_interest_rate)}</td>
                <td className="px-3 py-1.5">{formatDate(h.effective_from, "MMM d, yyyy")}</td>
                <td className="px-3 py-1.5">{h.created_by_name ?? "—"}</td>
                <td className="px-3 py-1.5 text-gray-500">{h.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function InterestRatesPage() {
  const user = typeof window !== "undefined" ? getStoredUser() : null
  const isAdmin = user?.role === "ADMIN"
  const [editingTier, setEditingTier] = useState<string | null>(null)

  const { data: tiers = [], isPending } = useQuery({
    queryKey: ["risk-tiers"],
    queryFn: getRiskTierConfigs,
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Interest Rate Configuration" description="Risk tier rate bands, min/max loan amounts, and credit score thresholds" />

      <div className="overflow-hidden rounded-lg border bg-white">
        {isPending ? <Skeleton className="h-48 m-4" /> : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Tier", "Default Rate", "Min Rate", "Max Rate", "Max Loan", "Min Score", "Max DTI", "Effective From", "Changed By", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tiers.map((tier) => (
                <>
                  <tr key={tier.tier} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-lg">{tier.tier}</td>
                    <td className="px-4 py-3 font-semibold">{formatPercent(tier.default_interest_rate)}</td>
                    <td className="px-4 py-3">{formatPercent(tier.min_interest_rate)}</td>
                    <td className="px-4 py-3">{formatPercent(tier.max_interest_rate)}</td>
                    <td className="px-4 py-3">{formatCurrency(tier.max_loan_amount)}</td>
                    <td className="px-4 py-3">{tier.min_credit_score}</td>
                    <td className="px-4 py-3">{formatPercent(tier.max_dti_ratio)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(tier.effective_from, "MMM d, yyyy")}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{tier.created_by_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {isAdmin && (
                        <Button size="sm" variant="outline" onClick={() => setEditingTier(editingTier === tier.tier ? null : tier.tier)}>
                          <Edit2 className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                  {editingTier === tier.tier && (
                    <tr key={`edit-${tier.tier}`}>
                      <td colSpan={10} className="px-4 py-3 bg-gray-50">
                        <EditRiskTierForm tier={tier} onClose={() => setEditingTier(null)} />
                      </td>
                    </tr>
                  )}
                  <tr key={`history-${tier.tier}`}>
                    <td colSpan={10} className="px-4 pb-3 bg-white">
                      <HistoryPanel tier={tier.tier} />
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
