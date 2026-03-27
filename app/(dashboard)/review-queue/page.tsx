"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getReviewQueue, assignToMe } from "@/lib/api"
import { ClipboardList, Search, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { ReviewQueueItem } from "@/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const AI_DECISION_CONFIG: Record<string, { label: string; className: string }> = {
  APPROVE: { label: "Approve", className: "bg-green-100 text-green-800 border-green-200" },
  COUNTER_OFFER: { label: "Counter Offer", className: "bg-amber-100 text-amber-800 border-amber-200" },
  DECLINE: { label: "Decline", className: "bg-red-100 text-red-800 border-red-200" },
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-gray-100 text-gray-700 border-gray-200" },
  ASSIGNED: { label: "In Review", className: "bg-blue-100 text-blue-700 border-blue-200" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-800 border-green-200" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
  OVERRIDDEN: { label: "Overridden", className: "bg-purple-100 text-purple-800 border-purple-200" },
}

function AiDecisionBadge({ decision }: { decision: string }) {
  const cfg = AI_DECISION_CONFIG[decision] ?? { label: decision, className: "" }
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.className)}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "" }
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.className)}>
      {cfg.label}
    </span>
  )
}

function RiskTierPill({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-gray-400">—</span>
  const colors: Record<string, string> = { A: "bg-green-100 text-green-800", B: "bg-blue-100 text-blue-800", C: "bg-amber-100 text-amber-800", F: "bg-red-100 text-red-800" }
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold", colors[tier] ?? "bg-gray-100 text-gray-800")}>
      {tier}
    </span>
  )
}

function RowHighlight({ decision }: { decision: string }) {
  if (decision === "DECLINE") return "bg-red-50/50"
  if (decision === "COUNTER_OFFER") return "bg-amber-50/50"
  return ""
}

// ---------------------------------------------------------------------------
// Assign inline action
// ---------------------------------------------------------------------------
function AssignButton({ item }: { item: ReviewQueueItem }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => assignToMe(item.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review-queue"] }),
  })

  if (item.status !== "PENDING" && item.status !== "ASSIGNED") return null

  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={(e) => { e.stopPropagation(); mutation.mutate() }}
      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
    >
      {mutation.isPending ? "Assigning…" : "Assign to Me"}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ClipboardList className="mb-4 h-16 w-16 text-gray-300" />
      <h3 className="text-lg font-semibold text-gray-700">Review queue is clear</h3>
      <p className="mt-1 text-sm text-gray-400">No applications require review at this time.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 9 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ReviewQueuePage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [aiFilter, setAiFilter] = useState("all")

  const params = {
    page,
    page_size: 20,
    status: statusFilter !== "all" ? statusFilter : undefined,
    ai_decision: aiFilter !== "all" ? aiFilter : undefined,
  }

  const { data, isPending, isError, dataUpdatedAt } = useQuery({
    queryKey: ["review-queue", params],
    queryFn: () => getReviewQueue(params),
    refetchInterval: 30_000,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  const filtered = search
    ? items.filter(
        (i) =>
          i.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
          i.application_id.toLowerCase().includes(search.toLowerCase())
      )
    : items

  return (
    <div className="space-y-5">
      <PageHeader
        title="Review Queue"
        description="Applications awaiting bank officer review"
        action={
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <RefreshCw className="h-3 w-3" />
            {dataUpdatedAt ? `Updated ${formatDistanceToNow(dataUpdatedAt, { addSuffix: true })}` : "Auto-refreshes every 30s"}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search applicant or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ASSIGNED">In Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
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

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isError ? (
          <div className="p-8 text-center text-sm text-red-500">Failed to load review queue.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Applicant", "Loan", "AI Decision", "Risk Tier", "Risk Score", "Status", "Assigned To", "Submitted", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isPending ? (
                  <TableSkeleton />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className={cn("hover:bg-gray-50 cursor-pointer", RowHighlight({ decision: item.ai_decision }))}>
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/review-queue/${item.id}`} className="text-blue-600 hover:underline">
                          {item.applicant_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.loan_type} — {formatCurrency(item.requested_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <AiDecisionBadge decision={item.ai_decision} />
                      </td>
                      <td className="px-4 py-3">
                        <RiskTierPill tier={item.ai_risk_tier} />
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {item.ai_risk_score != null ? item.ai_risk_score.toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="flex flex-col gap-0.5">
                          <span>{item.assigned_to ? "Assigned" : "Unassigned"}</span>
                          <AssignButton item={item} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/review-queue/${item.id}`)}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} total</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
