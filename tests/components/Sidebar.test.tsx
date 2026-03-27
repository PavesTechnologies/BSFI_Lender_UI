/**
 * Phase 6 — Task 6.8: components/layout/Sidebar.tsx
 * Tests role-aware navigation rendering and the pending-count badge.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { UserRole } from "@/types"

// ---------------------------------------------------------------------------
// Mock next/navigation — Sidebar uses usePathname
// ---------------------------------------------------------------------------
const mockPathname = vi.fn(() => "/")

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}))

// ---------------------------------------------------------------------------
// Mock next/link — renders as plain <a> so we can query by role/text
// ---------------------------------------------------------------------------
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

import { Sidebar } from "@/components/layout/Sidebar"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderSidebar(role: UserRole, pendingCount = 0) {
  return render(<Sidebar userRole={role} pendingCount={pendingCount} />)
}

// ---------------------------------------------------------------------------
// Nav items visible to all roles
// ---------------------------------------------------------------------------
const COMMON_NAV_ITEMS = ["Dashboard", "Review Queue", "Applications", "Disbursements", "Reports"]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Sidebar — common nav items", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/")
  })

  for (const role of ["OFFICER", "MANAGER", "ADMIN"] as UserRole[]) {
    it(`renders all common nav items for ${role}`, () => {
      renderSidebar(role)
      for (const label of COMMON_NAV_ITEMS) {
        expect(screen.getByText(label)).toBeInTheDocument()
      }
    })
  }

  it("renders the portal branding", () => {
    renderSidebar("OFFICER")
    expect(screen.getByText("Lender Portal")).toBeInTheDocument()
    expect(screen.getByText("Bank Officer Dashboard")).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Configuration nav item — role gating
// ---------------------------------------------------------------------------
describe("Sidebar — Configuration nav item (role gating)", () => {
  beforeEach(() => mockPathname.mockReturnValue("/"))

  it("does NOT render Configuration for OFFICER", () => {
    renderSidebar("OFFICER")
    expect(screen.queryByText("Configuration")).not.toBeInTheDocument()
  })

  it("renders Configuration for MANAGER", () => {
    renderSidebar("MANAGER")
    expect(screen.getByText("Configuration")).toBeInTheDocument()
  })

  it("renders Configuration for ADMIN", () => {
    renderSidebar("ADMIN")
    expect(screen.getByText("Configuration")).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Configuration sub-items (visible only when parent path is active)
// ---------------------------------------------------------------------------
describe("Sidebar — Configuration sub-navigation", () => {
  it("shows Interest Rates and Policies sub-items when /config is active for MANAGER", () => {
    mockPathname.mockReturnValue("/config")
    renderSidebar("MANAGER")
    expect(screen.getByText("Interest Rates")).toBeInTheDocument()
    expect(screen.getByText("Policies")).toBeInTheDocument()
  })

  it("shows Reports sub-items when /reports is active", () => {
    mockPathname.mockReturnValue("/reports")
    const { container } = renderSidebar("OFFICER")
    // "Applications" and "Disbursements" appear both as top-level nav AND sub-items;
    // verify sub-items by their specific hrefs.
    expect(container.querySelector('a[href="/reports/applications"]')).toBeInTheDocument()
    expect(container.querySelector('a[href="/reports/disbursements"]')).toBeInTheDocument()
    expect(container.querySelector('a[href="/reports/risk"]')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Pending count badge on Review Queue
// ---------------------------------------------------------------------------
describe("Sidebar — pending count badge", () => {
  beforeEach(() => mockPathname.mockReturnValue("/"))

  it("does NOT show a badge when pendingCount is 0", () => {
    renderSidebar("OFFICER", 0)
    // Badge with a number should not appear next to Review Queue
    const reviewQueueLink = screen.getByText("Review Queue").closest("a")
    expect(reviewQueueLink).not.toHaveTextContent(/^\d+$/)
    // Specifically: no element with just a digit adjacent to the label
    expect(screen.queryByText(/^[1-9]\d*$/)).not.toBeInTheDocument()
  })

  it("shows a badge with the pending count when pendingCount > 0", () => {
    renderSidebar("OFFICER", 5)
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("shows the correct count for large pending numbers", () => {
    renderSidebar("MANAGER", 42)
    expect(screen.getByText("42")).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Active link styling
// ---------------------------------------------------------------------------
describe("Sidebar — active link highlight", () => {
  it("applies active styles to the Dashboard link when on /", () => {
    mockPathname.mockReturnValue("/")
    renderSidebar("OFFICER")
    const dashboardLink = screen.getByText("Dashboard").closest("a")
    expect(dashboardLink?.className).toMatch(/bg-blue-50|text-blue-700/)
  })

  it("applies active styles to Review Queue link when on /review-queue", () => {
    mockPathname.mockReturnValue("/review-queue")
    renderSidebar("OFFICER")
    const link = screen.getByText("Review Queue").closest("a")
    expect(link?.className).toMatch(/bg-blue-50|text-blue-700/)
  })

  it("does NOT apply active styles to Dashboard when on /applications", () => {
    mockPathname.mockReturnValue("/applications")
    renderSidebar("OFFICER")
    const dashboardLink = screen.getByText("Dashboard").closest("a")
    expect(dashboardLink?.className).not.toMatch(/bg-blue-50/)
  })
})

// ---------------------------------------------------------------------------
// Correct hrefs
// ---------------------------------------------------------------------------
describe("Sidebar — link hrefs", () => {
  beforeEach(() => mockPathname.mockReturnValue("/"))

  it("Dashboard link points to /", () => {
    renderSidebar("OFFICER")
    expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute("href", "/")
  })

  it("Review Queue link points to /review-queue", () => {
    renderSidebar("OFFICER")
    expect(screen.getByText("Review Queue").closest("a")).toHaveAttribute("href", "/review-queue")
  })

  it("Applications link points to /applications", () => {
    renderSidebar("OFFICER")
    expect(screen.getByText("Applications").closest("a")).toHaveAttribute("href", "/applications")
  })

  it("Configuration link points to /config for ADMIN", () => {
    renderSidebar("ADMIN")
    expect(screen.getByText("Configuration").closest("a")).toHaveAttribute("href", "/config")
  })
})
