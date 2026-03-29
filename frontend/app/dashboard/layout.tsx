"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  Cpu, 
  LayoutDashboard, 
  FileText, 
  Users, 
  Activity, 
  MessageSquare,
  Settings,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: FileText, label: "RFPs", href: "/dashboard/rfps" },
  { icon: Users, label: "Vendors", href: "/dashboard/vendors" },
  { icon: Activity, label: "Agent Monitor", href: "/dashboard/monitor" },
  { icon: MessageSquare, label: "Discussions", href: "/dashboard/discussions" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [portalType, setPortalType] = useState<"oem" | "vendor">("vendor")
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.replace("/auth")
      return
    }

    const stored = localStorage.getItem("portalType") as "oem" | "vendor" | null
    if (stored) setPortalType(stored)
    setIsAuthorized(true)
  }, [router])

  const handleSignOut = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("session_id")
    localStorage.removeItem("user_id")
    localStorage.removeItem("role")
    router.push("/auth")
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Cpu className="size-8 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse">Initializing Secure Protocol...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={`min-h-screen bg-background flex ${portalType === "oem" ? "theme-oem" : "theme-vendor"}`}>
        {/* Glass Sidebar */}
        <aside className="fixed left-0 top-0 bottom-0 w-16 glass-card m-2 rounded-xl flex flex-col items-center py-4 z-50">
          {/* Logo */}
          <Link href="/" className="mb-8">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center">
              <Cpu className="size-5 text-primary-foreground" />
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/dashboard" && pathname.startsWith(item.href))
              
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative size-10 rounded-xl flex items-center justify-center transition-all",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute inset-0 bg-primary rounded-xl"
                          transition={{ type: "spring", duration: 0.5 }}
                        />
                      )}
                      <item.icon className="size-5 relative z-10" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="glass-card">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </nav>

          {/* Bottom actions */}
          <div className="flex flex-col gap-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard/settings"
                  className="size-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <Settings className="size-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="glass-card">
                Settings
              </TooltipContent>
            </Tooltip>
            
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSignOut}
                  className="size-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="glass-card">
                Sign Out
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-20 p-6">
          {children}
        </main>
      </div>
    </TooltipProvider>
  )
}
