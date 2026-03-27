"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Link from "next/link"
import { formatCurrency, formatDate, formatPercent, cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { AIRecommendationPanel } from "@/components/review-queue/AIRecommendationPanel"
import { getApplicationDetail, getApplicationTimeline } from "@/lib/api"
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import type { ApplicationDetail, TimelineEvent } from "@/types"

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium break-words">{value ?? "—"}</dd>
    </>
  )
}

// ---------------------------------------------------------------------------
// Panel 1 — Applicant (same as review queue detail, read-only)
// ---------------------------------------------------------------------------
function ApplicantPanel({ detail }: { detail: ApplicationDetail }) {
  const a = detail.applicant
  const addr = a?.addresses?.[0]
  const totalIncome = a?.incomes?.reduce((s, i) => s + (i.monthly_amount ?? 0), 0) ?? 0
  const totalAssets = a?.assets?.reduce((s, x) => s + (x.value ?? 0), 0) ?? 0
  const totalLiab = a?.liabilities?.reduce((s, l) => s + (l.outstanding_balance ?? 0), 0) ?? 0

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <InfoRow label="Full Name" value={a ? `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() : "—"} />
          <InfoRow label="DOB" value={formatDate(a?.date_of_birth)} />
          <InfoRow label="SSN (last 4)" value={`****${a?.ssn_last4 ?? "—"}`} />
          <InfoRow label="Email" value={a?.email} />
          <InfoRow label="Phone" value={a?.phone_number} />
        </dl>
      </div>
      {addr && (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Address</h3>
          <p className="text-sm text-gray-700">
            {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}<br />
            {addr.city}, {addr.state} {addr.zip_code}
          </p>
        </div>
      )}
      {a?.employment && (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Employment</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <InfoRow label="Employer" value={a.employment.employer_name} />
            <InfoRow label="Title" value={a.employment.job_title} />
            <InfoRow label="Type" value={a.employment.employment_type} />
            <InfoRow label="Since" value={formatDate(a.employment.start_date)} />
            <InfoRow label="Gross Monthly" value={a.employment.gross_monthly_income != null ? formatCurrency(a.employment.gross_monthly_income) : "—"} />
          </dl>
        </div>
      )}
      {(a?.incomes?.length ?? 0) > 0 && (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Income</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {a!.incomes.map((inc) => (
                <tr key={inc.income_id}>
                  <td className="py-1 text-gray-600">{inc.income_type}</td>
                  <td className="py-1 text-right font-medium">{inc.monthly_amount != null ? `${formatCurrency(inc.monthly_amount)}/mo` : "—"}</td>
                </tr>
              ))}
              <tr className="border-t font-semibold">
                <td className="py-1">Total</td>
                <td className="py-1 text-right">{formatCurrency(totalIncome)}/mo</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <div className="rounded-lg border bg-white p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Assets & Liabilities</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <InfoRow label="Total Assets" value={<span className="text-green-700">{formatCurrency(totalAssets)}</span>} />
          <InfoRow label="Total Liabilities" value={<span className="text-red-700">{formatCurrency(totalLiab)}</span>} />
          <InfoRow label="Net Worth" value={<span className={totalAssets - totalLiab >= 0 ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>{formatCurrency(totalAssets - totalLiab)}</span>} />
        </dl>
      </div>
      {detail.documents.length > 0 && (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
          <ul className="space-y-1">
            {detail.documents.map((doc) => (
              <li key={doc.document_id} className="flex items-center justify-between text-sm">
                <span>{doc.document_type}</span>
                <span className={cn("text-xs", doc.is_low_quality ? "text-amber-600" : "text-green-600")}>{doc.is_low_quality ? "Low Quality" : "Verified"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel 2 — KYC & AI (read-only, same as review queue)
// ---------------------------------------------------------------------------
function KycAiPanel({ detail }: { detail: ApplicationDetail }) {
  const kyc = detail.kyc
  const uw = detail.underwriting
  const kycColor = kyc?.status === "PASSED" ? "text-green-700 bg-green-50 border-green-200" : kyc?.status === "FAILED" ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200"

  return (
    <div className="space-y-4">
      {kyc && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">KYC Summary</h3>
          <div className={cn("rounded-lg border px-4 py-3 text-center", kycColor)}>
            <p className="text-lg font-bold">{kyc.status}</p>
            {kyc.confidence_score != null && <p className="text-sm">{(kyc.confidence_score * 100).toFixed(0)}% confidence</p>}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Identity</dt>
            <dd className={kyc.identity_check?.final_status === "PASS" ? "text-green-700" : "text-red-700"}>{kyc.identity_check?.final_status ?? "—"}</dd>
            <dt className="text-gray-500">AML</dt>
            <dd className={!kyc.aml_check?.ofac_match ? "text-green-700" : "text-red-700"}>{kyc.aml_check ? (kyc.aml_check.ofac_match ? "FLAGGED" : "CLEAR") : "—"}</dd>
          </dl>
        </div>
      )}
      {uw && (
        <AIRecommendationPanel
          underwriting={uw}
          requestedAmount={detail.application.requested_amount}
          requestedTenure={detail.application.requested_term_months}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel 3 — Human Review Decision (read-only)
// ---------------------------------------------------------------------------
function HumanReviewPanel({ detail }: { detail: ApplicationDetail }) {
  const hr = detail.human_review
  if (!hr) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm text-gray-500 text-center py-8">
        No human review on record
      </div>
    )
  }

  const dec = hr.latest_decision
  const statusColor = hr.status === "APPROVED" || hr.status === "OVERRIDDEN" ? "bg-green-50 border-green-200 text-green-800" : hr.status === "REJECTED" ? "bg-red-50 border-red-200 text-red-800" : "bg-gray-50 border-gray-200 text-gray-800"

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-4", statusColor)}>
        <p className="font-semibold text-lg">{hr.status}</p>
        {hr.decided_at && <p className="text-xs mt-1">{formatDate(hr.decided_at, "MMM d, yyyy HH:mm")}</p>}
      </div>

      {dec && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Decision Details</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <InfoRow label="Reviewed By" value={dec.reviewed_by} />
            <InfoRow label="Decision" value={<span className="font-semibold">{dec.decision}</span>} />
            {dec.override_amount != null && <InfoRow label="Override Amount" value={formatCurrency(dec.override_amount)} />}
            {dec.override_rate != null && <InfoRow label="Override Rate" value={formatPercent(dec.override_rate)} />}
            {dec.override_tenure != null && <InfoRow label="Override Tenure" value={`${dec.override_tenure} months`} />}
          </dl>

          {dec.override_amount != null && (
            <div className="mt-3 rounded-md bg-gray-50 border p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Comparison: AI vs Override</p>
              <table className="w-full text-xs">
                <thead><tr><th className="text-left text-gray-500">Term</th><th className="text-right text-gray-500">AI</th><th className="text-right text-gray-500">Officer</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-1 text-gray-600">Amount</td><td className="py-1 text-right">{hr.ai_suggested_amount != null ? formatCurrency(hr.ai_suggested_amount) : "—"}</td><td className="py-1 text-right font-semibold">{formatCurrency(dec.override_amount)}</td></tr>
                  {dec.override_rate != null && <tr><td className="py-1 text-gray-600">Rate</td><td className="py-1 text-right">{hr.ai_suggested_rate != null ? formatPercent(hr.ai_suggested_rate) : "—"}</td><td className="py-1 text-right font-semibold">{formatPercent(dec.override_rate)}</td></tr>}
                  {dec.override_tenure != null && <tr><td className="py-1 text-gray-600">Tenure</td><td className="py-1 text-right">{hr.ai_suggested_tenure != null ? `${hr.ai_suggested_tenure} mo` : "—"}</td><td className="py-1 text-right font-semibold">{dec.override_tenure} mo</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {dec.notes && (
            <div className="rounded-md bg-gray-50 border p-3 text-sm text-gray-700">
              <p className="text-xs font-semibold text-gray-500 mb-1">Officer Notes</p>
              {dec.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
const STAGE_ICON: Record<string, React.ReactNode> = {
  complete: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  warning: <AlertCircle className="h-4 w-4 text-amber-500" />,
}

function ApplicationTimeline({ appId }: { appId: string }) {
  const { data: events = [], isPending } = useQuery({
    queryKey: ["timeline", appId],
    queryFn: () => getApplicationTimeline(appId),
  })

  if (isPending) return <Skeleton className="h-32 w-full" />

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Application Timeline</h3>
      <ol className="relative border-l border-gray-200 pl-6 space-y-4">
        {events.map((ev, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[1.4rem] flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200">
              {STAGE_ICON[ev.status] ?? <Clock className="h-3 w-3 text-gray-400" />}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-800">{ev.message}</p>
              <p className="text-xs text-gray-400">{formatDate(ev.timestamp, "MMM d, yyyy HH:mm")} · {ev.stage}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [activeTab, setActiveTab] = useState<"applicant" | "kyc-ai" | "review">("applicant")

  const { data, isPending, isError } = useQuery({
    queryKey: ["application-detail", id],
    queryFn: () => getApplicationDetail(id),
  })

  return (
    <div className="space-y-5">
      <Link href="/applications" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Applications
      </Link>

      <PageHeader
        title={isPending ? "Loading…" : data ? `${data.applicant?.first_name ?? ""} ${data.applicant?.last_name ?? ""}`.trim() || "Application" : "Application"}
        description={data ? `ID: ${data.application.application_id} · ${data.application.loan_type} · ${data.application.application_status}` : ""}
      />

      {isError && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">Failed to load application.</div>}

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 lg:hidden">
        {(["applicant", "kyc-ai", "review"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn("flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize", activeTab === tab ? "bg-white shadow text-gray-900" : "text-gray-500")}>
            {tab === "kyc-ai" ? "KYC & AI" : tab}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="grid gap-5 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-96 rounded-lg" />)}</div>
      ) : data ? (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className={cn(activeTab !== "applicant" && "hidden lg:block")}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Applicant Profile</h2>
              <ApplicantPanel detail={data} />
            </div>
            <div className={cn(activeTab !== "kyc-ai" && "hidden lg:block")}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">KYC & AI Results</h2>
              <KycAiPanel detail={data} />
            </div>
            <div className={cn(activeTab !== "review" && "hidden lg:block")}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Human Review Decision</h2>
              <HumanReviewPanel detail={data} />
            </div>
          </div>
          <ApplicationTimeline appId={data.application.application_id} />
        </>
      ) : null}
    </div>
  )
}
