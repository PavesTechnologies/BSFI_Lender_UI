import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function getTokenFromRequest(request: NextRequest): string | null {
  // Tokens are stored in localStorage (client-side only), so middleware
  // checks for a cookie set by the client as a fallback signal.
  // Primary auth check happens client-side via useAuth hook.
  // Middleware provides a lightweight redirect for unauthenticated users.
  return request.cookies.get("lender_auth_signal")?.value ?? null
}

function getRoleFromCookie(request: NextRequest): string | null {
  return request.cookies.get("lender_role")?.value ?? null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAuthSignal = getTokenFromRequest(request)

  // Allow login page through
  if (pathname.startsWith("/login")) {
    if (hasAuthSignal) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // Protect all other routes
  if (!hasAuthSignal) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role guard: /config/* requires MANAGER or ADMIN
  if (pathname.startsWith("/config")) {
    const role = getRoleFromCookie(request)
    if (role === "OFFICER") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
