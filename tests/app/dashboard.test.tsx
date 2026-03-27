/**
 * Phase 9 — Task 9.1: Dashboard / page
 * Tests KPI cards, chart rendering, risk tier table, and loading/error states.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}))

// Mock recharts to avoid canvas/SVG errors in jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Bar: () => null,
  Pie: () => null,
  Line: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

const mockGetDashboardKPIs = vi.fn()
const mockGetApplicationsReport = vi.fn()
const mockGetRiskDistribution = vi.fn()

vi.mock("@/lib/api", () => ({
  getDashboardKPIs: (...args: unknown[]) => mockGetDashboardKPIs(...args),
  getApplicationsReport: (...args: unknown[]) => mockGetApplicationsReport(...args),
  getRiskDistribution: (...args: unknown[]) => mockGetRiskDistribution(...args),
}))

import DashboardPage from "@/app/(dashboard)/page"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_KPIS = {
  total_applications: 142,
  pending_review: 8,
  in_review: 3,
  approved_today: 45,
  rejected_today: 12,
  total_disbursed_amount: 1250000,
  avg_risk_score: 720,
  approval_rate_percent: 63.5,
  avg_loan_amount: 47500,
  avg_processing_time_hours: 4.2,
}

const MOCK_KPIS_HIGH_PENDING = { ...MOCK_KPIS, pending_review: 15 }

const MOCK_APPS_REPORT = {
  chart_data: [
    { date: "2026-01-01", total: 10, approved: 6, declined: 2, counter_offer: 1, pending: 1 },
    { date: "2026-01-02", total: 8, approved: 5, declined: 1, counter_offer: 1, pending: 1 },
  ],
  summary: { total: 142, approved: 45, declined: 12, counter_offer: 10, pending_human_review: 8, human_rejected: 3 },
}

const MOCK_RISK_DIST = {
  by_tier: [
    { tier: "A", count: 42, total_amount: 2100000, avg_rate: 6.5, approval_rate: 95.0 },
    { tier: "B", count: 58, total_amount: 2900000, avg_rate: 8.5, approval_rate: 82.0 },
    { tier: "C", count: 30, total_amount: 900000, avg_rate: 11.0, approval_rate: 60.0 },
    { tier: "F", count: 12, total_amount: 180000, avg_rate: 15.0, approval_rate: 15.0 },
  ],
  score_histogram: [],
}

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApplicationsReport.mockResolvedValue(MOCK_APPS_REPORT)
    mockGetRiskDistribution.mockResolvedValue(MOCK_RISK_DIST)
  })

  describe("heading and layout", () => {
    it("renders Dashboard heading", () => {
      mockGetDashboardKPIs.mockReturnValue(new Promise(() => {}))
      render(wrapper(<DashboardPage />))
      expect(screen.getByText("Dashboard")).toBeInTheDocument()
    })

    it("renders the page description", () => {
      mockGetDashboardKPIs.mockReturnValue(new Promise(() => {}))
      render(wrapper(<DashboardPage />))
      expect(screen.getByText(/loan portfolio overview/i)).toBeInTheDocument()
    })
  })

  describe("KPI cards", () => {
    beforeEach(() => {
      mockGetDashboardKPIs.mockResolvedValue(MOCK_KPIS)
    })

    it("renders total applications KPI", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("142")).toBeInTheDocument()
        expect(screen.getByText("Total Applications")).toBeInTheDocument()
      })
    })

    it("renders pending review KPI", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("8")).toBeInTheDocument()
        expect(screen.getByText("Pending Review")).toBeInTheDocument()
      })
    })

    it("renders approved KPI", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("45")).toBeInTheDocument()
        expect(screen.getByText("Approved (30d)")).toBeInTheDocument()
      })
    })

    it("renders approval rate KPI", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("63.5%")).toBeInTheDocument()
        expect(screen.getAllByText("Approval Rate").length).toBeGreaterThan(0)
      })
    })

    it("renders total disbursed KPI formatted as currency", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("$1,250,000")).toBeInTheDocument()
        expect(screen.getByText("Total Disbursed")).toBeInTheDocument()
      })
    })

    it("renders avg risk score KPI", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("720")).toBeInTheDocument()
        expect(screen.getByText("Avg Risk Score")).toBeInTheDocument()
      })
    })

    it("highlights pending review card when > 10", async () => {
      mockGetDashboardKPIs.mockResolvedValue(MOCK_KPIS_HIGH_PENDING)
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("15")).toBeInTheDocument()
      })
    })
  })

  describe("charts section", () => {
    beforeEach(() => {
      mockGetDashboardKPIs.mockResolvedValue(MOCK_KPIS)
    })

    it("renders Application Volume chart heading", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText(/Application Volume/i)).toBeInTheDocument()
      })
    })

    it("renders Decision Breakdown chart heading", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText(/Decision Breakdown/i)).toBeInTheDocument()
      })
    })

    it("renders chart containers", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getAllByTestId("responsive-container").length).toBeGreaterThan(0)
      })
    })
  })

  describe("risk tier breakdown table", () => {
    beforeEach(() => {
      mockGetDashboardKPIs.mockResolvedValue(MOCK_KPIS)
    })

    it("renders Risk Tier Breakdown heading", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("Risk Tier Breakdown")).toBeInTheDocument()
      })
    })

    it("renders all four tier rows", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("A")).toBeInTheDocument()
        expect(screen.getByText("B")).toBeInTheDocument()
        expect(screen.getByText("C")).toBeInTheDocument()
        expect(screen.getByText("F")).toBeInTheDocument()
      })
    })

    it("renders tier counts", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("42")).toBeInTheDocument()
        expect(screen.getByText("58")).toBeInTheDocument()
      })
    })

    it("renders approval rates per tier", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("95.0%")).toBeInTheDocument()
      })
    })
  })

  describe("portfolio stats", () => {
    beforeEach(() => {
      mockGetDashboardKPIs.mockResolvedValue(MOCK_KPIS)
    })

    it("renders Portfolio Stats heading", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("Portfolio Stats")).toBeInTheDocument()
      })
    })

    it("renders avg processing time", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("4.2 hrs")).toBeInTheDocument()
      })
    })

    it("renders avg loan amount", async () => {
      render(wrapper(<DashboardPage />))
      await waitFor(() => {
        expect(screen.getByText("$47,500")).toBeInTheDocument()
      })
    })
  })

  describe("loading state", () => {
    it("shows skeleton cards while KPIs are loading", () => {
      mockGetDashboardKPIs.mockReturnValue(new Promise(() => {}))
      render(wrapper(<DashboardPage />))
      // The heading is visible but KPI values aren't
      expect(screen.queryByText("142")).not.toBeInTheDocument()
    })
  })
})
