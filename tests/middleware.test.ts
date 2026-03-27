/**
 * Phase 6 — Task 6.7: middleware.ts
 * Tests route-protection and role-based redirect logic.
 *
 * Strategy: construct real NextRequest objects using the cookie header so the
 * middleware's cookie-parsing code runs as written in production.
 */
import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { middleware, config as middlewareConfig } from "@/middleware"

// ---------------------------------------------------------------------------
// Helper — builds a NextRequest with optional cookies
// ---------------------------------------------------------------------------
function makeRequest(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ")

  return new NextRequest(`http://localhost${pathname}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  })
}

// ---------------------------------------------------------------------------
// Helper — extracts the redirect location from a response
// ---------------------------------------------------------------------------
function getRedirectPathname(res: Response): string {
  const location = res.headers.get("location")
  if (!location) throw new Error("No location header on redirect response")
  return new URL(location).pathname
}

function getRedirectParam(res: Response, param: string): string | null {
  const location = res.headers.get("location")
  if (!location) return null
  return new URL(location).searchParams.get(param)
}

// ---------------------------------------------------------------------------
// Unauthenticated users (no lender_auth_signal cookie)
// ---------------------------------------------------------------------------
describe("unauthenticated user", () => {
  it("redirects / to /login", () => {
    const res = middleware(makeRequest("/"))
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(getRedirectPathname(res)).toBe("/login")
  })

  it("redirects /review-queue to /login", () => {
    const res = middleware(makeRequest("/review-queue"))
    expect(getRedirectPathname(res)).toBe("/login")
  })

  it("redirects /applications to /login", () => {
    const res = middleware(makeRequest("/applications"))
    expect(getRedirectPathname(res)).toBe("/login")
  })

  it("redirects /disbursements to /login", () => {
    const res = middleware(makeRequest("/disbursements"))
    expect(getRedirectPathname(res)).toBe("/login")
  })

  it("redirects /config to /login", () => {
    const res = middleware(makeRequest("/config"))
    expect(getRedirectPathname(res)).toBe("/login")
  })

  it("includes the original path as the 'from' query param", () => {
    const res = middleware(makeRequest("/review-queue"))
    expect(getRedirectParam(res, "from")).toBe("/review-queue")
  })

  it("allows the /login page through without redirect", () => {
    const res = middleware(makeRequest("/login"))
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Authenticated users (lender_auth_signal cookie present)
// ---------------------------------------------------------------------------
describe("authenticated OFFICER", () => {
  const cookies = { lender_auth_signal: "1", lender_role: "OFFICER" }

  it("redirects away from /login back to /", () => {
    const res = middleware(makeRequest("/login", cookies))
    expect(getRedirectPathname(res)).toBe("/")
  })

  it("allows / through", () => {
    const res = middleware(makeRequest("/", cookies))
    expect(res.status).toBe(200)
  })

  it("allows /review-queue through", () => {
    const res = middleware(makeRequest("/review-queue", cookies))
    expect(res.status).toBe(200)
  })

  it("allows /applications through", () => {
    const res = middleware(makeRequest("/applications", cookies))
    expect(res.status).toBe(200)
  })

  it("allows /disbursements through", () => {
    const res = middleware(makeRequest("/disbursements", cookies))
    expect(res.status).toBe(200)
  })

  it("allows /reports through", () => {
    const res = middleware(makeRequest("/reports", cookies))
    expect(res.status).toBe(200)
  })

  it("blocks /config and redirects to /", () => {
    const res = middleware(makeRequest("/config", cookies))
    expect(getRedirectPathname(res)).toBe("/")
  })

  it("blocks /config/interest-rates and redirects to /", () => {
    const res = middleware(makeRequest("/config/interest-rates", cookies))
    expect(getRedirectPathname(res)).toBe("/")
  })

  it("blocks /config/policies and redirects to /", () => {
    const res = middleware(makeRequest("/config/policies", cookies))
    expect(getRedirectPathname(res)).toBe("/")
  })
})

describe("authenticated MANAGER", () => {
  const cookies = { lender_auth_signal: "1", lender_role: "MANAGER" }

  it("allows /config through", () => {
    const res = middleware(makeRequest("/config", cookies))
    expect(res.status).toBe(200)
  })

  it("allows /config/interest-rates through", () => {
    const res = middleware(makeRequest("/config/interest-rates", cookies))
    expect(res.status).toBe(200)
  })

  it("allows /config/policies through", () => {
    const res = middleware(makeRequest("/config/policies", cookies))
    expect(res.status).toBe(200)
  })

  it("redirects away from /login back to /", () => {
    const res = middleware(makeRequest("/login", cookies))
    expect(getRedirectPathname(res)).toBe("/")
  })
})

describe("authenticated ADMIN", () => {
  const cookies = { lender_auth_signal: "1", lender_role: "ADMIN" }

  it("allows /config through", () => {
    const res = middleware(makeRequest("/config", cookies))
    expect(res.status).toBe(200)
  })

  it("allows /config/interest-rates through", () => {
    const res = middleware(makeRequest("/config/interest-rates", cookies))
    expect(res.status).toBe(200)
  })

  it("allows all non-config routes through", () => {
    for (const path of ["/", "/review-queue", "/applications", "/disbursements", "/reports"]) {
      const res = middleware(makeRequest(path, cookies))
      expect(res.status).toBe(200)
    }
  })
})

// ---------------------------------------------------------------------------
// middleware config — static assets / Next internals must be excluded
// ---------------------------------------------------------------------------
describe("middleware matcher config", () => {
  it("exports a matcher array", () => {
    expect(Array.isArray(middlewareConfig.matcher)).toBe(true)
    expect(middlewareConfig.matcher.length).toBeGreaterThan(0)
  })

  it("matcher pattern excludes _next/static and _next/image paths", () => {
    const [pattern] = middlewareConfig.matcher
    // The negative-lookahead in the pattern should prevent matching Next internals.
    // Verify the pattern string references these exclusions.
    expect(pattern).toContain("_next/static")
    expect(pattern).toContain("_next/image")
  })

  it("matcher pattern excludes favicon.ico", () => {
    const [pattern] = middlewareConfig.matcher
    expect(pattern).toContain("favicon.ico")
  })
})
