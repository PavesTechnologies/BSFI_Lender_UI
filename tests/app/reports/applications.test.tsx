/**
 * Phase 9 — Task 9.2: /reports/applications
 * Tests period selector, summary cards, chart rendering, table.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/reports/applications" }))

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null, Line: () => null, Cell: () => null,
  XAxis: () => null, YAxis: () => null, CartesianGrid: () => null,
  Tooltip: () => null, Legend: () => null,
}))

const mockGetApplicationsReport = vi.fn()
vi.mock("@/lib/api", () => ({
  getApplicationsReport: (...args: unknown[]) => mockGetApplicationsReport(...args),
}))

import ApplicationsReportPage from "@/app/(dashboard)/reports/applications/page"

const MOCK_REPORT = {
  chart_data: [
    { date: "2026-01-01", total: 12, approved: 7, declined: 3, counter_offer: 1, pending: 1 },
    { date: "2026-01-02", total: 10, approved: 6, declined: 2, counter_offer: 1, pending: 1 },
  ],
  summary: { total: 142, approved: 45, declined: 12, counter_offer: 10, pending_human_review: 8, human_rejected: 3 },
}

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("ApplicationsReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApplicationsReport.mockResolvedValue(MOCK_REPORT)
  })

  it("renders the page heading", () => {
    render(wrapper(<ApplicationsReportPage />))
    expect(screen.getByText("Applications Report")).toBeInTheDocument()
  })

  it("renders period selector buttons (7d, 30d, 90d)", () => {
    render(wrapper(<ApplicationsReportPage />))
    expect(screen.getByText("7d")).toBeInTheDocument()
    expect(screen.getByText("30d")).toBeInTheDocument()
    expect(screen.getByText("90d")).toBeInTheDocument()
  })

  it("renders summary stat cards after load", async () => {
    render(wrapper(<ApplicationsReportPage />))
    await waitFor(() => {
      expect(screen.getAllByText("142").length).toBeGreaterThan(0)
      expect(screen.getAllByText("45").length).toBeGreaterThan(0)
    })
  })

  it("renders Total label", async () => {
    render(wrapper(<ApplicationsReportPage />))
    await waitFor(() => {
      expect(screen.getByText("Total")).toBeInTheDocument()
    })
  })

  it("renders Approved stat card", async () => {
    render(wrapper(<ApplicationsReportPage />))
    await waitFor(() => {
      expect(screen.getByText("Approved")).toBeInTheDocument()
    })
  })

  it("renders Declined stat card", async () => {
    render(wrapper(<ApplicationsReportPage />))
    await waitFor(() => {
      expect(screen.getByText("Declined")).toBeInTheDocument()
    })
  })

  it("renders Counter Offer stat card", async () => {
    render(wrapper(<ApplicationsReportPage />))
    await waitFor(() => {
      expect(screen.getByText("Counter Offer")).toBeInTheDocument()
    })
  })

  it("renders Pending Review stat card", async () => {
    render(wrapper(<ApplicationsReportPage />))
    await waitFor(() => {
      expect(screen.getByText("Pending Review")).toBeInTheDocument()
    })
  })

  it("renders line chart heading", async () => {
    render(wrapper(<ApplicationsReportPage />))
    await waitFor(() => {
      expect(screen.getByText(/Applications Over Time/i)).toBeInTheDocument()
    })
  })

  it("renders line chart element", async () => {
    render(wrapper(<ApplicationsReportPage />))
    await waitFor(() => {
      expect(screen.getByTestId("line-chart")).toBeInTheDocument()
    })
  })

  it("calls getApplicationsReport with period_days=30 by default", async () => {
    render(wrapper(<ApplicationsReportPage />))
    await waitFor(() => {
      expect(mockGetApplicationsReport).toHaveBeenCalledWith(expect.objectContaining({ period_days: 30 }))
    })
  })

  it("calls getApplicationsReport with period_days=7 when 7d is clicked", async () => {
    const user = userEvent.setup()
    render(wrapper(<ApplicationsReportPage />))
    await user.click(screen.getByText("7d"))
    await waitFor(() => {
      expect(mockGetApplicationsReport).toHaveBeenCalledWith(expect.objectContaining({ period_days: 7 }))
    })
  })

  it("calls getApplicationsReport with period_days=90 when 90d is clicked", async () => {
    const user = userEvent.setup()
    render(wrapper(<ApplicationsReportPage />))
    await user.click(screen.getByText("90d"))
    await waitFor(() => {
      expect(mockGetApplicationsReport).toHaveBeenCalledWith(expect.objectContaining({ period_days: 90 }))
    })
  })

  it("renders group-by toggle buttons", () => {
    render(wrapper(<ApplicationsReportPage />))
    expect(screen.getByText("day")).toBeInTheDocument()
    expect(screen.getByText("week")).toBeInTheDocument()
    expect(screen.getByText("month")).toBeInTheDocument()
  })

  it("renders summary stats table heading", async () => {
    render(wrapper(<ApplicationsReportPage />))
    await waitFor(() => {
      expect(screen.getByText(/Summary Statistics Table/i)).toBeInTheDocument()
    })
  })
})
