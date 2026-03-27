import type { AuthTokens, LenderUser, UserRole } from "@/types"

const ACCESS_KEY = "lender_access_token"
const REFRESH_KEY = "lender_refresh_token"
const USER_KEY = "lender_user"

export function saveTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") return
  localStorage.setItem(ACCESS_KEY, tokens.access_token)
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
  localStorage.setItem(USER_KEY, JSON.stringify(tokens.user))
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(REFRESH_KEY)
}

export function getStoredUser(): LenderUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LenderUser
  } catch {
    return null
  }
}

export function clearTokens(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

export function decodeToken(token: string): { sub: string; role: UserRole; email: string; exp: number } {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Invalid JWT format")
  const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
  return payload
}

export function isTokenExpired(token: string): boolean {
  try {
    const { exp } = decodeToken(token)
    return Date.now() / 1000 >= exp
  } catch {
    return true
  }
}

export function getUserRole(): UserRole | null {
  const user = getStoredUser()
  return user?.role ?? null
}

export function isAtLeast(role: UserRole, required: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = { OFFICER: 1, MANAGER: 2, ADMIN: 3 }
  return hierarchy[role] >= hierarchy[required]
}
