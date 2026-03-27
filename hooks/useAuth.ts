"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { clearTokens, getStoredUser, getAccessToken, isTokenExpired } from "@/lib/auth"
import { getMe } from "@/lib/api"
import type { LenderUser } from "@/types"

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<LenderUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    if (!token || isTokenExpired(token)) {
      setLoading(false)
      return
    }
    const stored = getStoredUser()
    if (stored) {
      setUser(stored)
      setLoading(false)
    } else {
      getMe()
        .then(setUser)
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    document.cookie = "lender_auth_signal=; max-age=0; path=/"
    document.cookie = "lender_role=; max-age=0; path=/"
    router.push("/login")
  }, [router])

  return { user, loading, logout }
}
