/**
 * Phase 6 — Task 6.5: lib/auth.ts
 * Tests token storage, retrieval, decoding, expiry, and role helpers.
 */
import { describe, it, expect, beforeEach } from "vitest"
import {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  clearTokens,
  decodeToken,
  isTokenExpired,
  getUserRole,
  isAtLeast,
} from "@/lib/auth"
import type { AuthTokens } from "@/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeToken(payload: object): string {
  // Build a minimal, unsigned JWT (header.payload.sig)
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  return `eyJhbGciOiJIUzI1NiJ9.${encoded}.fakesig`
}

const MOCK_TOKENS: AuthTokens = {
  access_token: "mock_access_token",
  refresh_token: "mock_refresh_token",
  token_type: "bearer",
  user: {
    id: "u-001",
    email: "officer@bank.com",
    full_name: "Test Officer",
    role: "OFFICER",
    is_active: true,
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("lib/auth.ts", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // -------------------------------------------------------------------------
  // saveTokens + individual getters
  // -------------------------------------------------------------------------
  describe("saveTokens", () => {
    it("persists access token in localStorage", () => {
      saveTokens(MOCK_TOKENS)
      expect(localStorage.getItem("lender_access_token")).toBe("mock_access_token")
    })

    it("persists refresh token in localStorage", () => {
      saveTokens(MOCK_TOKENS)
      expect(localStorage.getItem("lender_refresh_token")).toBe("mock_refresh_token")
    })

    it("persists serialised user in localStorage", () => {
      saveTokens(MOCK_TOKENS)
      const raw = localStorage.getItem("lender_user")
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw!)).toEqual(MOCK_TOKENS.user)
    })
  })

  // -------------------------------------------------------------------------
  // getAccessToken
  // -------------------------------------------------------------------------
  describe("getAccessToken", () => {
    it("returns stored access token after saveTokens", () => {
      saveTokens(MOCK_TOKENS)
      expect(getAccessToken()).toBe("mock_access_token")
    })

    it("returns null when nothing is stored", () => {
      expect(getAccessToken()).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // getRefreshToken
  // -------------------------------------------------------------------------
  describe("getRefreshToken", () => {
    it("returns stored refresh token after saveTokens", () => {
      saveTokens(MOCK_TOKENS)
      expect(getRefreshToken()).toBe("mock_refresh_token")
    })

    it("returns null when nothing is stored", () => {
      expect(getRefreshToken()).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // getStoredUser
  // -------------------------------------------------------------------------
  describe("getStoredUser", () => {
    it("returns parsed user object after saveTokens", () => {
      saveTokens(MOCK_TOKENS)
      expect(getStoredUser()).toEqual(MOCK_TOKENS.user)
    })

    it("returns null when nothing is stored", () => {
      expect(getStoredUser()).toBeNull()
    })

    it("returns null when stored value is invalid JSON", () => {
      localStorage.setItem("lender_user", "not-json")
      expect(getStoredUser()).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // clearTokens
  // -------------------------------------------------------------------------
  describe("clearTokens", () => {
    it("removes all three storage keys", () => {
      saveTokens(MOCK_TOKENS)
      clearTokens()
      expect(getAccessToken()).toBeNull()
      expect(getRefreshToken()).toBeNull()
      expect(getStoredUser()).toBeNull()
    })

    it("is idempotent on empty storage", () => {
      expect(() => clearTokens()).not.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // decodeToken
  // -------------------------------------------------------------------------
  describe("decodeToken", () => {
    it("decodes a valid JWT and returns its payload fields", () => {
      const token = makeToken({ sub: "u-001", role: "MANAGER", email: "m@bank.com", exp: 9999999999 })
      const payload = decodeToken(token)
      expect(payload.sub).toBe("u-001")
      expect(payload.role).toBe("MANAGER")
      expect(payload.exp).toBe(9999999999)
    })

    it("throws an error for a malformed JWT (wrong segment count)", () => {
      expect(() => decodeToken("not.a.valid.jwt.with.extra")).toThrow()
    })

    it("throws an error for a completely invalid string", () => {
      expect(() => decodeToken("garbage")).toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // isTokenExpired
  // -------------------------------------------------------------------------
  describe("isTokenExpired", () => {
    it("returns false when exp is in the future", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const token = makeToken({ sub: "u1", role: "OFFICER", exp: futureExp })
      expect(isTokenExpired(token)).toBe(false)
    })

    it("returns true when exp is in the past", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 1
      const token = makeToken({ sub: "u1", role: "OFFICER", exp: pastExp })
      expect(isTokenExpired(token)).toBe(true)
    })

    it("returns true for an invalid / undecodable token", () => {
      expect(isTokenExpired("completely-invalid")).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // getUserRole
  // -------------------------------------------------------------------------
  describe("getUserRole", () => {
    it("returns the user role when a user is stored", () => {
      saveTokens(MOCK_TOKENS)
      expect(getUserRole()).toBe("OFFICER")
    })

    it("returns null when no user is stored", () => {
      expect(getUserRole()).toBeNull()
    })

    it("reflects MANAGER role correctly", () => {
      saveTokens({ ...MOCK_TOKENS, user: { ...MOCK_TOKENS.user, role: "MANAGER" } })
      expect(getUserRole()).toBe("MANAGER")
    })

    it("reflects ADMIN role correctly", () => {
      saveTokens({ ...MOCK_TOKENS, user: { ...MOCK_TOKENS.user, role: "ADMIN" } })
      expect(getUserRole()).toBe("ADMIN")
    })
  })

  // -------------------------------------------------------------------------
  // isAtLeast — role hierarchy: OFFICER(1) < MANAGER(2) < ADMIN(3)
  // -------------------------------------------------------------------------
  describe("isAtLeast", () => {
    it("OFFICER satisfies OFFICER requirement", () => {
      expect(isAtLeast("OFFICER", "OFFICER")).toBe(true)
    })

    it("OFFICER does NOT satisfy MANAGER requirement", () => {
      expect(isAtLeast("OFFICER", "MANAGER")).toBe(false)
    })

    it("OFFICER does NOT satisfy ADMIN requirement", () => {
      expect(isAtLeast("OFFICER", "ADMIN")).toBe(false)
    })

    it("MANAGER satisfies OFFICER requirement", () => {
      expect(isAtLeast("MANAGER", "OFFICER")).toBe(true)
    })

    it("MANAGER satisfies MANAGER requirement", () => {
      expect(isAtLeast("MANAGER", "MANAGER")).toBe(true)
    })

    it("MANAGER does NOT satisfy ADMIN requirement", () => {
      expect(isAtLeast("MANAGER", "ADMIN")).toBe(false)
    })

    it("ADMIN satisfies all role requirements", () => {
      expect(isAtLeast("ADMIN", "OFFICER")).toBe(true)
      expect(isAtLeast("ADMIN", "MANAGER")).toBe(true)
      expect(isAtLeast("ADMIN", "ADMIN")).toBe(true)
    })
  })
})
