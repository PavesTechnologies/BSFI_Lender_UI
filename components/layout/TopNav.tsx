"use client"

import { useRouter } from "next/navigation"
import { clearTokens, getStoredUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { User, LogOut, ChevronDown } from "lucide-react"

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  MANAGER: "bg-purple-100 text-purple-700",
  OFFICER: "bg-green-100 text-green-700",
}

interface TopNavProps {
  title: string
}

export function TopNav({ title }: TopNavProps) {
  const router = useRouter()
  const user = getStoredUser()

  function handleLogout() {
    clearTokens()
    // Clear auth cookies
    document.cookie = "lender_auth_signal=; max-age=0; path=/"
    document.cookie = "lender_role=; max-age=0; path=/"
    router.push("/login")
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        {user && (
          <Badge className={ROLE_COLORS[user.role] ?? ""} variant="outline">
            {user.role}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm">{user?.full_name ?? "User"}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-gray-500">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
