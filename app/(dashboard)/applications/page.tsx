"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { formatCurrency, cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getApplications } from "@/lib/api"
import { Search, FileText } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const AI_BADGE: Record<string, string> = {
  APPROVE: "bg-green-100 text-green-800 border-green-200",
  COUNTER_OFFER: "bg-amber-100 text-amber-800 border-amber-200",
  DECLINE: "bg-red-100 text-red-800 border-red-200",
}

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-gray-100 text-gray-700",
  processing: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  disbursed: "bg-purple-100 text-purple-800",
}

const TIER_COLOR: Record<string, string> = { A: "bg-green-100 text-green-800", B: "bg-blue-100 text-blue-800", C: "bg-amber-100 text-amber-800", F: "bg-red-100 text-red-800" }

export default function ApplicationsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [aiFilter, setAiFilter] = useState("all")

  const params = {
    page,
    page_size: 20,
    status: statusFilter !== "all" ? statusFilter : undefined,
    decision: aiFilter !== "all" ? aiFilter : undefined,
    search: search || undefined,
  }

  const { data, isPending, isError } = useQuery({
    queryKey: ["applications", params],
    queryFn: () => getApplications(params),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <div className="space-y-5">
      <PageHeader title="Applications" description="All loan applications across all statuses" />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search applicant, email or ID…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="disbursed">Disbursed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={aiFilter} onValueChange={(v) => { setAiFilter(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="AI Decision" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All AI decisions</SelectItem>
            <SelectItem value="APPROVE">Approve</SelectItem>
            <SelectItem value="COUNTER_OFFER">Counter Offer</SelectItem>
            <SelectItem value="DECLINE">Decline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isError ? (
          <div className="p-8 text-center text-sm text-red-500">Failed to load applications.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Applicant", "Loan", "Status", "AI Decision", "Risk", "KYC", "Human Review", "Disbursed", "Submitted"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isPending ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">No applications found</p>
                    </td>
                  </tr>
                ) : (
                  items.map((app) => (
                    <tr key={app.application_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/applications/${app.application_id}`} className="font-medium text-blue-600 hover:underline">
                          {app.applicant_name}
                        </Link>
                        <p className="text-xs text-gray-400">{app.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{app.loan_type}</p>
                        <p className="font-medium">{app.requested_amount != null ? formatCurrency(app.requested_amount) : "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize", STATUS_BADGE[app.application_status] ?? "bg-gray-100")}>
                          {app.application_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {app.ai_decision ? (
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", AI_BADGE[app.ai_decision] ?? "")}>
                            {app.ai_decision.replace("_", " ")}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {app.risk_tier && (
                          <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold mr-1", TIER_COLOR[app.risk_tier] ?? "")}>
                            {app.risk_tier}
                          </span>
                        )}
                        {app.risk_score != null && <span className="text-xs text-gray-500">{app.risk_score.toFixed(2)}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">—</td>
                      <td className="px-4 py-3">
                        {app.human_review_status ? (
                          <span className="text-xs text-gray-700">{app.human_review_status}</span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {app.application_status === "disbursed" ? "Yes" : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
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
