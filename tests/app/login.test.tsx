/**
 * Phase 6 — Task 6.9: app/(auth)/login/page.tsx
 * Tests form rendering, validation, successful login flow, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

const mockApiLogin = vi.fn()
vi.mock("@/lib/api", () => ({
  login: (...args: unknown[]) => mockApiLogin(...args),
}))

const mockSaveTokens = vi.fn()
vi.mock("@/lib/auth", () => ({
  saveTokens: (...args: unknown[]) => mockSaveTokens(...args),
}))

import LoginPage from "@/app/(auth)/login/page"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_USER = {
  id: "u-001",
  email: "officer@bank.com",
  full_name: "Test Officer",
  role: "OFFICER" as const,
  is_active: true,
}

const MOCK_TOKENS = {
  access_token: "access_tok",
  refresh_token: "refresh_tok",
  token_type: "bearer",
  user: MOCK_USER,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any cookies jsdom may have from previous tests
    document.cookie = "lender_auth_signal=; max-age=0; path=/"
    document.cookie = "lender_role=; max-age=0; path=/"
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    it("renders the email input", () => {
      render(<LoginPage />)
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it("renders the password input", () => {
      render(<LoginPage />)
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it("renders the Sign in button", () => {
      render(<LoginPage />)
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    })

    it("renders the portal branding", () => {
      render(<LoginPage />)
      expect(screen.getByText("Lender Portal")).toBeInTheDocument()
    })

    it("does not show an error message initially", () => {
      render(<LoginPage />)
      expect(
        screen.queryByText(/invalid email or password/i)
      ).not.toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  describe("form validation", () => {
    it("does not call the API when email is invalid and shows a validation error", async () => {
      // NOTE: jsdom's native <input type="email"> constraint validation blocks the submit event
      // when the value is not a valid email format. We use fireEvent.submit on the <form>
      // element to bypass this and let react-hook-form's Zod resolver run its own validation.
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "not-an-email")
      await user.type(screen.getByLabelText(/password/i), "somepassword")

      const form = document.querySelector("form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText("Invalid email address")).toBeInTheDocument()
      })
      expect(mockApiLogin).not.toHaveBeenCalled()
    })

    it("shows a password required error when submitting with an empty password", async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "officer@bank.com")
      // Leave password blank; no native browser constraint blocks this (no `required` attr),
      // so react-hook-form / Zod min(1) validation will run.
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText("Password is required")).toBeInTheDocument()
      })
      expect(mockApiLogin).not.toHaveBeenCalled()
    })

    it("does not call the API when both fields are empty", async () => {
      render(<LoginPage />)

      const form = document.querySelector("form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockApiLogin).not.toHaveBeenCalled()
      })
    })
  })

  // -------------------------------------------------------------------------
  // Successful login
  // -------------------------------------------------------------------------
  describe("successful login", () => {
    beforeEach(() => {
      mockApiLogin.mockResolvedValue(MOCK_TOKENS)
    })

    it("calls api.login with the entered credentials", async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "officer@bank.com")
      await user.type(screen.getByLabelText(/password/i), "secret123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalledWith("officer@bank.com", "secret123")
      })
    })

    it("calls saveTokens with the returned tokens", async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "officer@bank.com")
      await user.type(screen.getByLabelText(/password/i), "secret123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(mockSaveTokens).toHaveBeenCalledWith(MOCK_TOKENS)
      })
    })

    it("navigates to / after a successful login", async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "officer@bank.com")
      await user.type(screen.getByLabelText(/password/i), "secret123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/")
      })
    })

    it("sets the lender_auth_signal cookie on success", async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "officer@bank.com")
      await user.type(screen.getByLabelText(/password/i), "secret123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => expect(mockPush).toHaveBeenCalled())
      expect(document.cookie).toContain("lender_auth_signal=1")
    })

    it("sets the lender_role cookie to the user's role on success", async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "officer@bank.com")
      await user.type(screen.getByLabelText(/password/i), "secret123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => expect(mockPush).toHaveBeenCalled())
      expect(document.cookie).toContain("lender_role=OFFICER")
    })

    it("does not show an error message after successful login", async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "officer@bank.com")
      await user.type(screen.getByLabelText(/password/i), "secret123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => expect(mockPush).toHaveBeenCalled())
      expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Failed login
  // -------------------------------------------------------------------------
  describe("failed login", () => {
    beforeEach(() => {
      mockApiLogin.mockRejectedValue(new Error("401 Unauthorized"))
    })

    it("shows the invalid credentials error message", async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "bad@bank.com")
      await user.type(screen.getByLabelText(/password/i), "wrongpassword")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/invalid email or password/i)
        ).toBeInTheDocument()
      })
    })

    it("does not navigate away on failure", async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "bad@bank.com")
      await user.type(screen.getByLabelText(/password/i), "wrongpassword")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })
      expect(mockPush).not.toHaveBeenCalled()
    })

    it("does not call saveTokens on failure", async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "bad@bank.com")
      await user.type(screen.getByLabelText(/password/i), "wrongpassword")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })
      expect(mockSaveTokens).not.toHaveBeenCalled()
    })

    it("re-enables the submit button after a failed attempt", async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "bad@bank.com")
      await user.type(screen.getByLabelText(/password/i), "wrongpassword")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled()
      })
    })
  })

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    it("disables the submit button while the request is in flight", async () => {
      // Never resolves — keeps loading state active
      mockApiLogin.mockReturnValue(new Promise(() => {}))

      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "officer@bank.com")
      await user.type(screen.getByLabelText(/password/i), "secret123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      expect(screen.getByRole("button")).toBeDisabled()
    })

    it("shows a loading indicator while signing in", async () => {
      mockApiLogin.mockReturnValue(new Promise(() => {}))

      const user = userEvent.setup()
      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), "officer@bank.com")
      await user.type(screen.getByLabelText(/password/i), "secret123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      // The button text changes to "Signing in…" during loading
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    })
  })
})
