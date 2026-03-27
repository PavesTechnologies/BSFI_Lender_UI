"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { formatCurrency, formatDate, formatPercent, cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { AIRecommendationPanel } from "@/components/review-queue/AIRecommendationPanel"
import { getReviewQueueItem, getApplicationDetail, assignToMe, submitDecision } from "@/lib/api"
import { ArrowLeft, AlertTriangle, CheckCircle, X } from "lucide-react"
import type { ReviewQueueItem, ApplicationDetail, CounterOfferOption } from "@/types"

// ---------------------------------------------------------------------------
// EMI calculator
// ---------------------------------------------------------------------------
function calcEMI(principal: number, annualRate: number, months: number): number {
  if (months <= 0 || annualRate <= 0) return principal / Math.max(months, 1)
  const r = annualRate / 12 / 100
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

// ---------------------------------------------------------------------------
// Applicant Profile Panel
// ---------------------------------------------------------------------------
function ApplicantPanel({ detail }: { detail: ApplicationDetail }) {
  const a = detail.applicant
  const currentAddr = a?.addresses?.[0]
  const totalIncome = a?.incomes?.reduce((s, i) => s + (i.monthly_amount ?? 0), 0) ?? 0
  const totalAssets = a?.assets?.reduce((s, x) => s + (x.value ?? 0), 0) ?? 0
  const totalLiab = a?.liabilities?.reduce((s, l) => s + (l.outstanding_balance ?? 0), 0) ?? 0

  return (
    <div className="space-y-4">
      {/* Personal info */}
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Full Name</dt>
          <dd className="font-medium">{a ? `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() : "—"}</dd>
          <dt className="text-gray-500">DOB</dt>
          <dd>{formatDate(a?.date_of_birth)}</dd>
          <dt className="text-gray-500">SSN (last 4)</dt>
          <dd>****{a?.ssn_last4 ?? "—"}</dd>
          <dt className="text-gray-500">Email</dt>
          <dd className="truncate">{a?.email ?? "—"}</dd>
          <dt className="text-gray-500">Phone</dt>
          <dd>{a?.phone_number ?? "—"}</dd>
        </dl>
      </div>

      {/* Address */}
      {currentAddr && (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Current Address</h3>
          <p className="text-sm text-gray-700">
            {currentAddr.address_line1}{currentAddr.address_line2 ? `, ${currentAddr.address_line2}` : ""}<br />
            {currentAddr.city}, {currentAddr.state} {currentAddr.zip_code}
          </p>
          {currentAddr.housing_status && <p className="text-xs text-gray-500">{currentAddr.housing_status}</p>}
        </div>
      )}

      {/* Employment */}
      {a?.employment && (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Employment</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Employer</dt>
            <dd className="font-medium">{a.employment.employer_name ?? "—"}</dd>
            <dt className="text-gray-500">Title</dt>
            <dd>{a.employment.job_title ?? "—"}</dd>
            <dt className="text-gray-500">Type</dt>
            <dd>{a.employment.employment_type ?? "—"}</dd>
            <dt className="text-gray-500">Since</dt>
            <dd>{formatDate(a.employment.start_date)}</dd>
            <dt className="text-gray-500">Gross Monthly</dt>
            <dd className="font-semibold">{a.employment.gross_monthly_income != null ? formatCurrency(a.employment.gross_monthly_income) : "—"}</dd>
          </dl>
        </div>
      )}

      {/* Income breakdown */}
      {(a?.incomes?.length ?? 0) > 0 && (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Income</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {a!.incomes.map((inc) => (
                <tr key={inc.income_id}>
                  <td className="py-1 text-gray-600">{inc.income_type}</td>
                  <td className="py-1 text-right font-medium">{inc.monthly_amount != null ? formatCurrency(inc.monthly_amount) : "—"}/mo</td>
                </tr>
              ))}
              <tr className="border-t">
                <td className="py-1 font-semibold">Total</td>
                <td className="py-1 text-right font-semibold">{formatCurrency(totalIncome)}/mo</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Assets & Liabilities */}
      <div className="rounded-lg border bg-white p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Assets & Liabilities</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Total Assets</dt>
          <dd className="text-green-700 font-medium">{formatCurrency(totalAssets)}</dd>
          <dt className="text-gray-500">Total Liabilities</dt>
          <dd className="text-red-700 font-medium">{formatCurrency(totalLiab)}</dd>
          <dt className="text-gray-500">Net Worth</dt>
          <dd className={cn("font-semibold", totalAssets - totalLiab >= 0 ? "text-green-700" : "text-red-700")}>
            {formatCurrency(totalAssets - totalLiab)}
          </dd>
        </dl>
      </div>

      {/* Documents */}
      {detail.documents.length > 0 && (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
          <ul className="space-y-1">
            {detail.documents.map((doc) => (
              <li key={doc.document_id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{doc.document_type}</span>
                <span className={cn("text-xs", doc.is_low_quality ? "text-amber-600" : "text-green-600")}>
                  {doc.is_low_quality ? "Low Quality" : "Verified"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KYC + AI Panel
// ---------------------------------------------------------------------------
function KycAiPanel({ detail }: { detail: ApplicationDetail }) {
  const kyc = detail.kyc
  const uw = detail.underwriting

  const kycColor = kyc?.status === "PASSED" ? "text-green-700 bg-green-50 border-green-200" : kyc?.status === "FAILED" ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200"

  return (
    <div className="space-y-4">
      {/* KYC */}
      {kyc && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">KYC Summary</h3>
          <div className={cn("rounded-lg border px-4 py-3 text-center", kycColor)}>
            <p className="text-lg font-bold">{kyc.status}</p>
            {kyc.confidence_score != null && (
              <p className="text-sm">{(kyc.confidence_score * 100).toFixed(0)}% confidence</p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Identity Check</dt>
            <dd className={kyc.identity_check?.final_status === "PASS" ? "text-green-700" : "text-red-700"}>
              {kyc.identity_check?.final_status ?? "—"}
            </dd>
            <dt className="text-gray-500">AML Check</dt>
            <dd className={!kyc.aml_check?.ofac_match ? "text-green-700" : "text-red-700"}>
              {kyc.aml_check ? (kyc.aml_check.ofac_match ? "FLAGGED" : "CLEAR") : "—"}
            </dd>
          </dl>
        </div>
      )}

      {/* AI Underwriting */}
      {uw && (
        <AIRecommendationPanel
          underwriting={uw}
          requestedAmount={detail.application.requested_amount}
          requestedTenure={detail.application.requested_term_months}
        />
      )}

      {/* Financial ratios */}
      {uw && detail.applicant && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Financial Ratios</h3>
          {(() => {
            const monthlyIncome = detail.applicant!.incomes.reduce((s, i) => s + (i.monthly_amount ?? 0), 0) || detail.applicant!.employment?.gross_monthly_income || 1
            const monthlyDebt = detail.applicant!.liabilities.reduce((s, l) => s + (l.monthly_payment ?? 0), 0)
            const dti = (monthlyDebt / monthlyIncome) * 100
            const lti = (uw.approved_amount ?? detail.application.requested_amount ?? 0) / (monthlyIncome * 12) * 100
            return (
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">Debt-to-Income (DTI)</dt>
                  <dd className={cn("font-semibold", dti > 43 ? "text-red-600" : dti > 35 ? "text-amber-600" : "text-green-600")}>{formatPercent(dti)}</dd>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className={cn("h-2 rounded-full", dti > 43 ? "bg-red-500" : dti > 35 ? "bg-amber-500" : "bg-green-500")} style={{ width: `${Math.min(100, dti)}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <dt className="text-gray-500">Loan-to-Income</dt>
                  <dd className="font-semibold">{formatPercent(lti)}</dd>
                </div>
              </dl>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Decision Form
// ---------------------------------------------------------------------------
type DecisionType = "APPROVED" | "APPROVED_WITH_OVERRIDE" | "REJECTED"

function DecisionForm({ queueItem, detail }: { queueItem: ReviewQueueItem; detail: ApplicationDetail }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [decision, setDecision] = useState<DecisionType | null>(null)
  const [overrideAmount, setOverrideAmount] = useState(String(queueItem.ai_suggested_amount ?? ""))
  const [overrideRate, setOverrideRate] = useState(String(queueItem.ai_suggested_rate ?? ""))
  const [overrideTenure, setOverrideTenure] = useState(String(queueItem.ai_suggested_tenure ?? ""))
  const [notes, setNotes] = useState("")
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const emi = decision === "APPROVED_WITH_OVERRIDE" && overrideAmount && overrideRate && overrideTenure
    ? calcEMI(Number(overrideAmount), Number(overrideRate), Number(overrideTenure))
    : null

  const isAlreadyDecided = ["APPROVED", "REJECTED", "OVERRIDDEN"].includes(queueItem.status)

  const mutation = useMutation({
    mutationFn: () =>
      submitDecision(queueItem.id, {
        decision: decision === "APPROVED_WITH_OVERRIDE" ? "APPROVED_WITH_OVERRIDE" : decision!,
        override_amount: decision === "APPROVED_WITH_OVERRIDE" ? Number(overrideAmount) : undefined,
        override_rate: decision === "APPROVED_WITH_OVERRIDE" ? Number(overrideRate) : undefined,
        override_tenure: decision === "APPROVED_WITH_OVERRIDE" ? Number(overrideTenure) : undefined,
        selected_offer_id: selectedOffer ?? undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review-queue"] })
      router.push("/review-queue")
    },
  })

  const isValid = () => {
    if (!decision) return false
    if (decision === "REJECTED") return notes.length >= 20
    if (decision === "APPROVED_WITH_OVERRIDE") return Number(overrideAmount) > 0 && Number(overrideRate) > 0 && Number(overrideTenure) > 0
    return true
  }

  if (isAlreadyDecided) {
    const statusColor = queueItem.status === "APPROVED" || queueItem.status === "OVERRIDDEN" ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
    return (
      <div className={cn("rounded-lg border p-4 text-center", statusColor)}>
        <CheckCircle className="mx-auto h-8 w-8 mb-2" />
        <p className="font-semibold">Decision: {queueItem.status}</p>
        {queueItem.decided_at && <p className="text-xs mt-1">{formatDate(queueItem.decided_at)}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Radio group */}
      <div className="space-y-2">
        {(["APPROVED", "APPROVED_WITH_OVERRIDE", "REJECTED"] as DecisionType[]).map((d) => (
          <label key={d} className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors", decision === d ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50")}>
            <input type="radio" name="decision" value={d} checked={decision === d} onChange={() => setDecision(d)} className="accent-blue-600" />
            <span className="text-sm font-medium text-gray-800">
              {d === "APPROVED" ? "Approve" : d === "APPROVED_WITH_OVERRIDE" ? "Approve with Override" : "Reject"}
            </span>
          </label>
        ))}
      </div>

      {/* APPROVED: show AI terms */}
      {decision === "APPROVED" && queueItem.ai_suggested_amount && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-1 text-sm">
          <p className="font-semibold text-green-800 mb-2">AI Suggested Terms</p>
          <div className="grid grid-cols-2 gap-y-1">
            <span className="text-gray-600">Amount</span>
            <span className="font-medium">{formatCurrency(queueItem.ai_suggested_amount)}</span>
            {queueItem.ai_suggested_rate && (<><span className="text-gray-600">Rate</span><span className="font-medium">{formatPercent(queueItem.ai_suggested_rate)}</span></>)}
            {queueItem.ai_suggested_tenure && (<><span className="text-gray-600">Tenure</span><span className="font-medium">{queueItem.ai_suggested_tenure} months</span></>)}
          </div>
        </div>
      )}

      {/* APPROVED_WITH_OVERRIDE: inputs */}
      {decision === "APPROVED_WITH_OVERRIDE" && (
        <div className="space-y-3">
          {queueItem.ai_counter_options && (
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Base on counter offer (optional)</Label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                onChange={(e) => {
                  const opt = queueItem.ai_counter_options?.find((o: CounterOfferOption) => o.offer_id === e.target.value)
                  if (opt) { setOverrideAmount(String(opt.principal_amount)); setOverrideRate(String(opt.interest_rate)); setOverrideTenure(String(opt.tenure_months)); setSelectedOffer(opt.offer_id) }
                }}
              >
                <option value="">— select offer —</option>
                {(queueItem.ai_counter_options as CounterOfferOption[]).map((o: CounterOfferOption) => (
                  <option key={o.offer_id} value={o.offer_id}>{o.label} ({formatCurrency(o.principal_amount)})</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ov-amount" className="text-xs">Amount ($)</Label>
              <Input id="ov-amount" type="number" value={overrideAmount} onChange={(e) => setOverrideAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ov-rate" className="text-xs">Rate (%)</Label>
              <Input id="ov-rate" type="number" step="0.01" value={overrideRate} onChange={(e) => setOverrideRate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ov-tenure" className="text-xs">Tenure (months)</Label>
              <Input id="ov-tenure" type="number" value={overrideTenure} onChange={(e) => setOverrideTenure(e.target.value)} />
            </div>
            {emi && (
              <div className="space-y-1">
                <Label className="text-xs">Est. Monthly EMI</Label>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold">{formatCurrency(emi)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REJECTED: notes */}
      {decision === "REJECTED" && (
        <div className="space-y-1">
          <Label htmlFor="notes" className="text-xs">Rejection Reason <span className="text-gray-400">(min 20 chars)</span></Label>
          <Textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Explain why this application is being rejected…" />
          <p className="text-xs text-gray-400 text-right">{notes.length} / 20 min</p>
        </div>
      )}

      {/* Submit */}
      {!confirming ? (
        <Button className="w-full" disabled={!isValid() || mutation.isPending} onClick={() => setConfirming(true)}>
          Submit Decision
        </Button>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">Are you sure? This will notify the applicant.</p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Submitting…" : "Confirm"}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
          {mutation.isError && <p className="text-xs text-red-600">Submission failed. Please try again.</p>}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ReviewQueueDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [activeTab, setActiveTab] = useState<"applicant" | "kyc-ai" | "decision">("applicant")

  const queueQuery = useQuery({
    queryKey: ["review-queue-item", id],
    queryFn: () => getReviewQueueItem(id),
  })

  const appQuery = useQuery({
    queryKey: ["application-detail", queueQuery.data?.application_id],
    queryFn: () => getApplicationDetail(queueQuery.data!.application_id),
    enabled: !!queueQuery.data?.application_id,
  })

  const isLoading = queueQuery.isPending || appQuery.isPending
  const isError = queueQuery.isError

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/review-queue" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Queue
        </Link>
      </div>

      <PageHeader
        title={isLoading ? "Loading…" : (queueQuery.data?.applicant_name ?? "Application Review")}
        description={queueQuery.data ? `Application ${queueQuery.data.application_id} · ${queueQuery.data.loan_type}` : ""}
      />

      {isError && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">Failed to load application.</div>}

      {/* Mobile tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 lg:hidden">
        {(["applicant", "kyc-ai", "decision"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn("flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors", activeTab === tab ? "bg-white shadow text-gray-900" : "text-gray-500")}
          >
            {tab === "kyc-ai" ? "KYC & AI" : tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-96 rounded-lg" />)}
        </div>
      ) : queueQuery.data && appQuery.data ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Panel 1 — Applicant */}
          <div className={cn("space-y-4", activeTab !== "applicant" && "hidden lg:block")}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Applicant Profile</h2>
            <ApplicantPanel detail={appQuery.data} />
          </div>

          {/* Panel 2 — KYC & AI */}
          <div className={cn("space-y-4", activeTab !== "kyc-ai" && "hidden lg:block")}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">KYC & AI Results</h2>
            <KycAiPanel detail={appQuery.data} />
          </div>

          {/* Panel 3 — Decision */}
          <div className={cn("space-y-4", activeTab !== "decision" && "hidden lg:block")}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Decision</h2>
            <div className="rounded-lg border bg-white p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Assigned To</span>
                <span className="font-medium">{queueQuery.data.assigned_to ?? "Unassigned"}</span>
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Submit Decision</h3>
              <DecisionForm queueItem={queueQuery.data} detail={appQuery.data} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
