/**
 * Phase 7 — Task 7.1: /review-queue page
 * Tests rendering, filtering, pagination, empty state, and assign action.
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
  usePathname: () => "/review-queue",
}))

const mockGetReviewQueue = vi.fn()
const mockAssignToMe = vi.fn()

vi.mock("@/lib/api", () => ({
  getReviewQueue: (...args: unknown[]) => mockGetReviewQueue(...args),
  assignToMe: (...args: unknown[]) => mockAssignToMe(...args),
}))

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

import ReviewQueuePage from "@/app/(dashboard)/review-queue/page"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeItem = (overrides = {}) => ({
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
  ai_reasoning: null,
  ai_decline_reason: null,
  applicant_name: "Alice Smith",
  email: "alice@bank.com",
  loan_type: "Personal",
  requested_amount: 50000,
  created_at: new Date().toISOString(),
  assigned_at: null,
  decided_at: null,
  ...overrides,
})

const EMPTY_RESPONSE = { total: 0, pending_count: 0, items: [] }
const ONE_ITEM_RESPONSE = { total: 1, pending_count: 1, items: [makeItem()] }

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ReviewQueuePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("loading state", () => {
    it("renders skeleton rows while data is loading", () => {
      mockGetReviewQueue.mockReturnValue(new Promise(() => {}))
      render(wrapper(<ReviewQueuePage />))
      // The table headers are present
      expect(screen.getByText("Applicant")).toBeInTheDocument()
    })
  })

  describe("empty state", () => {
    it("shows empty state message when queue is clear", async () => {
      mockGetReviewQueue.mockResolvedValue(EMPTY_RESPONSE)
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText(/review queue is clear/i)).toBeInTheDocument()
      })
    })

    it("shows descriptive empty state sub-text", async () => {
      mockGetReviewQueue.mockResolvedValue(EMPTY_RESPONSE)
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText(/no applications require review/i)).toBeInTheDocument()
      })
    })
  })

  describe("data rendering", () => {
    beforeEach(() => {
      mockGetReviewQueue.mockResolvedValue(ONE_ITEM_RESPONSE)
    })

    it("renders the applicant name as a link", async () => {
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByRole("link", { name: "Alice Smith" })).toBeInTheDocument()
      })
    })

    it("renders loan type and amount", async () => {
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText(/Personal.*\$50,000/)).toBeInTheDocument()
      })
    })

    it("renders AI decision badge", async () => {
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText("Approve")).toBeInTheDocument()
      })
    })

    it("renders risk tier pill", async () => {
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText("A")).toBeInTheDocument()
      })
    })

    it("renders PENDING status badge", async () => {
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText("Pending")).toBeInTheDocument()
      })
    })

    it("renders 'Assign to Me' button for pending items", async () => {
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText("Assign to Me")).toBeInTheDocument()
      })
    })

    it("renders the Review action button", async () => {
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument()
      })
    })
  })

  describe("status badge variants", () => {
    it("renders ASSIGNED status for in-review items", async () => {
      mockGetReviewQueue.mockResolvedValue({ ...ONE_ITEM_RESPONSE, items: [makeItem({ status: "ASSIGNED" })] })
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText("In Review")).toBeInTheDocument()
      })
    })

    it("renders APPROVED status badge", async () => {
      mockGetReviewQueue.mockResolvedValue({ ...ONE_ITEM_RESPONSE, items: [makeItem({ status: "APPROVED" })] })
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText("Approved")).toBeInTheDocument()
      })
    })

    it("renders REJECTED status badge", async () => {
      mockGetReviewQueue.mockResolvedValue({ ...ONE_ITEM_RESPONSE, items: [makeItem({ status: "REJECTED" })] })
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText("Rejected")).toBeInTheDocument()
      })
    })
  })

  describe("AI decision badges", () => {
    it("renders Counter Offer badge", async () => {
      mockGetReviewQueue.mockResolvedValue({ ...ONE_ITEM_RESPONSE, items: [makeItem({ ai_decision: "COUNTER_OFFER" })] })
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText("Counter Offer")).toBeInTheDocument()
      })
    })

    it("renders Decline badge", async () => {
      mockGetReviewQueue.mockResolvedValue({ ...ONE_ITEM_RESPONSE, items: [makeItem({ ai_decision: "DECLINE" })] })
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText("Decline")).toBeInTheDocument()
      })
    })
  })

  describe("search filter", () => {
    it("filters items by applicant name", async () => {
      const twoItems = {
        total: 2,
        pending_count: 2,
        items: [makeItem({ applicant_name: "Alice Smith" }), makeItem({ id: "q-002", applicant_name: "Bob Jones" })],
      }
      mockGetReviewQueue.mockResolvedValue(twoItems)
      const user = userEvent.setup()
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => screen.getByText("Alice Smith"))

      const search = screen.getByPlaceholderText(/search applicant/i)
      await user.type(search, "Bob")

      await waitFor(() => {
        expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument()
        expect(screen.getByText("Bob Jones")).toBeInTheDocument()
      })
    })
  })

  describe("error state", () => {
    it("shows an error message when fetch fails", async () => {
      mockGetReviewQueue.mockRejectedValue(new Error("Network error"))
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByText(/failed to load review queue/i)).toBeInTheDocument()
      })
    })
  })

  describe("pagination", () => {
    it("does not show pagination for single-page results", async () => {
      mockGetReviewQueue.mockResolvedValue(ONE_ITEM_RESPONSE)
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => screen.getByText("Alice Smith"))
      expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument()
    })

    it("shows pagination controls for multi-page results", async () => {
      mockGetReviewQueue.mockResolvedValue({ total: 25, pending_count: 25, items: [makeItem()] })
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument()
      })
    })

    it("previous button is disabled on first page", async () => {
      mockGetReviewQueue.mockResolvedValue({ total: 25, pending_count: 25, items: [makeItem()] })
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled()
      })
    })
  })

  describe("assign to me action", () => {
    it("calls assignToMe with the queue item id when clicked", async () => {
      mockGetReviewQueue.mockResolvedValue(ONE_ITEM_RESPONSE)
      mockAssignToMe.mockResolvedValue(undefined)
      const user = userEvent.setup()
      render(wrapper(<ReviewQueuePage />))
      await waitFor(() => screen.getByText("Assign to Me"))
      await user.click(screen.getByText("Assign to Me"))
      await waitFor(() => {
        expect(mockAssignToMe).toHaveBeenCalledWith("q-001")
      })
    })
  })

  describe("page header", () => {
    it("renders the Review Queue heading", async () => {
      mockGetReviewQueue.mockResolvedValue(EMPTY_RESPONSE)
      render(wrapper(<ReviewQueuePage />))
      expect(screen.getByText("Review Queue")).toBeInTheDocument()
    })

    it("renders the description text", () => {
      mockGetReviewQueue.mockResolvedValue(EMPTY_RESPONSE)
      render(wrapper(<ReviewQueuePage />))
      expect(screen.getByText(/applications awaiting/i)).toBeInTheDocument()
    })
  })
})
