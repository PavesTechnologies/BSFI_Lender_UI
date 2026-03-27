"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDate, formatCurrency, formatPercent, cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { getPolicies, getPoliciesHistory, updatePolicy } from "@/lib/api"
import { getStoredUser } from "@/lib/auth"
import { Edit2, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react"
import type { LoanPolicy } from "@/types"

const CATEGORY_COLORS: Record<string, string> = {
  LIMITS: "bg-blue-50 border-blue-200 text-blue-800",
  UNDERWRITING: "bg-purple-50 border-purple-200 text-purple-800",
  DISBURSEMENT: "bg-green-50 border-green-200 text-green-800",
  KYC: "bg-amber-50 border-amber-200 text-amber-800",
}

function formatPolicyValue(policy: LoanPolicy): string {
  const val = policy.policy_value?.value
  if (val == null) return "—"
  const unit = policy.policy_value?.unit ?? ""
  if (unit === "percent") return formatPercent(val)
  if (unit === "currency" || unit === "usd") return formatCurrency(val)
  return `${val}${unit ? ` ${unit}` : ""}`
}

// ---------------------------------------------------------------------------
// Edit policy inline form
// ---------------------------------------------------------------------------
function EditPolicyForm({ policy, onClose }: { policy: LoanPolicy; onClose: () => void }) {
  const qc = useQueryClient()
  const [step, setStep] = useState<"edit" | "confirm">("edit")
  const [value, setValue] = useState(String(policy.policy_value?.value ?? ""))
  const [notes, setNotes] = useState("")
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 16))

  const mutation = useMutation({
    mutationFn: () =>
      updatePolicy(policy.policy_key, {
        policy_value: { value: Number(value), unit: policy.policy_value?.unit },
        notes: notes || undefined,
        effective_from: new Date(effectiveFrom).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["policies"] })
      qc.invalidateQueries({ queryKey: ["policy-history"] })
      onClose()
    },
  })

  if (step === "confirm") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">Update <strong>{policy.description}</strong> to <strong>{value} {policy.policy_value?.unit ?? ""}</strong>?</p>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Confirm & Save"}</Button>
          <Button variant="outline" onClick={() => setStep("edit")}>Back</Button>
        </div>
        {mutation.isError && <p className="text-xs text-red-600">Update failed.</p>}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">New Value{policy.policy_value?.unit ? ` (${policy.policy_value.unit})` : ""}</Label>
          <Input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Effective From</Label>
          <Input type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for change…" />
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setStep("confirm")}>Review Changes</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Policy history toggle
// ---------------------------------------------------------------------------
function PolicyHistory({ policyKey }: { policyKey: string }) {
  const [open, setOpen] = useState(false)
  const { data } = useQuery({
    queryKey: ["policy-history", policyKey],
    queryFn: () => getPoliciesHistory({ policy_key: policyKey, page: 1, page_size: 5 }),
    enabled: open,
  })

  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        History
      </button>
      {open && data && data.items.length > 0 && (
        <ul className="mt-1 space-y-1 text-xs text-gray-500">
          {data.items.slice(1).map((h) => (
            <li key={h.id} className="flex items-center gap-2">
              <span className="text-gray-400">{formatDate(h.effective_from, "MMM d, yyyy")}</span>
              <span className="font-medium">{formatPolicyValue(h)}</span>
              <span className="text-gray-400">by {h.created_by_name ?? "—"}</span>
              {h.notes && <span className="italic">{h.notes}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const CATEGORIES = ["LIMITS", "UNDERWRITING", "DISBURSEMENT", "KYC"] as const

export default function PoliciesPage() {
  const user = typeof window !== "undefined" ? getStoredUser() : null
  const isAdmin = user?.role === "ADMIN"
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const { data: policies = [], isPending } = useQuery({
    queryKey: ["policies"],
    queryFn: () => getPolicies(),
  })

  const grouped = CATEGORIES.reduce<Record<string, LoanPolicy[]>>((acc, cat) => {
    acc[cat] = policies.filter((p) => p.category === cat)
    return acc
  }, {} as Record<string, LoanPolicy[]>)

  return (
    <div className="space-y-6">
      <PageHeader title="Loan Policies" description="System-wide loan origination policy parameters" />

      {isPending ? (
        <div className="space-y-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
      ) : (
        CATEGORIES.map((cat) => (
          <div key={cat}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{cat}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[cat].map((policy) => (
                <div key={policy.policy_key} className={cn("rounded-lg border p-4 space-y-2", CATEGORY_COLORS[cat] ?? "")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{policy.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{policy.policy_key}</p>
                    </div>
                    {isAdmin && (
                      <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={() => setEditingKey(editingKey === policy.policy_key ? null : policy.policy_key)}>
                        <Edit2 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatPolicyValue(policy)}</p>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>Effective {formatDate(policy.effective_from, "MMM d, yyyy")}</p>
                    <p>By {policy.created_by_name ?? "—"}</p>
                  </div>

                  {editingKey === policy.policy_key && (
                    <EditPolicyForm policy={policy} onClose={() => setEditingKey(null)} />
                  )}

                  <PolicyHistory policyKey={policy.policy_key} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
