/**
 * Phase 7 — Task 7.2: /review-queue/[id] detail page
 * Tests three-panel layout, applicant info, KYC display,
 * decision form logic, and EMI calculation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/review-queue/q-001",
  useParams: () => ({ id: "q-001" }),
}))

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

const mockGetReviewQueueItem = vi.fn()
const mockGetApplicationDetail = vi.fn()
const mockAssignToMe = vi.fn()
const mockSubmitDecision = vi.fn()

vi.mock("@/lib/api", () => ({
  getReviewQueueItem: (...args: unknown[]) => mockGetReviewQueueItem(...args),
  getApplicationDetail: (...args: unknown[]) => mockGetApplicationDetail(...args),
  assignToMe: (...args: unknown[]) => mockAssignToMe(...args),
  submitDecision: (...args: unknown[]) => mockSubmitDecision(...args),
}))

// (duplicate mock removed)

import ReviewQueueDetailPage from "@/app/(dashboard)/review-queue/[id]/page"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_QUEUE_ITEM = {
  id: "q-001",
  application_id: "app-001",
  status: "PENDING",
  assigned_to: null,
  assignee_name: null,
  ai_decision: "APPROVE",
  ai_risk_tier: "A",
  ai_risk_score: 0.88,
  ai_suggested_amount: 50000,
  ai_suggested_rate: 7.5,
  ai_suggested_tenure: 60,
  ai_counter_options: null,
  ai_reasoning: ["Credit score above threshold"],
  ai_decline_reason: null,
  applicant_name: "Alice Smith",
  email: "alice@bank.com",
  loan_type: "Personal",
  requested_amount: 50000,
  created_at: "2026-01-01T00:00:00Z",
  assigned_at: null,
  decided_at: null,
}

const MOCK_APP_DETAIL = {
  application: {
    application_id: "app-001",
    loan_type: "Personal",
    credit_type: "CONSUMER",
    loan_purpose: "Debt consolidation",
    requested_amount: 50000,
    requested_term_months: 60,
    preferred_payment_day: 1,
    origination_channel: "WEB",
    application_status: "processing",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: null,
  },
  applicant: {
    applicant_id: "appl-001",
    application_id: "app-001",
    first_name: "Alice",
    middle_name: null,
    last_name: "Smith",
    suffix: null,
    date_of_birth: "1985-06-15",
    applicant_role: "primary",
    email: "alice@bank.com",
    ssn_last4: "1234",
    phone_number: "555-0100",
    gender: "F",
    citizenship_status: "US_CITIZEN",
    addresses: [{
      address_id: "addr-001",
      address_type: "current",
      address_line1: "123 Main St",
      address_line2: null,
      city: "Springfield",
      state: "IL",
      zip_code: "62701",
      country: "US",
      housing_status: "RENT",
      monthly_housing_payment: 1200,
      years_at_address: 3,
      months_at_address: 2,
    }],
    employment: {
      employment_id: "emp-001",
      employment_type: "FULL_TIME",
      employment_status: "EMPLOYED",
      employer_name: "Acme Corp",
      job_title: "Software Engineer",
      start_date: "2018-03-01",
      experience: "8 years",
      self_employed_flag: false,
      gross_monthly_income: 8500,
    },
    incomes: [{ income_id: "inc-001", income_type: "EMPLOYMENT", description: null, monthly_amount: 8500, income_frequency: "MONTHLY" }],
    assets: [{ asset_id: "ast-001", asset_type: "CHECKING", institution_name: "Chase Bank", value: 12000, ownership_type: "SOLE" }],
    liabilities: [{ liability_id: "lia-001", liability_type: "CREDIT_CARD", creditor_name: "Visa", outstanding_balance: 5000, monthly_payment: 200, months_remaining: 24, delinquent_flag: false }],
  },
  documents: [{ document_id: "doc-001", document_type: "PAYSTUB", file_name: "paystub.pdf", mime_type: "application/pdf", file_size: 102400, uploaded_at: "2026-01-01T00:00:00Z", is_low_quality: false }],
  kyc: {
    kyc_case_id: "kyc-001",
    applicant_id: "appl-001",
    status: "PASSED" as const,
    confidence_score: 0.95,
    rules_version: "v2",
    created_at: "2026-01-01T01:00:00Z",
    completed_at: "2026-01-01T01:05:00Z",
    risk_decision: "PASS",
    identity_check: { id: "id-001", final_status: "PASS", aggregated_score: 95, hard_fail_triggered: false, ssn_valid: true, name_ssn_match: true, dob_ssn_match: true, deceased_flag: false },
    aml_check: { id: "aml-001", ofac_match: false, ofac_confidence: 0.01, pep_match: false, aml_score: 0.02, flags: [] },
  },
  underwriting: {
    id: "uw-001",
    decision: "APPROVE" as const,
    risk_tier: "A",
    risk_score: 0.88,
    approved_amount: 50000,
    disbursement_amount: 50000,
    interest_rate: 7.5,
    tenure_months: 60,
    explanation: "Strong profile",
    decline_reason: null,
    reasoning_steps: ["Credit score above threshold", "DTI within limits"],
    counter_offer_options: null,
    created_at: "2026-01-01T02:00:00Z",
  },
  disbursement: null,
  human_review: null,
}

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function renderPage(queueItem = MOCK_QUEUE_ITEM, appDetail = MOCK_APP_DETAIL) {
  mockGetReviewQueueItem.mockResolvedValue(queueItem)
  mockGetApplicationDetail.mockResolvedValue(appDetail)
  render(wrapper(<ReviewQueueDetailPage />))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ReviewQueueDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("page header", () => {
    it("renders the applicant name in the header after load", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getAllByText("Alice Smith").length).toBeGreaterThan(0)
      })
    })

    it("renders a back link to /review-queue", () => {
      mockGetReviewQueueItem.mockReturnValue(new Promise(() => {}))
      render(wrapper(<ReviewQueueDetailPage />))
      expect(screen.getByRole("link", { name: /back to queue/i })).toHaveAttribute("href", "/review-queue")
    })
  })

  describe("applicant profile panel", () => {
    it("shows the applicant full name", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getAllByText("Alice Smith").length).toBeGreaterThan(0)
      })
    })

    it("shows masked SSN", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText(/\*\*\*\*1234/)).toBeInTheDocument()
      })
    })

    it("shows employer name", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText("Acme Corp")).toBeInTheDocument()
      })
    })

    it("shows current address", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText(/123 Main St/)).toBeInTheDocument()
      })
    })

    it("shows gross monthly income", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText("$8,500")).toBeInTheDocument()
      })
    })

    it("shows document list", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText("PAYSTUB")).toBeInTheDocument()
      })
    })
  })

  describe("KYC panel", () => {
    it("shows KYC PASSED status", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText("PASSED")).toBeInTheDocument()
      })
    })

    it("shows KYC confidence score", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText(/95%/)).toBeInTheDocument()
      })
    })

    it("shows identity check result", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getAllByText("PASS").length).toBeGreaterThan(0)
      })
    })

    it("shows AML CLEAR result", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText("CLEAR")).toBeInTheDocument()
      })
    })
  })

  describe("AI underwriting panel", () => {
    it("shows AI Approve recommendation", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getAllByText("Approve").length).toBeGreaterThan(0)
      })
    })
  })

  describe("decision form", () => {
    it("shows three decision radio options", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByLabelText(/^Approve$/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Approve with Override/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/^Reject$/)).toBeInTheDocument()
      })
    })

    it("submit button is disabled when no decision selected", async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Submit Decision/i })).toBeDisabled()
      })
    })

    it("shows AI suggested terms when APPROVE is selected", async () => {
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => screen.getByLabelText(/^Approve$/))
      await user.click(screen.getByLabelText(/^Approve$/))
      await waitFor(() => {
        expect(screen.getByText(/AI Suggested Terms/i)).toBeInTheDocument()
      })
    })

    it("shows override inputs when APPROVE WITH OVERRIDE is selected", async () => {
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => screen.getByLabelText(/Approve with Override/i))
      await user.click(screen.getByLabelText(/Approve with Override/i))
      await waitFor(() => {
        expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Rate/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Tenure/i)).toBeInTheDocument()
      })
    })

    it("shows textarea when REJECT is selected", async () => {
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => screen.getByLabelText(/^Reject$/))
      await user.click(screen.getByLabelText(/^Reject$/))
      await waitFor(() => {
        expect(screen.getByLabelText(/Rejection Reason/i)).toBeInTheDocument()
      })
    })

    it("submit is disabled when reject notes < 20 chars", async () => {
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => screen.getByLabelText(/^Reject$/))
      await user.click(screen.getByLabelText(/^Reject$/))
      await user.type(screen.getByLabelText(/Rejection Reason/i), "Short note")
      expect(screen.getByRole("button", { name: /Submit Decision/i })).toBeDisabled()
    })

    it("submit is enabled when reject notes >= 20 chars", async () => {
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => screen.getByLabelText(/^Reject$/))
      await user.click(screen.getByLabelText(/^Reject$/))
      await user.type(screen.getByLabelText(/Rejection Reason/i), "Insufficient income documentation provided")
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Submit Decision/i })).not.toBeDisabled()
      })
    })

    it("shows confirmation dialog before submitting", async () => {
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => screen.getByLabelText(/^Approve$/))
      await user.click(screen.getByLabelText(/^Approve$/))
      await user.click(screen.getByRole("button", { name: /Submit Decision/i }))
      await waitFor(() => {
        expect(screen.getByText(/are you sure\?/i)).toBeInTheDocument()
      })
    })

    it("calls submitDecision with APPROVED on confirm", async () => {
      mockSubmitDecision.mockResolvedValue(undefined)
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => screen.getByLabelText(/^Approve$/))
      await user.click(screen.getByLabelText(/^Approve$/))
      await user.click(screen.getByRole("button", { name: /Submit Decision/i }))
      await waitFor(() => screen.getByRole("button", { name: /^Confirm$/i }))
      await user.click(screen.getByRole("button", { name: /^Confirm$/i }))
      await waitFor(() => {
        expect(mockSubmitDecision).toHaveBeenCalledWith("q-001", expect.objectContaining({ decision: "APPROVED" }))
      })
    })

    it("can cancel from confirmation dialog", async () => {
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => screen.getByLabelText(/^Approve$/))
      await user.click(screen.getByLabelText(/^Approve$/))
      await user.click(screen.getByRole("button", { name: /Submit Decision/i }))
      await waitFor(() => screen.getByRole("button", { name: /Cancel/i }))
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(screen.queryByText(/are you sure\?/i)).not.toBeInTheDocument()
    })
  })

  describe("already decided items", () => {
    it("shows decided status instead of decision form", async () => {
      const decidedItem = { ...MOCK_QUEUE_ITEM, status: "APPROVED", decided_at: "2026-01-02T00:00:00Z" }
      renderPage(decidedItem)
      await waitFor(() => {
        expect(screen.getByText(/Decision: APPROVED/i)).toBeInTheDocument()
      })
    })
  })
})
