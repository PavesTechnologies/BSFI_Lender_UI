import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios"
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "@/lib/auth"
import type {
  ApplicationDetail,
  ApplicationsReport,
  ApplicationSummary,
  AuthTokens,
  DashboardKPIs,
  DisbursementsReport,
  LenderUser,
  LoanPolicy,
  PaginatedResponse,
  ReviewPerformanceReport,
  ReviewQueueItem,
  RiskDistributionReport,
  RiskTierConfig,
  TimelineEvent,
} from "@/types"

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:8005",
  headers: { "Content-Type": "application/json" },
})

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token
// ---------------------------------------------------------------------------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---------------------------------------------------------------------------
// Response interceptor — 401 → refresh → retry once, else redirect to login
// ---------------------------------------------------------------------------
let _refreshing = false
let _refreshSubscribers: Array<(token: string) => void> = []

function _subscribeRefresh(cb: (token: string) => void) {
  _refreshSubscribers.push(cb)
}

function _notifyRefreshed(token: string) {
  _refreshSubscribers.forEach((cb) => cb(token))
  _refreshSubscribers = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (_refreshing) {
        return new Promise((resolve) => {
          _subscribeRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      _refreshing = true
      const refreshTok = getRefreshToken()
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:8005"}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${refreshTok}` } }
        )
        const newAccessToken: string = res.data.access_token
        const stored = JSON.parse(localStorage.getItem("lender_user") ?? "null")
        saveTokens({
          access_token: newAccessToken,
          refresh_token: refreshTok ?? "",
          token_type: "bearer",
          user: stored,
        })
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
        _notifyRefreshed(newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch {
        clearTokens()
        if (typeof window !== "undefined") window.location.href = "/login"
        return Promise.reject(error)
      } finally {
        _refreshing = false
      }
    }
    return Promise.reject(error)
  }
)

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await api.post<AuthTokens>("/auth/login", { email, password })
  return res.data
}

export async function getMe(): Promise<LenderUser> {
  const res = await api.get<LenderUser>("/auth/me")
  return res.data
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
export async function getApplications(params?: {
  page?: number
  page_size?: number
  status?: string
  ai_decision?: string
  search?: string
}): Promise<PaginatedResponse<ApplicationSummary>> {
  const res = await api.get<PaginatedResponse<ApplicationSummary>>("/applications", { params })
  return res.data
}

export async function getApplicationDetail(id: string): Promise<ApplicationDetail> {
  const res = await api.get<ApplicationDetail>(`/applications/${id}`)
  return res.data
}

export async function getApplicationTimeline(id: string): Promise<TimelineEvent[]> {
  const res = await api.get<TimelineEvent[]>(`/applications/${id}/timeline`)
  return res.data
}

// ---------------------------------------------------------------------------
// Review Queue
// ---------------------------------------------------------------------------
export async function getReviewQueue(params?: {
  page?: number
  page_size?: number
  status?: string
  ai_decision?: string
}): Promise<{ total: number; pending_count: number; items: ReviewQueueItem[] }> {
  const res = await api.get("/review-queue", { params })
  return res.data
}

export async function getReviewQueueItem(id: string): Promise<ReviewQueueItem> {
  const res = await api.get<ReviewQueueItem>(`/review-queue/${id}`)
  return res.data
}

export async function assignToMe(queueId: string): Promise<void> {
  await api.post(`/review-queue/${queueId}/assign`)
}

export async function submitDecision(
  queueId: string,
  body: {
    decision: "APPROVED" | "REJECTED" | "APPROVED_WITH_OVERRIDE"
    override_amount?: number
    override_rate?: number
    override_tenure?: number
    selected_offer_id?: string
    notes?: string
  }
): Promise<void> {
  await api.post(`/review-queue/${queueId}/decide`, body)
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export async function getDashboardKPIs(periodDays = 30): Promise<DashboardKPIs> {
  const res = await api.get<DashboardKPIs>("/reports/dashboard", {
    params: { period_days: periodDays },
  })
  return res.data
}

export async function getApplicationsReport(params?: {
  period_days?: number
  group_by?: "day" | "week" | "month"
}): Promise<ApplicationsReport> {
  const res = await api.get<ApplicationsReport>("/reports/applications", { params })
  return res.data
}

export async function getRiskDistribution(periodDays = 30): Promise<RiskDistributionReport> {
  const res = await api.get<RiskDistributionReport>("/reports/risk-distribution", {
    params: { period_days: periodDays },
  })
  return res.data
}

export async function getDisbursementsReport(params?: {
  period_days?: number
  group_by?: "day" | "week" | "month"
}): Promise<DisbursementsReport> {
  const res = await api.get<DisbursementsReport>("/reports/disbursements", { params })
  return res.data
}

export async function getReviewPerformance(periodDays = 30): Promise<ReviewPerformanceReport> {
  const res = await api.get<ReviewPerformanceReport>("/reports/review-performance", {
    params: { period_days: periodDays },
  })
  return res.data
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export async function getRiskTierConfigs(): Promise<RiskTierConfig[]> {
  const res = await api.get<RiskTierConfig[]>("/config/risk-tiers")
  return res.data
}

export async function getRiskTierHistory(params?: {
  tier?: string
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<RiskTierConfig>> {
  const res = await api.get<PaginatedResponse<RiskTierConfig>>("/config/risk-tiers/history", { params })
  return res.data
}

export async function updateRiskTier(
  tier: string,
  body: {
    default_interest_rate: number
    min_interest_rate: number
    max_interest_rate: number
    max_loan_amount: number
    min_loan_amount: number
    min_credit_score: number
    max_dti_ratio: number
    effective_from: string
    notes?: string
  }
): Promise<RiskTierConfig> {
  const res = await api.put<RiskTierConfig>(`/config/risk-tiers/${tier}`, body)
  return res.data
}

export async function getPolicies(category?: string): Promise<LoanPolicy[]> {
  const res = await api.get<LoanPolicy[]>("/config/policies", { params: { category } })
  return res.data
}

export async function getPoliciesHistory(params?: {
  policy_key?: string
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<LoanPolicy>> {
  const res = await api.get<PaginatedResponse<LoanPolicy>>("/config/policies/history", { params })
  return res.data
}

export async function updatePolicy(
  policyKey: string,
  body: { policy_value: unknown; notes?: string; effective_from: string }
): Promise<LoanPolicy> {
  const res = await api.put<LoanPolicy>(`/config/policies/${policyKey}`, body)
  return res.data
}

export default api
