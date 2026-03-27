/**
 * Phase 10 — Task 10.2: /config/interest-rates
 * Tests table rendering, ADMIN edit access, validation, and two-step confirm.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/config/interest-rates" }))
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))

const mockGetRiskTierConfigs = vi.fn()
const mockGetRiskTierHistory = vi.fn()
const mockUpdateRiskTier = vi.fn()
const mockGetStoredUser = vi.fn()

vi.mock("@/lib/api", () => ({
  getRiskTierConfigs: () => mockGetRiskTierConfigs(),
  getRiskTierHistory: (...args: unknown[]) => mockGetRiskTierHistory(...args),
  updateRiskTier: (...args: unknown[]) => mockUpdateRiskTier(...args),
}))

vi.mock("@/lib/auth", () => ({
  getStoredUser: () => mockGetStoredUser(),
}))

import InterestRatesPage from "@/app/(dashboard)/config/interest-rates/page"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_TIERS = [
  { id: "rt-A", tier: "A" as const, default_interest_rate: 6.5, min_interest_rate: 5.0, max_interest_rate: 9.0, max_loan_amount: 500000, min_loan_amount: 10000, min_credit_score: 720, max_dti_ratio: 36.0, effective_from: "2026-01-01T00:00:00Z", created_by: "u-001", created_by_name: "Admin User", notes: "Initial setup", is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "rt-B", tier: "B" as const, default_interest_rate: 8.5, min_interest_rate: 7.0, max_interest_rate: 12.0, max_loan_amount: 300000, min_loan_amount: 5000, min_credit_score: 660, max_dti_ratio: 43.0, effective_from: "2026-01-01T00:00:00Z", created_by: "u-001", created_by_name: "Admin User", notes: null, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "rt-C", tier: "C" as const, default_interest_rate: 11.0, min_interest_rate: 9.0, max_interest_rate: 15.0, max_loan_amount: 150000, min_loan_amount: 2000, min_credit_score: 580, max_dti_ratio: 50.0, effective_from: "2026-01-01T00:00:00Z", created_by: "u-001", created_by_name: "Admin User", notes: null, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "rt-F", tier: "F" as const, default_interest_rate: 18.0, min_interest_rate: 15.0, max_interest_rate: 25.0, max_loan_amount: 50000, min_loan_amount: 1000, min_credit_score: 500, max_dti_ratio: 55.0, effective_from: "2026-01-01T00:00:00Z", created_by: "u-001", created_by_name: "Admin User", notes: null, is_active: true, created_at: "2026-01-01T00:00:00Z" },
]

const MOCK_HISTORY_PAGE = { total: 1, page: 1, page_size: 10, items: [MOCK_TIERS[0]] }

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("InterestRatesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRiskTierConfigs.mockResolvedValue(MOCK_TIERS)
    mockGetRiskTierHistory.mockResolvedValue(MOCK_HISTORY_PAGE)
  })

  describe("table rendering", () => {
    beforeEach(() => {
      mockGetStoredUser.mockReturnValue({ role: "MANAGER" })
    })

    it("renders page heading", () => {
      render(wrapper(<InterestRatesPage />))
      expect(screen.getByText("Interest Rate Configuration")).toBeInTheDocument()
    })

    it("renders all tier rows (A, B, C, F)", async () => {
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => {
        expect(screen.getByText("A")).toBeInTheDocument()
        expect(screen.getByText("B")).toBeInTheDocument()
        expect(screen.getByText("C")).toBeInTheDocument()
        expect(screen.getByText("F")).toBeInTheDocument()
      })
    })

    it("renders default rates", async () => {
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => {
        expect(screen.getByText("6.5%")).toBeInTheDocument()
        expect(screen.getByText("8.5%")).toBeInTheDocument()
      })
    })

    it("renders max loan amounts", async () => {
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => {
        expect(screen.getByText("$500,000")).toBeInTheDocument()
        expect(screen.getByText("$300,000")).toBeInTheDocument()
      })
    })

    it("renders changed-by names", async () => {
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => {
        expect(screen.getAllByText("Admin User").length).toBeGreaterThan(0)
      })
    })

    it("renders table column headers", async () => {
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => {
        expect(screen.getByText("Tier")).toBeInTheDocument()
        expect(screen.getByText("Default Rate")).toBeInTheDocument()
        expect(screen.getByText("Max Loan")).toBeInTheDocument()
      })
    })
  })

  describe("ADMIN edit access", () => {
    it("shows Edit buttons for ADMIN role", async () => {
      mockGetStoredUser.mockReturnValue({ role: "ADMIN" })
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: /edit/i }).length).toBeGreaterThan(0)
      })
    })

    it("does NOT show Edit buttons for MANAGER role", async () => {
      mockGetStoredUser.mockReturnValue({ role: "MANAGER" })
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => screen.getByText("A"))
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })

    it("does NOT show Edit buttons for OFFICER role", async () => {
      mockGetStoredUser.mockReturnValue({ role: "OFFICER" })
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => screen.getByText("A"))
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })
  })

  describe("edit form for ADMIN", () => {
    beforeEach(() => {
      mockGetStoredUser.mockReturnValue({ role: "ADMIN" })
    })

    it("shows edit form when Edit button is clicked", async () => {
      const user = userEvent.setup()
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => screen.getAllByRole("button", { name: /edit/i }))
      await user.click(screen.getAllByRole("button", { name: /edit/i })[0])
      await waitFor(() => {
        expect(screen.getByText("Review Changes")).toBeInTheDocument()
      })
    })

    it("shows validation error when min > default rate", async () => {
      const user = userEvent.setup()
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => screen.getAllByRole("button", { name: /edit/i }))
      await user.click(screen.getAllByRole("button", { name: /edit/i })[0])
      await waitFor(() => screen.getByText("Review Changes"))

      // Set min rate higher than default
      const minInput = screen.getAllByDisplayValue("5")[0] // min_interest_rate
      await user.clear(minInput)
      await user.type(minInput, "20")

      expect(screen.getByText(/Min rate ≤ Default rate/i)).toBeInTheDocument()
    })

    it("shows confirmation step after clicking Review Changes", async () => {
      const user = userEvent.setup()
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => screen.getAllByRole("button", { name: /edit/i }))
      await user.click(screen.getAllByRole("button", { name: /edit/i })[0])
      await waitFor(() => screen.getByText("Review Changes"))
      await user.click(screen.getByText("Review Changes"))
      await waitFor(() => {
        expect(screen.getByText(/This will affect all new applications/i)).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Confirm & Save/i })).toBeInTheDocument()
      })
    })

    it("calls updateRiskTier on confirm", async () => {
      mockUpdateRiskTier.mockResolvedValue(MOCK_TIERS[0])
      const user = userEvent.setup()
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => screen.getAllByRole("button", { name: /edit/i }))
      await user.click(screen.getAllByRole("button", { name: /edit/i })[0])
      await waitFor(() => screen.getByText("Review Changes"))
      await user.click(screen.getByText("Review Changes"))
      await waitFor(() => screen.getByRole("button", { name: /Confirm & Save/i }))
      await user.click(screen.getByRole("button", { name: /Confirm & Save/i }))
      await waitFor(() => {
        expect(mockUpdateRiskTier).toHaveBeenCalledWith("A", expect.objectContaining({ default_interest_rate: expect.any(Number) }))
      })
    })

    it("closes form when Cancel is clicked", async () => {
      const user = userEvent.setup()
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => screen.getAllByRole("button", { name: /edit/i }))
      await user.click(screen.getAllByRole("button", { name: /edit/i })[0])
      await waitFor(() => screen.getByText("Cancel"))
      await user.click(screen.getByRole("button", { name: "Cancel" }))
      await waitFor(() => {
        expect(screen.queryByText("Review Changes")).not.toBeInTheDocument()
      })
    })
  })

  describe("change history", () => {
    beforeEach(() => {
      mockGetStoredUser.mockReturnValue({ role: "MANAGER" })
    })

    it("renders Change History toggle for each tier", async () => {
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => {
        expect(screen.getAllByText("Change History").length).toBeGreaterThan(0)
      })
    })

    it("loads history data when toggle is clicked", async () => {
      const user = userEvent.setup()
      render(wrapper(<InterestRatesPage />))
      await waitFor(() => screen.getAllByText("Change History"))
      await user.click(screen.getAllByText("Change History")[0])
      await waitFor(() => {
        expect(mockGetRiskTierHistory).toHaveBeenCalled()
      })
    })
  })
})
