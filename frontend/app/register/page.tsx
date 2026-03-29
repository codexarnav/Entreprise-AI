"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Cpu, Building2, Users, ArrowRight, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FloatingRobot } from "@/components/floating-robot"
import Link from "next/link"

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialType = searchParams.get("type") as "oem" | "client" | null
  
  const [portalType, setPortalType] = useState<"oem" | "client">(initialType || "client")
  const [showPassword, setShowPassword] = useState(false)
  const [showAppPassword, setShowAppPassword] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    gmail_id: "",
    app_password: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setIsTyping(true)
  }

  useEffect(() => {
    const timeout = setTimeout(() => setIsTyping(false), 500)
    return () => clearTimeout(timeout)
  }, [formData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Store portal type for dashboard theming
    localStorage.setItem("portalType", portalType)
    router.push("/dashboard")
  }

  const primaryColor = portalType === "oem" ? "neon-red" : "primary"

  return (
    <div className={`min-h-screen bg-background flex ${portalType === "oem" ? "theme-oem" : "theme-client"}`}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-primary/10"
              style={{
                width: Math.random() * 100 + 50,
                height: Math.random() * 100 + 50,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 h-full">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className={`size-12 rounded-xl bg-${primaryColor} flex items-center justify-center`}>
                <Cpu className="size-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">ProcureAI</span>
            </div>

            <h1 className="text-4xl font-bold mb-6 leading-tight">
              {portalType === "oem" ? (
                <>
                  <span className="text-neon-red text-glow">OEM Partner</span>
                  <br />
                  Registration
                </>
              ) : (
                <>
                  <span className="text-primary text-glow">Enterprise</span>
                  <br />
                  Registration
                </>
              )}
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
              {portalType === "oem" 
                ? "Full access to vendor catalog, autonomous negotiations, and procurement analytics."
                : "Monitor procurement progress, analyze RFPs, and track vendor performance."}
            </p>

            <div className="mt-12 space-y-4">
              {[
                portalType === "oem" ? "Vendor Catalog Access" : "Progress Monitoring",
                portalType === "oem" ? "Negotiation Control" : "RFP Analysis View",
                portalType === "oem" ? "Full Analytics Suite" : "Performance Reports",
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={`size-2 rounded-full bg-${primaryColor}`} />
                  <span className="text-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 overflow-y-auto py-8">
        <div className="max-w-md mx-auto w-full">
          {/* Portal Type Toggle */}
          <div className="flex gap-2 mb-8 p-1 glass-card rounded-xl">
            <button
              onClick={() => setPortalType("client")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                portalType === "client" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="size-4" />
              <span className="text-sm font-medium">Client</span>
            </button>
            <button
              onClick={() => setPortalType("oem")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                portalType === "oem" 
                  ? "bg-neon-red text-white" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="size-4" />
              <span className="text-sm font-medium">OEM</span>
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold">Create Account</h2>
              <p className="text-muted-foreground mt-1">
                Set up your procurement intelligence account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="glass-button"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="glass-button pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gmail_id">Gmail ID</Label>
                <Input
                  id="gmail_id"
                  name="gmail_id"
                  type="email"
                  placeholder="user@gmail.com"
                  value={formData.gmail_id}
                  onChange={handleInputChange}
                  className="glass-button"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="app_password">Gmail App Password</Label>
                <div className="relative">
                  <Input
                    id="app_password"
                    name="app_password"
                    type={showAppPassword ? "text" : "password"}
                    placeholder="Enter app password"
                    value={formData.app_password}
                    onChange={handleInputChange}
                    className="glass-button pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAppPassword(!showAppPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showAppPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className={`w-full gap-2 mt-4 ${portalType === "oem" ? "bg-neon-red hover:bg-neon-red/90" : ""}`}
                size="lg"
              >
                Create Account
                <ArrowRight className="size-4" />
              </Button>
            </form>

            <div className="text-center mt-6">
              <Link
                href="/auth"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Robot */}
      <FloatingRobot isTyping={isTyping} variant={portalType} />
    </div>
  )
}
