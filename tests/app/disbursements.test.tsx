/**
 * Phase 8 — Task 8.3 & 8.4: /disbursements list + /disbursements/[id] detail
 * Tests table rendering, receipt card, loan summary, and amortisation schedule.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/disbursements",
  useParams: () => ({ id: "app-disb-001" }),
}))

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

const mockGetApplications = vi.fn()
const mockGetApplicationDetail = vi.fn()

vi.mock("@/lib/api", () => ({
  getApplications: (...args: unknown[]) => mockGetApplications(...args),
  getApplicationDetail: (...args: unknown[]) => mockGetApplicationDetail(...args),
}))

import DisbursementsPage from "@/app/(dashboard)/disbursements/page"
import DisbursementDetailPage from "@/app/(dashboard)/disbursements/[id]/page"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_DISBURSED_APP = {
  application_id: "app-disb-001",
  applicant_name: "Carol Davis",
  email: "carol@email.com",
  loan_type: "Auto",
  requested_amount: 35000,
  application_status: "disbursed",
  ai_decision: "APPROVE",
  risk_tier: "A",
  risk_score: 0.92,
  human_review_status: "APPROVED",
  created_at: "2026-01-10T00:00:00Z",
}

const MOCK_DETAIL_WITH_DISBURSEMENT = {
  application: {
    application_id: "app-disb-001",
    loan_type: "Auto",
    credit_type: "AUTO",
    loan_purpose: "VEHICLE_PURCHASE",
    requested_amount: 35000,
    requested_term_months: 48,
    preferred_payment_day: 15,
    origination_channel: "WEB",
    application_status: "disbursed",
    created_at: "2026-01-10T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
  },
  applicant: {
    applicant_id: "appl-002",
    application_id: "app-disb-001",
    first_name: "Carol",
    middle_name: null,
    last_name: "Davis",
    suffix: null,
    date_of_birth: "1990-09-25",
    applicant_role: "primary",
    email: "carol@email.com",
    ssn_last4: "9012",
    phone_number: "555-0300",
    gender: "F",
    citizenship_status: "US_CITIZEN",
    addresses: [],
    employment: null,
    incomes: [],
    assets: [],
    liabilities: [],
  },
  documents: [],
  kyc: null,
  underwriting: {
    id: "uw-002",
    decision: "APPROVE" as const,
    risk_tier: "A",
    risk_score: 0.92,
    approved_amount: 35000,
    disbursement_amount: 35000,
    interest_rate: 6.0,
    tenure_months: 48,
    explanation: "Excellent profile",
    decline_reason: null,
    reasoning_steps: [],
    counter_offer_options: null,
    created_at: "2026-01-10T02:00:00Z",
  },
  disbursement: {
    id: "disb-001",
    transaction_id: "TXN-ABC-123",
    status: "COMPLETED",
    disbursement_amount: 35000,
    monthly_emi: 822.89,
    total_interest: 4498.72,
    total_repayment: 39498.72,
    transfer_timestamp: "2026-01-15T10:00:00Z",
    repayment_schedule: null,
    created_at: "2026-01-15T09:00:00Z",
  },
  human_review: null,
}

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ---------------------------------------------------------------------------
// Disbursements List Tests
// ---------------------------------------------------------------------------
describe("DisbursementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the Disbursements heading", () => {
    mockGetApplications.mockReturnValue(new Promise(() => {}))
    render(wrapper(<DisbursementsPage />))
    expect(screen.getByText("Disbursements")).toBeInTheDocument()
  })

  it("renders applicant name as link", async () => {
    mockGetApplications.mockResolvedValue({ total: 1, page: 1, page_size: 20, items: [MOCK_DISBURSED_APP] })
    render(wrapper(<DisbursementsPage />))
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Carol Davis" })).toBeInTheDocument()
    })
  })

  it("renders loan type", async () => {
    mockGetApplications.mockResolvedValue({ total: 1, page: 1, page_size: 20, items: [MOCK_DISBURSED_APP] })
    render(wrapper(<DisbursementsPage />))
    await waitFor(() => {
      expect(screen.getByText("Auto")).toBeInTheDocument()
    })
  })

  it("renders requested amount", async () => {
    mockGetApplications.mockResolvedValue({ total: 1, page: 1, page_size: 20, items: [MOCK_DISBURSED_APP] })
    render(wrapper(<DisbursementsPage />))
    await waitFor(() => {
      expect(screen.getByText("$35,000")).toBeInTheDocument()
    })
  })

  it("renders application ID in the row", async () => {
    mockGetApplications.mockResolvedValue({ total: 1, page: 1, page_size: 20, items: [MOCK_DISBURSED_APP] })
    render(wrapper(<DisbursementsPage />))
    await waitFor(() => {
      expect(screen.getByText("app-disb-001")).toBeInTheDocument()
    })
  })

  it("renders risk tier badge", async () => {
    mockGetApplications.mockResolvedValue({ total: 1, page: 1, page_size: 20, items: [MOCK_DISBURSED_APP] })
    render(wrapper(<DisbursementsPage />))
    await waitFor(() => {
      expect(screen.getByText("A")).toBeInTheDocument()
    })
  })

  it("renders a View link for each row", async () => {
    mockGetApplications.mockResolvedValue({ total: 1, page: 1, page_size: 20, items: [MOCK_DISBURSED_APP] })
    render(wrapper(<DisbursementsPage />))
    await waitFor(() => {
      const viewLink = screen.getByRole("link", { name: "View" })
      expect(viewLink).toHaveAttribute("href", "/disbursements/app-disb-001")
    })
  })

  it("shows empty state when no disbursements found", async () => {
    mockGetApplications.mockResolvedValue({ total: 0, page: 1, page_size: 20, items: [] })
    render(wrapper(<DisbursementsPage />))
    await waitFor(() => {
      expect(screen.getByText(/no disbursements found/i)).toBeInTheDocument()
    })
  })

  it("shows error message on fetch failure", async () => {
    mockGetApplications.mockRejectedValue(new Error("500"))
    render(wrapper(<DisbursementsPage />))
    await waitFor(() => {
      expect(screen.getByText(/failed to load disbursements/i)).toBeInTheDocument()
    })
  })

  it("renders the search input", () => {
    mockGetApplications.mockReturnValue(new Promise(() => {}))
    render(wrapper(<DisbursementsPage />))
    expect(screen.getByPlaceholderText(/search applicant/i)).toBeInTheDocument()
  })

  it("calls getApplications with status=disbursed", async () => {
    mockGetApplications.mockResolvedValue({ total: 0, page: 1, page_size: 20, items: [] })
    render(wrapper(<DisbursementsPage />))
    await waitFor(() => {
      expect(mockGetApplications).toHaveBeenCalledWith(expect.objectContaining({ status: "disbursed" }))
    })
  })
})

// ---------------------------------------------------------------------------
// Disbursement Detail Tests
// ---------------------------------------------------------------------------
describe("DisbursementDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApplicationDetail.mockResolvedValue(MOCK_DETAIL_WITH_DISBURSEMENT)
  })

  it("renders the applicant name in header", async () => {
    render(wrapper(<DisbursementDetailPage />))
    await waitFor(() => {
      expect(screen.getAllByText(/Carol Davis/).length).toBeGreaterThan(0)
    })
  })

  it("renders back link to /disbursements", () => {
    mockGetApplicationDetail.mockReturnValue(new Promise(() => {}))
    render(wrapper(<DisbursementDetailPage />))
    expect(screen.getByRole("link", { name: /back to disbursements/i })).toHaveAttribute("href", "/disbursements")
  })

  it("shows the transaction ID", async () => {
    render(wrapper(<DisbursementDetailPage />))
    await waitFor(() => {
      expect(screen.getByText("TXN-ABC-123")).toBeInTheDocument()
    })
  })

  it("shows COMPLETED status", async () => {
    render(wrapper(<DisbursementDetailPage />))
    await waitFor(() => {
      expect(screen.getByText("COMPLETED")).toBeInTheDocument()
    })
  })

  it("shows disbursement amount in loan summary", async () => {
    render(wrapper(<DisbursementDetailPage />))
    await waitFor(() => {
      expect(screen.getAllByText("$35,000").length).toBeGreaterThan(0)
    })
  })

  it("shows monthly EMI", async () => {
    render(wrapper(<DisbursementDetailPage />))
    await waitFor(() => {
      expect(screen.getByText("$823")).toBeInTheDocument()
    })
  })

  it("shows total interest amount", async () => {
    render(wrapper(<DisbursementDetailPage />))
    await waitFor(() => {
      expect(screen.getByText("$4,499")).toBeInTheDocument()
    })
  })

  it("renders amortisation schedule heading", async () => {
    render(wrapper(<DisbursementDetailPage />))
    await waitFor(() => {
      expect(screen.getByText(/Amortisation Schedule/i)).toBeInTheDocument()
    })
  })

  it("renders amortisation schedule rows", async () => {
    render(wrapper(<DisbursementDetailPage />))
    await waitFor(() => {
      // First installment row
      expect(screen.getByText("1")).toBeInTheDocument()
    })
  })

  it("shows print/export button", async () => {
    render(wrapper(<DisbursementDetailPage />))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /print/i })).toBeInTheDocument()
    })
  })

  it("shows no disbursement message when disbursement is null", async () => {
    mockGetApplicationDetail.mockResolvedValue({ ...MOCK_DETAIL_WITH_DISBURSEMENT, disbursement: null })
    render(wrapper(<DisbursementDetailPage />))
    await waitFor(() => {
      expect(screen.getByText(/no disbursement record found/i)).toBeInTheDocument()
    })
  })

  it("shows error on fetch failure", async () => {
    mockGetApplicationDetail.mockRejectedValue(new Error("404"))
    render(wrapper(<DisbursementDetailPage />))
    await waitFor(() => {
      expect(screen.getByText(/failed to load disbursement/i)).toBeInTheDocument()
    })
  })
})
