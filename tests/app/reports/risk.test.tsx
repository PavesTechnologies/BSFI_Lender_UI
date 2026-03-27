/**
 * Phase 9 — Task 9.4: /reports/risk
 * Tests tier charts, table, officer performance (MANAGER+ only).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/reports/risk" }))

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null, Pie: () => null, Cell: () => null,
  XAxis: () => null, YAxis: () => null, CartesianGrid: () => null,
  Tooltip: () => null, Legend: () => null,
}))

const mockGetRiskDistribution = vi.fn()
const mockGetReviewPerformance = vi.fn()
const mockGetStoredUser = vi.fn()

vi.mock("@/lib/api", () => ({
  getRiskDistribution: (...args: unknown[]) => mockGetRiskDistribution(...args),
  getReviewPerformance: (...args: unknown[]) => mockGetReviewPerformance(...args),
}))

vi.mock("@/lib/auth", () => ({
  getStoredUser: () => mockGetStoredUser(),
}))

import RiskReportPage from "@/app/(dashboard)/reports/risk/page"

const MOCK_RISK = {
  by_tier: [
    { tier: "A", count: 42, total_amount: 2100000, avg_rate: 6.5, approval_rate: 95.0 },
    { tier: "B", count: 58, total_amount: 2900000, avg_rate: 8.5, approval_rate: 82.0 },
    { tier: "C", count: 30, total_amount: 900000, avg_rate: 11.0, approval_rate: 60.0 },
    { tier: "F", count: 12, total_amount: 180000, avg_rate: 15.0, approval_rate: 15.0 },
  ],
  score_histogram: [],
}

const MOCK_PERFORMANCE = {
  by_officer: [
    { officer_id: "u-001", officer_name: "Jane Officer", reviewed_count: 25, avg_review_time_hours: 2.3, approved: 18, rejected: 5, overridden: 2 },
    { officer_id: "u-002", officer_name: "John Reviewer", reviewed_count: 30, avg_review_time_hours: 3.1, approved: 22, rejected: 6, overridden: 2 },
  ],
  override_rate_percent: 8.0,
  ai_agreement_rate: 86.4,
}

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("RiskReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRiskDistribution.mockResolvedValue(MOCK_RISK)
    mockGetReviewPerformance.mockResolvedValue(MOCK_PERFORMANCE)
  })

  describe("basic rendering", () => {
    beforeEach(() => {
      mockGetStoredUser.mockReturnValue({ role: "MANAGER" })
    })

    it("renders Risk Report heading", () => {
      render(wrapper(<RiskReportPage />))
      expect(screen.getByText("Risk Report")).toBeInTheDocument()
    })

    it("renders period selector", () => {
      render(wrapper(<RiskReportPage />))
      expect(screen.getByText("7d")).toBeInTheDocument()
      expect(screen.getByText("30d")).toBeInTheDocument()
      expect(screen.getByText("90d")).toBeInTheDocument()
    })

    it("renders applications by risk tier chart heading", async () => {
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getByText(/Applications by Risk Tier/i)).toBeInTheDocument()
      })
    })

    it("renders approval rate chart heading", async () => {
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getByText(/Approval Rate by Tier/i)).toBeInTheDocument()
      })
    })

    it("renders pie chart element", async () => {
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getAllByTestId("pie-chart").length).toBeGreaterThan(0)
      })
    })
  })

  describe("tier details table", () => {
    beforeEach(() => {
      mockGetStoredUser.mockReturnValue({ role: "OFFICER" })
    })

    it("renders Risk Tier Details heading", async () => {
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getByText("Risk Tier Details")).toBeInTheDocument()
      })
    })

    it("renders all tier rows", async () => {
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getAllByText("A").length).toBeGreaterThan(0)
        expect(screen.getAllByText("B").length).toBeGreaterThan(0)
        expect(screen.getAllByText("C").length).toBeGreaterThan(0)
        expect(screen.getAllByText("F").length).toBeGreaterThan(0)
      })
    })

    it("renders tier counts in table", async () => {
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getByText("42")).toBeInTheDocument()
        expect(screen.getByText("58")).toBeInTheDocument()
      })
    })

    it("renders approval rates in table", async () => {
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getByText("95.0%")).toBeInTheDocument()
      })
    })
  })

  describe("officer performance — MANAGER+ only", () => {
    it("shows officer performance section for MANAGER", async () => {
      mockGetStoredUser.mockReturnValue({ role: "MANAGER" })
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getByText("Officer Performance")).toBeInTheDocument()
      })
    })

    it("shows officer performance section for ADMIN", async () => {
      mockGetStoredUser.mockReturnValue({ role: "ADMIN" })
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getByText("Officer Performance")).toBeInTheDocument()
      })
    })

    it("does NOT show officer performance for OFFICER role", async () => {
      mockGetStoredUser.mockReturnValue({ role: "OFFICER" })
      mockGetRiskDistribution.mockResolvedValue(MOCK_RISK)
      render(wrapper(<RiskReportPage />))
      await waitFor(() => screen.getByText("Risk Tier Details"))
      expect(screen.queryByText("Officer Performance")).not.toBeInTheDocument()
    })

    it("shows officer names in table", async () => {
      mockGetStoredUser.mockReturnValue({ role: "MANAGER" })
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getByText("Jane Officer")).toBeInTheDocument()
        expect(screen.getByText("John Reviewer")).toBeInTheDocument()
      })
    })

    it("shows override rate summary", async () => {
      mockGetStoredUser.mockReturnValue({ role: "MANAGER" })
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getByText(/Override Rate/i)).toBeInTheDocument()
        expect(screen.getByText("8.0%")).toBeInTheDocument()
      })
    })

    it("shows AI agreement rate summary", async () => {
      mockGetStoredUser.mockReturnValue({ role: "MANAGER" })
      render(wrapper(<RiskReportPage />))
      await waitFor(() => {
        expect(screen.getByText(/AI Agreement/i)).toBeInTheDocument()
        expect(screen.getByText("86.4%")).toBeInTheDocument()
      })
    })
  })

  describe("period selector", () => {
    it("calls getRiskDistribution with period_days=7 on 7d click", async () => {
      mockGetStoredUser.mockReturnValue({ role: "OFFICER" })
      const user = userEvent.setup()
      render(wrapper(<RiskReportPage />))
      await user.click(screen.getByText("7d"))
      await waitFor(() => {
        expect(mockGetRiskDistribution).toHaveBeenCalledWith(7)
      })
    })

    it("calls getRiskDistribution with period_days=90 on 90d click", async () => {
      mockGetStoredUser.mockReturnValue({ role: "OFFICER" })
      const user = userEvent.setup()
      render(wrapper(<RiskReportPage />))
      await user.click(screen.getByText("90d"))
      await waitFor(() => {
        expect(mockGetRiskDistribution).toHaveBeenCalledWith(90)
      })
    })
  })
})
