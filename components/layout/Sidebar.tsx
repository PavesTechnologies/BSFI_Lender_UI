"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  CreditCard,
  BarChart2,
  Settings,
  ChevronRight,
  Building2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { UserRole } from "@/types"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
  children?: { label: string; href: string }[]
  badgeKey?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Review Queue",
    href: "/review-queue",
    icon: ClipboardList,
    badgeKey: "pending",
  },
  {
    label: "Applications",
    href: "/applications",
    icon: FileText,
  },
  {
    label: "Disbursements",
    href: "/disbursements",
    icon: CreditCard,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart2,
    children: [
      { label: "Applications", href: "/reports/applications" },
      { label: "Disbursements", href: "/reports/disbursements" },
      { label: "Risk", href: "/reports/risk" },
    ],
  },
  {
    label: "Configuration",
    href: "/config",
    icon: Settings,
    roles: ["MANAGER", "ADMIN"],
    children: [
      { label: "Interest Rates", href: "/config/interest-rates" },
      { label: "Policies", href: "/config/policies" },
    ],
  },
]

interface SidebarProps {
  userRole: UserRole
  pendingCount?: number
}

export function Sidebar({ userRole, pendingCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  const canAccess = (item: NavItem) =>
    !item.roles || item.roles.includes(userRole)

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
        <Building2 className="h-7 w-7 text-blue-600" />
        <div>
          <p className="text-sm font-bold text-gray-900">Lender Portal</p>
          <p className="text-xs text-gray-500">Bank Officer Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {NAV_ITEMS.filter(canAccess).map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const expanded = item.children && active

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badgeKey === "pending" && pendingCount > 0 && (
                  <Badge variant="destructive" className="h-5 text-xs">
                    {pendingCount}
                  </Badge>
                )}
                {item.children && (
                  <ChevronRight
                    className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
                  />
                )}
              </Link>
              {expanded &&
                item.children?.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg py-2 pl-10 pr-3 text-sm transition-colors",
                      pathname === child.href
                        ? "text-blue-700 font-medium"
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    {child.label}
                  </Link>
                ))}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
