"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopNav } from "@/components/layout/TopNav"
import { Providers } from "@/components/providers"
import { getStoredUser, isTokenExpired, getAccessToken } from "@/lib/auth"
import type { UserRole } from "@/types"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>("OFFICER")

  useEffect(() => {
    const token = getAccessToken()
    if (!token || isTokenExpired(token)) {
      router.replace("/login")
      return
    }
    const user = getStoredUser()
    if (user) setUserRole(user.role)
    setMounted(true)
  }, [router])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <Providers>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole={userRole} />
        <div className="flex flex-1 flex-col pl-64">
          <TopNav title="Lender Portal" />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </Providers>
  )
}
