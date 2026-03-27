/**
 * Phase 8 — Task 8.1 & 8.2: /applications list + /applications/[id] detail page
 * Tests table rendering, filters, applicant profile, timeline, human review panel.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/applications",
  useParams: () => ({ id: "app-001" }),
}))

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

const mockGetApplications = vi.fn()
const mockGetApplicationDetail = vi.fn()
const mockGetApplicationTimeline = vi.fn()

vi.mock("@/lib/api", () => ({
  getApplications: (...args: unknown[]) => mockGetApplications(...args),
  getApplicationDetail: (...args: unknown[]) => mockGetApplicationDetail(...args),
  getApplicationTimeline: (...args: unknown[]) => mockGetApplicationTimeline(...args),
}))

import ApplicationsPage from "@/app/(dashboard)/applications/page"
import ApplicationDetailPage from "@/app/(dashboard)/applications/[id]/page"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_APP_SUMMARY = {
  application_id: "app-001",
  applicant_name: "Bob Johnson",
  email: "bob@email.com",
  loan_type: "Mortgage",
  requested_amount: 250000,
  application_status: "approved",
  ai_decision: "APPROVE",
  risk_tier: "B",
  risk_score: 0.72,
  human_review_status: "APPROVED",
  created_at: new Date().toISOString(),
}

const MOCK_APP_DETAIL = {
  application: {
    application_id: "app-001",
    loan_type: "Mortgage",
    credit_type: "MORTGAGE",
    loan_purpose: "HOME_PURCHASE",
    requested_amount: 250000,
    requested_term_months: 360,
    preferred_payment_day: 1,
    origination_channel: "BRANCH",
    application_status: "approved",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-05T00:00:00Z",
  },
  applicant: {
    applicant_id: "appl-001",
    application_id: "app-001",
    first_name: "Bob",
    middle_name: null,
    last_name: "Johnson",
    suffix: null,
    date_of_birth: "1975-03-20",
    applicant_role: "primary",
    email: "bob@email.com",
    ssn_last4: "5678",
    phone_number: "555-0200",
    gender: "M",
    citizenship_status: "US_CITIZEN",
    addresses: [{
      address_id: "addr-001",
      address_type: "current",
      address_line1: "456 Oak Ave",
      address_line2: "Apt 3B",
      city: "Chicago",
      state: "IL",
      zip_code: "60601",
      country: "US",
      housing_status: "OWN",
      monthly_housing_payment: 0,
      years_at_address: 10,
      months_at_address: 0,
    }],
    employment: {
      employment_id: "emp-001",
      employment_type: "FULL_TIME",
      employment_status: "EMPLOYED",
      employer_name: "Big Corp",
      job_title: "Manager",
      start_date: "2010-01-01",
      experience: "16 years",
      self_employed_flag: false,
      gross_monthly_income: 12000,
    },
    incomes: [{ income_id: "inc-001", income_type: "EMPLOYMENT", description: null, monthly_amount: 12000, income_frequency: "MONTHLY" }],
    assets: [{ asset_id: "ast-001", asset_type: "SAVINGS", institution_name: "Bank", value: 80000, ownership_type: "JOINT" }],
    liabilities: [],
  },
  documents: [],
  kyc: {
    kyc_case_id: "kyc-001",
    applicant_id: "appl-001",
    status: "PASSED" as const,
    confidence_score: 0.99,
    rules_version: "v2",
    created_at: "2026-01-01T01:00:00Z",
    completed_at: "2026-01-01T01:05:00Z",
    risk_decision: "PASS",
    identity_check: { id: "id-001", final_status: "PASS", aggregated_score: 99, hard_fail_triggered: false, ssn_valid: true, name_ssn_match: true, dob_ssn_match: true, deceased_flag: false },
    aml_check: { id: "aml-001", ofac_match: false, ofac_confidence: 0.01, pep_match: false, aml_score: 0.01, flags: [] },
  },
  underwriting: {
    id: "uw-001",
    decision: "APPROVE" as const,
    risk_tier: "B",
    risk_score: 0.72,
    approved_amount: 250000,
    disbursement_amount: 250000,
    interest_rate: 5.5,
    tenure_months: 360,
    explanation: "Strong profile",
    decline_reason: null,
    reasoning_steps: ["Score above floor", "DTI within limits"],
    counter_offer_options: null,
    created_at: "2026-01-01T02:00:00Z",
  },
  disbursement: null,
  human_review: {
    queue_id: "q-001",
    status: "APPROVED",
    assigned_to: "Jane Officer",
    ai_decision: "APPROVE",
    ai_risk_tier: "B",
    ai_risk_score: 0.72,
    ai_suggested_amount: 250000,
    ai_suggested_rate: 5.5,
    ai_suggested_tenure: 360,
    ai_counter_options: null,
    ai_reasoning: null,
    ai_decline_reason: null,
    created_at: "2026-01-01T03:00:00Z",
    assigned_at: "2026-01-01T03:30:00Z",
    decided_at: "2026-01-01T04:00:00Z",
    latest_decision: {
      id: "dec-001",
      decision: "APPROVED",
      override_amount: null,
      override_rate: null,
      override_tenure: null,
      selected_offer_id: null,
      notes: "Standard approval",
      reviewed_by: "Jane Officer",
      created_at: "2026-01-01T04:00:00Z",
    },
  },
}

const MOCK_TIMELINE = [
  { timestamp: "2026-01-01T00:00:00Z", event: "APPLICATION_SUBMITTED", stage: "INTAKE", status: "complete", message: "Loan application submitted" },
  { timestamp: "2026-01-01T01:00:00Z", event: "KYC_STARTED", stage: "KYC", status: "complete", message: "KYC started" },
  { timestamp: "2026-01-01T02:00:00Z", event: "AI_RECOMMENDED_APPROVE", stage: "UNDERWRITING", status: "complete", message: "AI recommended approval" },
  { timestamp: "2026-01-01T04:00:00Z", event: "HUMAN_REVIEW_APPROVED", stage: "HUMAN_REVIEW", status: "complete", message: "Bank officer approved" },
]

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ---------------------------------------------------------------------------
// Applications List Tests
// ---------------------------------------------------------------------------
describe("ApplicationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the Applications heading", () => {
    mockGetApplications.mockReturnValue(new Promise(() => {}))
    render(wrapper(<ApplicationsPage />))
    expect(screen.getByText("Applications")).toBeInTheDocument()
  })

  it("renders loading skeletons while fetching", () => {
    mockGetApplications.mockReturnValue(new Promise(() => {}))
    render(wrapper(<ApplicationsPage />))
    expect(screen.getByText("Applicant")).toBeInTheDocument()
  })

  it("renders applicant name as link", async () => {
    mockGetApplications.mockResolvedValue({ total: 1, page: 1, page_size: 20, items: [MOCK_APP_SUMMARY] })
    render(wrapper(<ApplicationsPage />))
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Bob Johnson" })).toBeInTheDocument()
    })
  })

  it("renders application status badge", async () => {
    mockGetApplications.mockResolvedValue({ total: 1, page: 1, page_size: 20, items: [MOCK_APP_SUMMARY] })
    render(wrapper(<ApplicationsPage />))
    await waitFor(() => {
      expect(screen.getByText("approved")).toBeInTheDocument()
    })
  })

  it("renders AI decision badge", async () => {
    mockGetApplications.mockResolvedValue({ total: 1, page: 1, page_size: 20, items: [MOCK_APP_SUMMARY] })
    render(wrapper(<ApplicationsPage />))
    await waitFor(() => {
      expect(screen.getByText("APPROVE")).toBeInTheDocument()
    })
  })

  it("renders risk tier badge", async () => {
    mockGetApplications.mockResolvedValue({ total: 1, page: 1, page_size: 20, items: [MOCK_APP_SUMMARY] })
    render(wrapper(<ApplicationsPage />))
    await waitFor(() => {
      expect(screen.getByText("B")).toBeInTheDocument()
    })
  })

  it("renders human review status", async () => {
    mockGetApplications.mockResolvedValue({ total: 1, page: 1, page_size: 20, items: [MOCK_APP_SUMMARY] })
    render(wrapper(<ApplicationsPage />))
    await waitFor(() => {
      expect(screen.getByText("APPROVED")).toBeInTheDocument()
    })
  })

  it("shows empty state for zero results", async () => {
    mockGetApplications.mockResolvedValue({ total: 0, page: 1, page_size: 20, items: [] })
    render(wrapper(<ApplicationsPage />))
    await waitFor(() => {
      expect(screen.getByText(/no applications found/i)).toBeInTheDocument()
    })
  })

  it("shows error message on fetch failure", async () => {
    mockGetApplications.mockRejectedValue(new Error("500"))
    render(wrapper(<ApplicationsPage />))
    await waitFor(() => {
      expect(screen.getByText(/failed to load applications/i)).toBeInTheDocument()
    })
  })

  it("renders search input", () => {
    mockGetApplications.mockReturnValue(new Promise(() => {}))
    render(wrapper(<ApplicationsPage />))
    expect(screen.getByPlaceholderText(/search applicant/i)).toBeInTheDocument()
  })

  it("renders status filter dropdown", () => {
    mockGetApplications.mockReturnValue(new Promise(() => {}))
    render(wrapper(<ApplicationsPage />))
    expect(screen.getByText("All statuses")).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Application Detail Tests
// ---------------------------------------------------------------------------
describe("ApplicationDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApplicationDetail.mockResolvedValue(MOCK_APP_DETAIL)
    mockGetApplicationTimeline.mockResolvedValue(MOCK_TIMELINE)
  })

  it("renders the applicant name in header after load", async () => {
    render(wrapper(<ApplicationDetailPage />))
    await waitFor(() => {
      expect(screen.getAllByText(/Bob Johnson/).length).toBeGreaterThan(0)
    })
  })

  it("renders back link to /applications", () => {
    mockGetApplicationDetail.mockReturnValue(new Promise(() => {}))
    render(wrapper(<ApplicationDetailPage />))
    expect(screen.getByRole("link", { name: /back to applications/i })).toHaveAttribute("href", "/applications")
  })

  it("shows masked SSN in applicant profile", async () => {
    render(wrapper(<ApplicationDetailPage />))
    await waitFor(() => {
      expect(screen.getByText(/\*\*\*\*5678/)).toBeInTheDocument()
    })
  })

  it("shows employer name", async () => {
    render(wrapper(<ApplicationDetailPage />))
    await waitFor(() => {
      expect(screen.getByText("Big Corp")).toBeInTheDocument()
    })
  })

  it("shows KYC PASSED status", async () => {
    render(wrapper(<ApplicationDetailPage />))
    await waitFor(() => {
      expect(screen.getByText("PASSED")).toBeInTheDocument()
    })
  })

  it("shows AI Approve recommendation", async () => {
    render(wrapper(<ApplicationDetailPage />))
    await waitFor(() => {
      expect(screen.getByText("Approve")).toBeInTheDocument()
    })
  })

  it("shows human review decision APPROVED", async () => {
    render(wrapper(<ApplicationDetailPage />))
    await waitFor(() => {
      expect(screen.getAllByText("APPROVED").length).toBeGreaterThan(0)
    })
  })

  it("shows reviewer name in decision panel", async () => {
    render(wrapper(<ApplicationDetailPage />))
    await waitFor(() => {
      expect(screen.getAllByText("Jane Officer").length).toBeGreaterThan(0)
    })
  })

  it("renders officer notes in decision panel", async () => {
    render(wrapper(<ApplicationDetailPage />))
    await waitFor(() => {
      expect(screen.getByText("Standard approval")).toBeInTheDocument()
    })
  })

  it("renders the timeline section heading", async () => {
    render(wrapper(<ApplicationDetailPage />))
    await waitFor(() => {
      expect(screen.getByText(/Application Timeline/i)).toBeInTheDocument()
    })
  })

  it("renders timeline events", async () => {
    render(wrapper(<ApplicationDetailPage />))
    await waitFor(() => {
      expect(screen.getByText("Loan application submitted")).toBeInTheDocument()
      expect(screen.getByText("Bank officer approved")).toBeInTheDocument()
    })
  })

  it("shows error on fetch failure", async () => {
    mockGetApplicationDetail.mockRejectedValue(new Error("404"))
    render(wrapper(<ApplicationDetailPage />))
    await waitFor(() => {
      expect(screen.getByText(/failed to load application/i)).toBeInTheDocument()
    })
  })
})
