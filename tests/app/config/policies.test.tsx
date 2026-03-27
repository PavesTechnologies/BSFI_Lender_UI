/**
 * Phase 10 — Task 10.3 & 10.4: /config/policies + role enforcement
 * Tests policy cards, ADMIN edit access, history toggle, two-step save.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/config/policies" }))
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))

const mockGetPolicies = vi.fn()
const mockGetPoliciesHistory = vi.fn()
const mockUpdatePolicy = vi.fn()
const mockGetStoredUser = vi.fn()

vi.mock("@/lib/api", () => ({
  getPolicies: () => mockGetPolicies(),
  getPoliciesHistory: (...args: unknown[]) => mockGetPoliciesHistory(...args),
  updatePolicy: (...args: unknown[]) => mockUpdatePolicy(...args),
}))

vi.mock("@/lib/auth", () => ({
  getStoredUser: () => mockGetStoredUser(),
}))

import PoliciesPage from "@/app/(dashboard)/config/policies/page"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_POLICIES = [
  { id: "p-001", policy_key: "max_loan_amount", policy_value: { value: 1000000, unit: "currency" }, description: "Maximum Loan Amount", category: "LIMITS" as const, is_active: true, effective_from: "2026-01-01T00:00:00Z", created_by: "u-001", created_by_name: "Admin User", notes: null, created_at: "2026-01-01T00:00:00Z" },
  { id: "p-002", policy_key: "min_credit_score", policy_value: { value: 500, unit: "" }, description: "Minimum Credit Score", category: "UNDERWRITING" as const, is_active: true, effective_from: "2026-01-01T00:00:00Z", created_by: "u-001", created_by_name: "Admin User", notes: "Risk floor", created_at: "2026-01-01T00:00:00Z" },
  { id: "p-003", policy_key: "max_dti_ratio", policy_value: { value: 43, unit: "percent" }, description: "Max DTI Ratio", category: "UNDERWRITING" as const, is_active: true, effective_from: "2026-01-01T00:00:00Z", created_by: "u-001", created_by_name: "Admin User", notes: null, created_at: "2026-01-01T00:00:00Z" },
  { id: "p-004", policy_key: "disbursement_delay_days", policy_value: { value: 3, unit: "days" }, description: "Disbursement Delay Days", category: "DISBURSEMENT" as const, is_active: true, effective_from: "2026-01-01T00:00:00Z", created_by: "u-001", created_by_name: "Admin User", notes: null, created_at: "2026-01-01T00:00:00Z" },
  { id: "p-005", policy_key: "kyc_confidence_threshold", policy_value: { value: 0.7, unit: "" }, description: "KYC Confidence Threshold", category: "KYC" as const, is_active: true, effective_from: "2026-01-01T00:00:00Z", created_by: "u-001", created_by_name: "Admin User", notes: null, created_at: "2026-01-01T00:00:00Z" },
]

const MOCK_HISTORY = { total: 1, page: 1, page_size: 5, items: [MOCK_POLICIES[0]] }

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("PoliciesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPolicies.mockResolvedValue(MOCK_POLICIES)
    mockGetPoliciesHistory.mockResolvedValue(MOCK_HISTORY)
  })

  describe("rendering", () => {
    beforeEach(() => {
      mockGetStoredUser.mockReturnValue({ role: "MANAGER" })
    })

    it("renders the page heading", () => {
      render(wrapper(<PoliciesPage />))
      expect(screen.getByText("Loan Policies")).toBeInTheDocument()
    })

    it("renders LIMITS category heading", async () => {
      render(wrapper(<PoliciesPage />))
      await waitFor(() => {
        expect(screen.getByText("LIMITS")).toBeInTheDocument()
      })
    })

    it("renders UNDERWRITING category heading", async () => {
      render(wrapper(<PoliciesPage />))
      await waitFor(() => {
        expect(screen.getByText("UNDERWRITING")).toBeInTheDocument()
      })
    })

    it("renders DISBURSEMENT category heading", async () => {
      render(wrapper(<PoliciesPage />))
      await waitFor(() => {
        expect(screen.getByText("DISBURSEMENT")).toBeInTheDocument()
      })
    })

    it("renders KYC category heading", async () => {
      render(wrapper(<PoliciesPage />))
      await waitFor(() => {
        expect(screen.getByText("KYC")).toBeInTheDocument()
      })
    })

    it("renders policy descriptions", async () => {
      render(wrapper(<PoliciesPage />))
      await waitFor(() => {
        expect(screen.getByText("Maximum Loan Amount")).toBeInTheDocument()
        expect(screen.getByText("Minimum Credit Score")).toBeInTheDocument()
        expect(screen.getByText("Max DTI Ratio")).toBeInTheDocument()
      })
    })

    it("renders policy keys", async () => {
      render(wrapper(<PoliciesPage />))
      await waitFor(() => {
        expect(screen.getByText("max_loan_amount")).toBeInTheDocument()
        expect(screen.getByText("min_credit_score")).toBeInTheDocument()
      })
    })

    it("formats currency policy value", async () => {
      render(wrapper(<PoliciesPage />))
      await waitFor(() => {
        expect(screen.getByText("$1,000,000")).toBeInTheDocument()
      })
    })

    it("formats percent policy value", async () => {
      render(wrapper(<PoliciesPage />))
      await waitFor(() => {
        expect(screen.getByText("43.0%")).toBeInTheDocument()
      })
    })

    it("shows changed-by name", async () => {
      render(wrapper(<PoliciesPage />))
      await waitFor(() => {
        expect(screen.getAllByText(/Admin User/).length).toBeGreaterThan(0)
      })
    })
  })

  describe("ADMIN edit access", () => {
    it("shows Edit buttons for ADMIN role", async () => {
      mockGetStoredUser.mockReturnValue({ role: "ADMIN" })
      render(wrapper(<PoliciesPage />))
      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: /edit/i }).length).toBeGreaterThan(0)
      })
    })

    it("does NOT show Edit buttons for MANAGER role", async () => {
      mockGetStoredUser.mockReturnValue({ role: "MANAGER" })
      render(wrapper(<PoliciesPage />))
      await waitFor(() => screen.getByText("Maximum Loan Amount"))
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })

    it("does NOT show Edit buttons for OFFICER role", async () => {
      mockGetStoredUser.mockReturnValue({ role: "OFFICER" })
      render(wrapper(<PoliciesPage />))
      await waitFor(() => screen.getByText("Maximum Loan Amount"))
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })
  })

  describe("edit form", () => {
    beforeEach(() => {
      mockGetStoredUser.mockReturnValue({ role: "ADMIN" })
    })

    it("shows edit form when Edit is clicked", async () => {
      const user = userEvent.setup()
      render(wrapper(<PoliciesPage />))
      await waitFor(() => screen.getAllByRole("button", { name: /edit/i }))
      await user.click(screen.getAllByRole("button", { name: /edit/i })[0])
      await waitFor(() => {
        expect(screen.getByText("Review Changes")).toBeInTheDocument()
      })
    })

    it("shows confirmation step after Review Changes click", async () => {
      const user = userEvent.setup()
      render(wrapper(<PoliciesPage />))
      await waitFor(() => screen.getAllByRole("button", { name: /edit/i }))
      await user.click(screen.getAllByRole("button", { name: /edit/i })[0])
      await waitFor(() => screen.getByText("Review Changes"))
      await user.click(screen.getByText("Review Changes"))
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Confirm & Save/i })).toBeInTheDocument()
      })
    })

    it("calls updatePolicy on confirm", async () => {
      mockUpdatePolicy.mockResolvedValue(MOCK_POLICIES[0])
      const user = userEvent.setup()
      render(wrapper(<PoliciesPage />))
      await waitFor(() => screen.getAllByRole("button", { name: /edit/i }))
      await user.click(screen.getAllByRole("button", { name: /edit/i })[0])
      await waitFor(() => screen.getByText("Review Changes"))
      await user.click(screen.getByText("Review Changes"))
      await waitFor(() => screen.getByRole("button", { name: /Confirm & Save/i }))
      await user.click(screen.getByRole("button", { name: /Confirm & Save/i }))
      await waitFor(() => {
        expect(mockUpdatePolicy).toHaveBeenCalledWith("max_loan_amount", expect.objectContaining({ policy_value: expect.any(Object) }))
      })
    })

    it("closes form when Cancel is clicked", async () => {
      const user = userEvent.setup()
      render(wrapper(<PoliciesPage />))
      await waitFor(() => screen.getAllByRole("button", { name: /edit/i }))
      await user.click(screen.getAllByRole("button", { name: /edit/i })[0])
      await waitFor(() => screen.getByText("Cancel"))
      await user.click(screen.getByRole("button", { name: "Cancel" }))
      await waitFor(() => {
        expect(screen.queryByText("Review Changes")).not.toBeInTheDocument()
      })
    })
  })

  describe("policy history", () => {
    beforeEach(() => {
      mockGetStoredUser.mockReturnValue({ role: "MANAGER" })
    })

    it("renders History toggle for each policy", async () => {
      render(wrapper(<PoliciesPage />))
      await waitFor(() => {
        expect(screen.getAllByText("History").length).toBeGreaterThan(0)
      })
    })

    it("loads history when History toggle is clicked", async () => {
      const user = userEvent.setup()
      render(wrapper(<PoliciesPage />))
      await waitFor(() => screen.getAllByText("History"))
      await user.click(screen.getAllByText("History")[0])
      await waitFor(() => {
        expect(mockGetPoliciesHistory).toHaveBeenCalled()
      })
    })
  })
})
