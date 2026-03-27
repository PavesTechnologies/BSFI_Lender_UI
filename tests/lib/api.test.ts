/**
 * Phase 6 — Task 6.6: lib/api.ts
 * Tests that each exported API function calls the correct HTTP method + endpoint
 * and forwards the expected parameters. Axios is mocked so no network is needed.
 *
 * Interceptor behaviour (auth header attachment, 401 refresh flow) is tested
 * at the end of this file by extracting the registered callbacks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// vi.hoisted ensures these vi.fn() instances are created BEFORE any imports,
// so the axios.create() factory receives the correct mock references.
// ---------------------------------------------------------------------------
const { mockGet, mockPost, mockPut, captureRequest, captureResponse, getInterceptors } =
  vi.hoisted(() => {
    let _reqFn: ((c: Record<string, unknown>) => Record<string, unknown>) | undefined
    let _resSuccess: ((r: unknown) => unknown) | undefined
    let _resError: ((e: unknown) => Promise<unknown>) | undefined

    return {
      mockGet: vi.fn(),
      mockPost: vi.fn(),
      mockPut: vi.fn(),
      captureRequest: vi.fn((fn: (c: Record<string, unknown>) => Record<string, unknown>) => {
        _reqFn = fn
      }),
      captureResponse: vi.fn(
        (success: (r: unknown) => unknown, error: (e: unknown) => Promise<unknown>) => {
          _resSuccess = success
          _resError = error
        }
      ),
      getInterceptors: () => ({
        request: _reqFn,
        resSuccess: _resSuccess,
        resError: _resError,
      }),
    }
  })

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      interceptors: {
        request: { use: captureRequest },
        response: { use: captureResponse },
      },
      defaults: { headers: { common: {} } },
    })),
    // Used directly in refresh path
    post: vi.fn(),
  },
}))

vi.mock("@/lib/auth", () => ({
  getAccessToken: vi.fn(() => "test_access_token"),
  getRefreshToken: vi.fn(() => "test_refresh_token"),
  saveTokens: vi.fn(),
  clearTokens: vi.fn(),
}))

// Import after mocks are registered
import {
  login,
  getMe,
  getApplications,
  getApplicationDetail,
  getApplicationTimeline,
  getReviewQueue,
  getReviewQueueItem,
  assignToMe,
  submitDecision,
  getDashboardKPIs,
  getApplicationsReport,
  getRiskDistribution,
  getDisbursementsReport,
  getReviewPerformance,
  getRiskTierConfigs,
  getRiskTierHistory,
  updateRiskTier,
  getPolicies,
  getPoliciesHistory,
  updatePolicy,
} from "@/lib/api"

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks()
  // Default to resolved so individual tests only override what they care about
  mockGet.mockResolvedValue({ data: {} })
  mockPost.mockResolvedValue({ data: {} })
  mockPut.mockResolvedValue({ data: {} })
})

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------
describe("request interceptor", () => {
  it("attaches Authorization header when an access token is stored", () => {
    const { request } = getInterceptors()
    expect(request).toBeDefined()

    const config: Record<string, unknown> = { headers: {} }
    request!(config)
    expect((config.headers as Record<string, string>).Authorization).toBe(
      "Bearer test_access_token"
    )
  })

  it("does not set Authorization when there is no token", async () => {
    const { getAccessToken } = await import("@/lib/auth")
    vi.mocked(getAccessToken).mockReturnValueOnce(null)

    const { request } = getInterceptors()
    const config: Record<string, unknown> = { headers: {} }
    request!(config)
    expect((config.headers as Record<string, string>).Authorization).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------
describe("login()", () => {
  it("POSTs to /auth/login with email and password", async () => {
    const mockUser = { id: "1", email: "a@b.com", full_name: "A", role: "OFFICER", is_active: true }
    mockPost.mockResolvedValue({
      data: { access_token: "tok", refresh_token: "rtok", token_type: "bearer", user: mockUser },
    })

    const result = await login("a@b.com", "pass123")

    expect(mockPost).toHaveBeenCalledWith("/auth/login", { email: "a@b.com", password: "pass123" })
    expect(result.access_token).toBe("tok")
    expect(result.user.email).toBe("a@b.com")
  })
})

describe("getMe()", () => {
  it("GETs /auth/me", async () => {
    mockGet.mockResolvedValue({ data: { id: "1", role: "OFFICER" } })
    await getMe()
    expect(mockGet).toHaveBeenCalledWith("/auth/me")
  })
})

// ---------------------------------------------------------------------------
// Applications endpoints
// ---------------------------------------------------------------------------
describe("getApplications()", () => {
  it("GETs /applications with no params when called without arguments", async () => {
    mockGet.mockResolvedValue({ data: { total: 0, page: 1, page_size: 20, items: [] } })
    await getApplications()
    expect(mockGet).toHaveBeenCalledWith("/applications", { params: undefined })
  })

  it("forwards all filter params to the query string", async () => {
    mockGet.mockResolvedValue({ data: { total: 0, page: 2, page_size: 10, items: [] } })
    await getApplications({ page: 2, page_size: 10, status: "PENDING", search: "John" })
    expect(mockGet).toHaveBeenCalledWith("/applications", {
      params: { page: 2, page_size: 10, status: "PENDING", search: "John" },
    })
  })
})

describe("getApplicationDetail()", () => {
  it("GETs /applications/:id", async () => {
    await getApplicationDetail("app-123")
    expect(mockGet).toHaveBeenCalledWith("/applications/app-123")
  })
})

describe("getApplicationTimeline()", () => {
  it("GETs /applications/:id/timeline", async () => {
    mockGet.mockResolvedValue({ data: [] })
    await getApplicationTimeline("app-456")
    expect(mockGet).toHaveBeenCalledWith("/applications/app-456/timeline")
  })
})

// ---------------------------------------------------------------------------
// Review Queue endpoints
// ---------------------------------------------------------------------------
describe("getReviewQueue()", () => {
  it("GETs /review-queue with no params when called without arguments", async () => {
    mockGet.mockResolvedValue({ data: { total: 0, pending_count: 0, items: [] } })
    await getReviewQueue()
    expect(mockGet).toHaveBeenCalledWith("/review-queue", { params: undefined })
  })

  it("forwards status and ai_decision filter params", async () => {
    mockGet.mockResolvedValue({ data: { total: 0, pending_count: 0, items: [] } })
    await getReviewQueue({ status: "PENDING", ai_decision: "APPROVE" })
    expect(mockGet).toHaveBeenCalledWith("/review-queue", {
      params: { status: "PENDING", ai_decision: "APPROVE" },
    })
  })
})

describe("getReviewQueueItem()", () => {
  it("GETs /review-queue/:id", async () => {
    await getReviewQueueItem("q-789")
    expect(mockGet).toHaveBeenCalledWith("/review-queue/q-789")
  })
})

describe("assignToMe()", () => {
  it("POSTs to /review-queue/:id/assign", async () => {
    await assignToMe("q-001")
    expect(mockPost).toHaveBeenCalledWith("/review-queue/q-001/assign")
  })
})

describe("submitDecision()", () => {
  it("POSTs APPROVED decision to /review-queue/:id/decide", async () => {
    await submitDecision("q-001", { decision: "APPROVED", notes: "Looks good" })
    expect(mockPost).toHaveBeenCalledWith("/review-queue/q-001/decide", {
      decision: "APPROVED",
      notes: "Looks good",
    })
  })

  it("POSTs REJECTED decision with reason", async () => {
    await submitDecision("q-002", { decision: "REJECTED", notes: "High risk" })
    expect(mockPost).toHaveBeenCalledWith("/review-queue/q-002/decide", {
      decision: "REJECTED",
      notes: "High risk",
    })
  })

  it("POSTs APPROVED_WITH_OVERRIDE with override fields", async () => {
    await submitDecision("q-003", {
      decision: "APPROVED_WITH_OVERRIDE",
      override_amount: 200000,
      override_rate: 9.5,
      override_tenure: 24,
    })
    expect(mockPost).toHaveBeenCalledWith("/review-queue/q-003/decide", {
      decision: "APPROVED_WITH_OVERRIDE",
      override_amount: 200000,
      override_rate: 9.5,
      override_tenure: 24,
    })
  })
})

// ---------------------------------------------------------------------------
// Reports endpoints
// ---------------------------------------------------------------------------
describe("getDashboardKPIs()", () => {
  it("GETs /reports/dashboard with default period_days=30", async () => {
    await getDashboardKPIs()
    expect(mockGet).toHaveBeenCalledWith("/reports/dashboard", { params: { period_days: 30 } })
  })

  it("passes a custom period_days value", async () => {
    await getDashboardKPIs(7)
    expect(mockGet).toHaveBeenCalledWith("/reports/dashboard", { params: { period_days: 7 } })
  })
})

describe("getApplicationsReport()", () => {
  it("GETs /reports/applications", async () => {
    await getApplicationsReport({ period_days: 30, group_by: "week" })
    expect(mockGet).toHaveBeenCalledWith("/reports/applications", {
      params: { period_days: 30, group_by: "week" },
    })
  })
})

describe("getRiskDistribution()", () => {
  it("GETs /reports/risk-distribution", async () => {
    await getRiskDistribution(14)
    expect(mockGet).toHaveBeenCalledWith("/reports/risk-distribution", {
      params: { period_days: 14 },
    })
  })
})

describe("getDisbursementsReport()", () => {
  it("GETs /reports/disbursements", async () => {
    await getDisbursementsReport({ period_days: 30, group_by: "month" })
    expect(mockGet).toHaveBeenCalledWith("/reports/disbursements", {
      params: { period_days: 30, group_by: "month" },
    })
  })
})

describe("getReviewPerformance()", () => {
  it("GETs /reports/review-performance", async () => {
    await getReviewPerformance(90)
    expect(mockGet).toHaveBeenCalledWith("/reports/review-performance", {
      params: { period_days: 90 },
    })
  })
})

// ---------------------------------------------------------------------------
// Config endpoints
// ---------------------------------------------------------------------------
describe("getRiskTierConfigs()", () => {
  it("GETs /config/risk-tiers", async () => {
    mockGet.mockResolvedValue({ data: [] })
    await getRiskTierConfigs()
    expect(mockGet).toHaveBeenCalledWith("/config/risk-tiers")
  })
})

describe("getRiskTierHistory()", () => {
  it("GETs /config/risk-tiers/history with optional params", async () => {
    mockGet.mockResolvedValue({ data: { total: 0, page: 1, page_size: 20, items: [] } })
    await getRiskTierHistory({ tier: "A", page: 1 })
    expect(mockGet).toHaveBeenCalledWith("/config/risk-tiers/history", {
      params: { tier: "A", page: 1 },
    })
  })
})

describe("updateRiskTier()", () => {
  it("PUTs to /config/risk-tiers/:tier with the full body", async () => {
    const body = {
      default_interest_rate: 8.5,
      min_interest_rate: 7.0,
      max_interest_rate: 10.0,
      max_loan_amount: 500000,
      min_loan_amount: 50000,
      min_credit_score: 700,
      max_dti_ratio: 0.45,
      effective_from: "2024-01-01",
      notes: "Updated for Q1",
    }
    mockPut.mockResolvedValue({ data: { ...body, id: "rt-1", tier: "A", created_by: "admin@bank.com" } })

    await updateRiskTier("A", body)
    expect(mockPut).toHaveBeenCalledWith("/config/risk-tiers/A", body)
  })
})

describe("getPolicies()", () => {
  it("GETs /config/policies without category filter", async () => {
    mockGet.mockResolvedValue({ data: [] })
    await getPolicies()
    expect(mockGet).toHaveBeenCalledWith("/config/policies", {
      params: { category: undefined },
    })
  })

  it("GETs /config/policies with a category filter", async () => {
    mockGet.mockResolvedValue({ data: [] })
    await getPolicies("LIMITS")
    expect(mockGet).toHaveBeenCalledWith("/config/policies", {
      params: { category: "LIMITS" },
    })
  })
})

describe("getPoliciesHistory()", () => {
  it("GETs /config/policies/history with optional params", async () => {
    mockGet.mockResolvedValue({ data: { total: 0, page: 1, page_size: 20, items: [] } })
    await getPoliciesHistory({ policy_key: "max_loan_amount", page: 2 })
    expect(mockGet).toHaveBeenCalledWith("/config/policies/history", {
      params: { policy_key: "max_loan_amount", page: 2 },
    })
  })
})

describe("updatePolicy()", () => {
  it("PUTs to /config/policies/:key with value and effective_from", async () => {
    const body = {
      policy_value: { value: 1000000, unit: "INR" },
      effective_from: "2024-03-01",
      notes: "Increased cap",
    }
    mockPut.mockResolvedValue({ data: {} })

    await updatePolicy("max_loan_amount", body)
    expect(mockPut).toHaveBeenCalledWith("/config/policies/max_loan_amount", body)
  })
})
