"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Link from "next/link"
import { formatCurrency, formatDate, formatPercent, cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getApplicationDetail } from "@/lib/api"
import { ArrowLeft, Printer } from "lucide-react"
import type { RepaymentScheduleEntry } from "@/types"

// ---------------------------------------------------------------------------
// Build amortisation schedule client-side when backend doesn't provide one
// ---------------------------------------------------------------------------
function buildSchedule(principal: number, annualRate: number, months: number): RepaymentScheduleEntry[] {
  if (months <= 0 || annualRate <= 0) return []
  const r = annualRate / 12 / 100
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
  const schedule: RepaymentScheduleEntry[] = []
  let balance = principal
  const start = new Date()
  for (let i = 1; i <= months; i++) {
    const interest = balance * r
    const p = emi - interest
    balance = Math.max(0, balance - p)
    const due = new Date(start)
    due.setMonth(due.getMonth() + i)
    schedule.push({
      installment: i,
      due_date: due.toISOString(),
      principal: p,
      interest,
      balance,
    })
  }
  return schedule
}

export default function DisbursementDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const { data, isPending, isError } = useQuery({
    queryKey: ["application-detail", id],
    queryFn: () => getApplicationDetail(id),
  })

  const disb = data?.disbursement
  const uw = data?.underwriting
  const applicant = data?.applicant
  const app = data?.application

  const schedule: RepaymentScheduleEntry[] =
    disb?.repayment_schedule ??
    (disb?.disbursement_amount && uw?.interest_rate && uw?.tenure_months
      ? buildSchedule(disb.disbursement_amount, uw.interest_rate, uw.tenure_months)
      : [])

  return (
    <div className="space-y-5">
      <Link href="/disbursements" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Disbursements
      </Link>

      <PageHeader
        title={isPending ? "Loading…" : applicant ? `${applicant.first_name ?? ""} ${applicant.last_name ?? ""}`.trim() : "Disbursement"}
        description={app ? `Application ${app.application_id} · ${app.loan_type}` : ""}
        action={
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4 mr-2" /> Print / Export
          </Button>
        }
      />

      {isError && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">Failed to load disbursement.</div>}

      {isPending ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : disb ? (
        <>
          {/* Disbursement receipt */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Disbursement Receipt</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Transaction ID</p>
                <p className="font-mono font-medium">{disb.transaction_id ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className={cn("font-semibold", disb.status === "COMPLETED" ? "text-green-700" : "text-amber-700")}>{disb.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Disbursed At</p>
                <p className="font-medium">{formatDate(disb.transfer_timestamp ?? disb.created_at, "MMM d, yyyy HH:mm")}</p>
              </div>
            </div>
          </div>

          {/* Loan summary */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Loan Summary</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
              <div><p className="text-xs text-gray-500">Disbursement Amount</p><p className="text-lg font-bold">{disb.disbursement_amount != null ? formatCurrency(disb.disbursement_amount) : "—"}</p></div>
              <div><p className="text-xs text-gray-500">Monthly EMI</p><p className="text-lg font-bold">{disb.monthly_emi != null ? formatCurrency(disb.monthly_emi) : "—"}</p></div>
              {uw?.interest_rate != null && <div><p className="text-xs text-gray-500">Interest Rate</p><p className="font-semibold">{formatPercent(uw.interest_rate)}</p></div>}
              {uw?.tenure_months != null && <div><p className="text-xs text-gray-500">Tenure</p><p className="font-semibold">{uw.tenure_months} months</p></div>}
              {disb.total_interest != null && <div><p className="text-xs text-gray-500">Total Interest</p><p className="font-semibold text-amber-700">{formatCurrency(disb.total_interest)}</p></div>}
              {disb.total_repayment != null && <div><p className="text-xs text-gray-500">Total Repayment</p><p className="font-semibold">{formatCurrency(disb.total_repayment)}</p></div>}
            </div>
          </div>

          {/* Amortisation schedule */}
          {schedule.length > 0 && (
            <div className="rounded-lg border bg-white overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-base font-semibold text-gray-900">Amortisation Schedule</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["#", "Due Date", "Principal", "Interest", "Balance"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {schedule.map((row) => (
                      <tr key={row.installment} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500">{row.installment}</td>
                        <td className="px-4 py-2">{formatDate(row.due_date, "MMM yyyy")}</td>
                        <td className="px-4 py-2">{formatCurrency(row.principal)}</td>
                        <td className="px-4 py-2 text-amber-700">{formatCurrency(row.interest)}</td>
                        <td className="px-4 py-2 font-medium">{formatCurrency(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : data ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500">No disbursement record found for this application.</div>
      ) : null}
    </div>
  )
}
