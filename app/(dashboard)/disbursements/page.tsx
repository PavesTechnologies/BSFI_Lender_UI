"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getApplications } from "@/lib/api"
import { Search, CreditCard } from "lucide-react"

export default function DisbursementsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const params = { page, page_size: 20, status: "disbursed", search: search || undefined }

  const { data, isPending, isError } = useQuery({
    queryKey: ["disbursements", params],
    queryFn: () => getApplications(params),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <div className="space-y-5">
      <PageHeader title="Disbursements" description="Active loan disbursement records" />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search applicant…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isError ? (
          <div className="p-8 text-center text-sm text-red-500">Failed to load disbursements.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Applicant / Application ID", "Loan Type", "Amount", "Risk Tier", "AI Decision", "Disbursed At", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isPending ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <CreditCard className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">No disbursements found</p>
                    </td>
                  </tr>
                ) : (
                  items.map((app) => (
                    <tr key={app.application_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/disbursements/${app.application_id}`} className="font-medium text-blue-600 hover:underline">
                          {app.applicant_name}
                        </Link>
                        <p className="text-xs text-gray-400 font-mono">{app.application_id}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{app.loan_type}</td>
                      <td className="px-4 py-3 font-semibold">{app.requested_amount != null ? formatCurrency(app.requested_amount) : "—"}</td>
                      <td className="px-4 py-3">
                        {app.risk_tier ? (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800">{app.risk_tier}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {app.ai_decision ? (
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", app.ai_decision === "APPROVE" ? "bg-green-100 text-green-800 border-green-200" : "bg-amber-100 text-amber-800 border-amber-200")}>
                            {app.ai_decision.replace("_", " ")}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(app.created_at)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/disbursements/${app.application_id}`} className="text-sm text-blue-600 hover:underline">View</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} total</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span>Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
