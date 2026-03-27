/**
 * Phase 7 — Task 7.3: AIRecommendationPanel component
 * Tests color-coded header, comparison table, risk meter, counter offer cards,
 * decline reason display, and reasoning accordion.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { AIRecommendationPanel } from "@/components/review-queue/AIRecommendationPanel"
import type { UnderwritingResultDetail } from "@/types"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const APPROVE_UW: UnderwritingResultDetail = {
  id: "uw-001",
  decision: "APPROVE",
  risk_tier: "A",
  risk_score: 0.87,
  approved_amount: 50000,
  disbursement_amount: 50000,
  interest_rate: 7.5,
  tenure_months: 60,
  explanation: "Strong profile",
  decline_reason: null,
  reasoning_steps: ["Credit score exceeds threshold", "DTI within limits", "Employment verified"],
  counter_offer_options: null,
  created_at: "2026-01-01T00:00:00Z",
}

const COUNTER_UW: UnderwritingResultDetail = {
  id: "uw-002",
  decision: "COUNTER_OFFER",
  risk_tier: "B",
  risk_score: 0.55,
  approved_amount: null,
  disbursement_amount: null,
  interest_rate: null,
  tenure_months: null,
  explanation: null,
  decline_reason: null,
  reasoning_steps: ["Moderate risk profile"],
  counter_offer_options: [
    { offer_id: "OPT_1", principal_amount: 30000, tenure_months: 36, interest_rate: 9.5, monthly_emi: 956, label: "Conservative" },
    { offer_id: "OPT_2", principal_amount: 40000, tenure_months: 48, interest_rate: 10.5, monthly_emi: 1032, label: "Standard" },
  ],
  created_at: "2026-01-01T00:00:00Z",
}

const DECLINE_UW: UnderwritingResultDetail = {
  id: "uw-003",
  decision: "DECLINE",
  risk_tier: "F",
  risk_score: 0.12,
  approved_amount: null,
  disbursement_amount: null,
  interest_rate: null,
  tenure_months: null,
  explanation: null,
  decline_reason: "Credit score below minimum threshold and high DTI ratio",
  reasoning_steps: ["Score below floor", "DTI exceeds 50%"],
  counter_offer_options: null,
  created_at: "2026-01-01T00:00:00Z",
}

// ---------------------------------------------------------------------------
// Tests — APPROVE
// ---------------------------------------------------------------------------
describe("AIRecommendationPanel — APPROVE", () => {
  it("renders the Approve label in the header", () => {
    render(<AIRecommendationPanel underwriting={APPROVE_UW} />)
    expect(screen.getByText("Approve")).toBeInTheDocument()
  })

  it("renders the risk tier badge", () => {
    render(<AIRecommendationPanel underwriting={APPROVE_UW} />)
    expect(screen.getByText("A")).toBeInTheDocument()
  })

  it("renders the risk score meter label", () => {
    render(<AIRecommendationPanel underwriting={APPROVE_UW} />)
    expect(screen.getByText("Risk Score")).toBeInTheDocument()
  })

  it("shows the approved amount", () => {
    render(<AIRecommendationPanel underwriting={APPROVE_UW} />)
    expect(screen.getByText("$50,000")).toBeInTheDocument()
  })

  it("shows comparison table when requestedAmount is provided", () => {
    render(<AIRecommendationPanel underwriting={APPROVE_UW} requestedAmount={60000} />)
    expect(screen.getByText("Requested")).toBeInTheDocument()
    expect(screen.getByText("AI Suggests")).toBeInTheDocument()
  })

  it("does not render counter offer cards", () => {
    render(<AIRecommendationPanel underwriting={APPROVE_UW} />)
    expect(screen.queryByText("Conservative")).not.toBeInTheDocument()
  })

  it("does not render decline reason", () => {
    render(<AIRecommendationPanel underwriting={APPROVE_UW} />)
    expect(screen.queryByText(/credit score below/i)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Tests — COUNTER_OFFER
// ---------------------------------------------------------------------------
describe("AIRecommendationPanel — COUNTER_OFFER", () => {
  it("renders the Counter Offer label", () => {
    render(<AIRecommendationPanel underwriting={COUNTER_UW} />)
    expect(screen.getByText("Counter Offer")).toBeInTheDocument()
  })

  it("renders all counter offer option cards", () => {
    render(<AIRecommendationPanel underwriting={COUNTER_UW} />)
    expect(screen.getByText("Conservative")).toBeInTheDocument()
    expect(screen.getByText("Standard")).toBeInTheDocument()
  })

  it("shows principal amount for each offer", () => {
    render(<AIRecommendationPanel underwriting={COUNTER_UW} />)
    expect(screen.getByText("$30,000")).toBeInTheDocument()
    expect(screen.getByText("$40,000")).toBeInTheDocument()
  })

  it("shows monthly EMI for each offer", () => {
    render(<AIRecommendationPanel underwriting={COUNTER_UW} />)
    expect(screen.getByText("$956")).toBeInTheDocument()
    expect(screen.getByText("$1,032")).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Tests — DECLINE
// ---------------------------------------------------------------------------
describe("AIRecommendationPanel — DECLINE", () => {
  it("renders the Decline label", () => {
    render(<AIRecommendationPanel underwriting={DECLINE_UW} />)
    expect(screen.getByText("Decline")).toBeInTheDocument()
  })

  it("shows the decline reason", () => {
    render(<AIRecommendationPanel underwriting={DECLINE_UW} />)
    expect(screen.getByText(/credit score below minimum threshold/i)).toBeInTheDocument()
  })

  it("does not render counter offer cards", () => {
    render(<AIRecommendationPanel underwriting={DECLINE_UW} />)
    expect(screen.queryByText("Conservative")).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Tests — Reasoning accordion
// ---------------------------------------------------------------------------
describe("AIRecommendationPanel — reasoning accordion", () => {
  it("shows reasoning step count in toggle button", () => {
    render(<AIRecommendationPanel underwriting={APPROVE_UW} />)
    expect(screen.getByText(/AI Reasoning \(3 steps\)/i)).toBeInTheDocument()
  })

  it("reasoning steps are hidden by default", () => {
    render(<AIRecommendationPanel underwriting={APPROVE_UW} />)
    expect(screen.queryByText("Credit score exceeds threshold")).not.toBeInTheDocument()
  })

  it("expands reasoning steps on click", () => {
    render(<AIRecommendationPanel underwriting={APPROVE_UW} />)
    fireEvent.click(screen.getByText(/AI Reasoning/i))
    expect(screen.getByText("Credit score exceeds threshold")).toBeInTheDocument()
    expect(screen.getByText("DTI within limits")).toBeInTheDocument()
    expect(screen.getByText("Employment verified")).toBeInTheDocument()
  })

  it("collapses reasoning steps on second click", () => {
    render(<AIRecommendationPanel underwriting={APPROVE_UW} />)
    const btn = screen.getByText(/AI Reasoning/i)
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByText("Credit score exceeds threshold")).not.toBeInTheDocument()
  })

  it("does not show accordion when reasoning_steps is empty", () => {
    const noReasoning = { ...APPROVE_UW, reasoning_steps: [] }
    render(<AIRecommendationPanel underwriting={noReasoning} />)
    expect(screen.queryByText(/AI Reasoning/i)).not.toBeInTheDocument()
  })
})
