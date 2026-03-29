"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Award,
  Shield,
  Zap,
  Target,
  DollarSign,
  Clock,
  Users,
  Building2,
  FileText,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts"

// Our company data
const ourCompany = {
  name: "ProcureAI",
  techScore: 96,
  deliverySpeed: 92,
  compliance: 94,
  pricing: 85,
  support: 91,
  innovation: 98,
  winRate: 68,
  avgDealSize: "$12.4M",
  marketShare: 22,
}

interface Competitor {
  id: string
  name: string
  logo: string
  marketShare: number
  marketShareTrend: "up" | "down" | "stable"
  winRateVsUs: number
  avgDealSize: string
  strengths: string[]
  weaknesses: string[]
  ourAdvantages: string[]
  threatLevel: "high" | "medium" | "low"
  primarySectors: string[]
  pricing: "premium" | "competitive" | "budget"
  techScore: number
  deliverySpeed: number
  compliance: number
  pricingScore: number
  support: number
  innovation: number
  recentRFPs: {
    name: string
    topic: string
    result: "won" | "lost" | "pending"
    margin: number
  }[]
}

const mockCompetitors: Competitor[] = [
  {
    id: "comp-001",
    name: "Apex Defense Systems",
    logo: "AD",
    marketShare: 28,
    marketShareTrend: "up",
    winRateVsUs: 35,
    avgDealSize: "$14.2M",
    strengths: ["Government relations", "Compliance expertise", "Large capacity"],
    weaknesses: ["Slow delivery", "Higher pricing", "Legacy tech stack"],
    ourAdvantages: ["45% faster delivery", "AI-powered automation", "23% better pricing"],
    threatLevel: "high",
    primarySectors: ["Defense", "Aerospace", "Federal"],
    pricing: "premium",
    techScore: 72,
    deliverySpeed: 58,
    compliance: 91,
    pricingScore: 65,
    support: 78,
    innovation: 52,
    recentRFPs: [
      { name: "DoD Cloud Migration", topic: "Cloud Infrastructure", result: "won", margin: 6 },
      { name: "Navy Fleet Systems", topic: "Defense Systems", result: "lost", margin: -3 },
      { name: "Air Force Analytics", topic: "Data Analytics", result: "pending", margin: 8 },
    ],
  },
  {
    id: "comp-002",
    name: "TechNova Solutions",
    logo: "TN",
    marketShare: 18,
    marketShareTrend: "up",
    winRateVsUs: 42,
    avgDealSize: "$8.5M",
    strengths: ["Innovation leader", "Fast delivery", "AI capabilities"],
    weaknesses: ["Limited compliance certs", "Smaller team", "New to sector"],
    ourAdvantages: ["Broader compliance coverage", "Enterprise scale", "Deeper integrations"],
    threatLevel: "high",
    primarySectors: ["Technology", "Healthcare", "Finance"],
    pricing: "competitive",
    techScore: 94,
    deliverySpeed: 88,
    compliance: 68,
    pricingScore: 82,
    support: 75,
    innovation: 91,
    recentRFPs: [
      { name: "Healthcare Data Platform", topic: "Healthcare IT", result: "lost", margin: -9 },
      { name: "FinTech Modernization", topic: "Finance Systems", result: "won", margin: 4 },
      { name: "Retail Analytics Suite", topic: "Data Analytics", result: "won", margin: 7 },
    ],
  },
  {
    id: "comp-003",
    name: "GlobalProcure Inc",
    logo: "GP",
    marketShare: 15,
    marketShareTrend: "stable",
    winRateVsUs: 28,
    avgDealSize: "$11.8M",
    strengths: ["Global presence", "Multi-language", "24/7 support"],
    weaknesses: ["Fragmented processes", "Cultural barriers", "Time zone issues"],
    ourAdvantages: ["Unified platform", "AI translation", "Faster response times"],
    threatLevel: "medium",
    primarySectors: ["Manufacturing", "Logistics", "Retail"],
    pricing: "competitive",
    techScore: 78,
    deliverySpeed: 72,
    compliance: 82,
    pricingScore: 78,
    support: 85,
    innovation: 64,
    recentRFPs: [
      { name: "Global Supply Chain", topic: "Supply Chain", result: "pending", margin: 3 },
      { name: "Manufacturing MES", topic: "Manufacturing", result: "won", margin: 11 },
      { name: "Logistics Optimization", topic: "Supply Chain", result: "won", margin: 5 },
    ],
  },
  {
    id: "comp-004",
    name: "ValueFirst Partners",
    logo: "VF",
    marketShare: 12,
    marketShareTrend: "down",
    winRateVsUs: 18,
    avgDealSize: "$6.2M",
    strengths: ["Low pricing", "Quick turnaround", "Flexible terms"],
    weaknesses: ["Quality concerns", "Limited capacity", "High turnover"],
    ourAdvantages: ["Superior quality", "Enterprise reliability", "Long-term value"],
    threatLevel: "low",
    primarySectors: ["SMB", "Startups", "Non-profit"],
    pricing: "budget",
    techScore: 58,
    deliverySpeed: 82,
    compliance: 55,
    pricingScore: 95,
    support: 62,
    innovation: 48,
    recentRFPs: [
      { name: "Startup Accelerator", topic: "SMB Solutions", result: "lost", margin: -2 },
      { name: "Non-profit CRM", topic: "CRM Systems", result: "won", margin: 15 },
      { name: "Small Biz Portal", topic: "SMB Solutions", result: "won", margin: 12 },
    ],
  },
  {
    id: "comp-005",
    name: "SecureSource Ltd",
    logo: "SS",
    marketShare: 10,
    marketShareTrend: "stable",
    winRateVsUs: 32,
    avgDealSize: "$9.4M",
    strengths: ["Security focus", "Compliance heavy", "Audit trail"],
    weaknesses: ["Slow innovation", "Rigid processes", "Premium only"],
    ourAdvantages: ["Modern security + agility", "Flexible deployment", "Better UX"],
    threatLevel: "medium",
    primarySectors: ["Finance", "Healthcare", "Government"],
    pricing: "premium",
    techScore: 70,
    deliverySpeed: 62,
    compliance: 96,
    pricingScore: 58,
    support: 80,
    innovation: 45,
    recentRFPs: [
      { name: "Bank Security Upgrade", topic: "Finance Systems", result: "lost", margin: -4 },
      { name: "Hospital Records", topic: "Healthcare IT", result: "won", margin: 6 },
      { name: "Gov Audit System", topic: "Government", result: "pending", margin: 2 },
    ],
  },
]

const rfpTopics = ["All Topics", "Cloud Infrastructure", "Data Analytics", "Healthcare IT", "Finance Systems", "Supply Chain", "Defense Systems", "Manufacturing", "CRM Systems"]

export default function CompetitorsPage() {
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([])
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [topicFilter, setTopicFilter] = useState("All Topics")

  const toggleCompetitorSelection = (id: string) => {
    setSelectedCompetitors((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const toggleExpanded = (id: string) => {
    setExpandedCompetitor((prev) => (prev === id ? null : id))
  }

  const filteredCompetitors = mockCompetitors.filter((comp) => {
    const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTopic = topicFilter === "All Topics" || comp.recentRFPs.some((rfp) => rfp.topic === topicFilter)
    return matchesSearch && matchesTopic
  })

  const selectedCompetitorData = mockCompetitors.filter((c) => selectedCompetitors.includes(c.id))

  // Radar chart data for comparison
  const radarData = useMemo(() => {
    const metrics = ["Technology", "Delivery", "Compliance", "Pricing", "Support", "Innovation"]
    return metrics.map((metric) => {
      const dataPoint: Record<string, string | number> = { metric }
      dataPoint["ProcureAI (Us)"] = {
        Technology: ourCompany.techScore,
        Delivery: ourCompany.deliverySpeed,
        Compliance: ourCompany.compliance,
        Pricing: ourCompany.pricing,
        Support: ourCompany.support,
        Innovation: ourCompany.innovation,
      }[metric] || 0

      selectedCompetitorData.forEach((comp) => {
        dataPoint[comp.name] = {
          Technology: comp.techScore,
          Delivery: comp.deliverySpeed,
          Compliance: comp.compliance,
          Pricing: comp.pricingScore,
          Support: comp.support,
          Innovation: comp.innovation,
        }[metric] || 0
      })
      return dataPoint
    })
  }, [selectedCompetitorData])

  // Bar chart data for win rates
  const winRateData = useMemo(() => {
    return [
      { name: "ProcureAI", winRate: ourCompany.winRate, fill: "hsl(var(--neon-cyan))" },
      ...selectedCompetitorData.map((comp) => ({
        name: comp.name,
        winRate: comp.winRateVsUs,
        fill: comp.threatLevel === "high" ? "hsl(var(--neon-red))" : comp.threatLevel === "medium" ? "hsl(var(--neon-amber))" : "hsl(var(--muted-foreground))",
      })),
    ]
  }, [selectedCompetitorData])

  const getThreatColor = (level: string) => {
    switch (level) {
      case "high": return "text-neon-red border-neon-red/30 bg-neon-red/10"
      case "medium": return "text-neon-amber border-neon-amber/30 bg-neon-amber/10"
      case "low": return "text-neon-green border-neon-green/30 bg-neon-green/10"
      default: return "text-muted-foreground"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="size-4 text-neon-green" />
      case "down": return <TrendingDown className="size-4 text-neon-red" />
      default: return <Minus className="size-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitor Analysis</h1>
          <p className="text-muted-foreground">
            RFP-related competitive intelligence and our market advantages
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedCompetitors.length > 0 && (
            <Badge variant="outline" className="text-neon-cyan border-neon-cyan/30">
              {selectedCompetitors.length} selected for comparison
            </Badge>
          )}
          <Button className="gap-2" disabled={selectedCompetitors.length === 0}>
            <BarChart3 className="size-4" />
            Generate Comparison Report
          </Button>
        </div>
      </div>

      {/* Our Advantages Summary */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-neon-cyan/10">
            <Award className="size-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-semibold">Our Competitive Advantages</h2>
            <p className="text-sm text-muted-foreground">Key differentiators vs market competition</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: "AI Automation", value: "+98%", icon: Zap, desc: "vs industry avg" },
            { label: "Win Rate", value: "68%", icon: Target, desc: "head-to-head" },
            { label: "Delivery Speed", value: "45%", icon: Clock, desc: "faster than avg" },
            { label: "Tech Score", value: "96/100", icon: Shield, desc: "analyst rating" },
            { label: "Cost Savings", value: "23%", icon: DollarSign, desc: "avg for clients" },
            { label: "NPS Score", value: "+72", icon: Star, desc: "customer loyalty" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-lg bg-glass">
              <stat.icon className="size-5 text-neon-cyan mx-auto mb-2" />
              <p className="text-lg font-bold text-neon-cyan">{stat.value}</p>
              <p className="text-xs font-medium">{stat.label}</p>
              <p className="text-xs text-muted-foreground">{stat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search competitors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass-button"
          />
        </div>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-56 glass-button">
            <FileText className="size-4 mr-2" />
            <SelectValue placeholder="Filter by RFP Topic" />
          </SelectTrigger>
          <SelectContent>
            {rfpTopics.map((topic) => (
              <SelectItem key={topic} value={topic}>{topic}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCompetitors.length > 0 && (
          <Button variant="outline" className="glass-button" onClick={() => setSelectedCompetitors([])}>
            Clear Selection
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Vertical Competitor List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredCompetitors.map((competitor, index) => {
              const isSelected = selectedCompetitors.includes(competitor.id)
              const isExpanded = expandedCompetitor === competitor.id

              return (
                <motion.div
                  key={competitor.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card overflow-hidden transition-all ${
                    isSelected ? "border-neon-cyan ring-1 ring-neon-cyan/20" : ""
                  }`}
                >
                  {/* Main Row */}
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Selection Checkbox */}
                      <button
                        onClick={() => toggleCompetitorSelection(competitor.id)}
                        className="mt-1 shrink-0"
                      >
                        {isSelected ? (
                          <CheckCircle2 className="size-6 text-neon-cyan" />
                        ) : (
                          <Circle className="size-6 text-muted-foreground hover:text-foreground transition-colors" />
                        )}
                      </button>

                      {/* Logo */}
                      <div className="size-14 rounded-xl bg-glass flex items-center justify-center text-lg font-bold text-primary shrink-0">
                        {competitor.logo}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">{competitor.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getThreatColor(competitor.threatLevel)}>
                                {competitor.threatLevel.toUpperCase()} THREAT
                              </Badge>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                {getTrendIcon(competitor.marketShareTrend)}
                                <span>{competitor.marketShare}% market</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Win Rate vs Us</p>
                            <p className={`text-xl font-bold ${competitor.winRateVsUs > 50 ? "text-neon-red" : "text-neon-green"}`}>
                              {competitor.winRateVsUs}%
                            </p>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Tech Score</p>
                            <div className="flex items-center gap-2">
                              <Progress value={competitor.techScore} className="flex-1 h-2" />
                              <span className="text-xs font-medium">{competitor.techScore}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Delivery</p>
                            <div className="flex items-center gap-2">
                              <Progress value={competitor.deliverySpeed} className="flex-1 h-2" />
                              <span className="text-xs font-medium">{competitor.deliverySpeed}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Compliance</p>
                            <div className="flex items-center gap-2">
                              <Progress value={competitor.compliance} className="flex-1 h-2" />
                              <span className="text-xs font-medium">{competitor.compliance}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Deal</p>
                            <p className="text-sm font-semibold">{competitor.avgDealSize}</p>
                          </div>
                        </div>

                        {/* Our Advantages */}
                        <div className="mt-4 p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
                          <p className="text-xs font-medium text-neon-cyan mb-2">Our Advantages Over {competitor.name}</p>
                          <div className="flex flex-wrap gap-2">
                            {competitor.ourAdvantages.map((adv, i) => (
                              <span key={i} className="text-xs px-2 py-1 rounded bg-neon-cyan/10 text-neon-cyan">
                                {adv}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Sectors */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex flex-wrap gap-1.5">
                            {competitor.primarySectors.map((sector) => (
                              <span
                                key={sector}
                                className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                              >
                                {sector}
                              </span>
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(competitor.id)}
                            className="gap-1"
                          >
                            {isExpanded ? "Less" : "More"}
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-glass-border overflow-hidden"
                      >
                        <div className="p-5 space-y-5">
                          {/* Strengths & Weaknesses */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-2">Their Strengths</h4>
                              <ul className="space-y-1.5">
                                {competitor.strengths.map((s, i) => (
                                  <li key={i} className="flex items-center gap-2 text-sm">
                                    <div className="size-1.5 rounded-full bg-neon-amber" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-2">Their Weaknesses</h4>
                              <ul className="space-y-1.5">
                                {competitor.weaknesses.map((w, i) => (
                                  <li key={i} className="flex items-center gap-2 text-sm">
                                    <div className="size-1.5 rounded-full bg-neon-green" />
                                    {w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Recent RFP Matchups Table */}
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent RFP Matchups</h4>
                            <div className="rounded-lg border border-glass-border overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-glass">
                                    <th className="text-left p-3 font-medium">RFP Name</th>
                                    <th className="text-left p-3 font-medium">Topic</th>
                                    <th className="text-center p-3 font-medium">Result</th>
                                    <th className="text-right p-3 font-medium">Score Margin</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {competitor.recentRFPs.map((rfp, i) => (
                                    <tr key={i} className="border-t border-glass-border">
                                      <td className="p-3">{rfp.name}</td>
                                      <td className="p-3 text-muted-foreground">{rfp.topic}</td>
                                      <td className="p-3 text-center">
                                        <Badge
                                          variant="outline"
                                          className={
                                            rfp.result === "won"
                                              ? "bg-neon-green/10 text-neon-green border-neon-green/30"
                                              : rfp.result === "lost"
                                              ? "bg-neon-red/10 text-neon-red border-neon-red/30"
                                              : "bg-neon-amber/10 text-neon-amber border-neon-amber/30"
                                          }
                                        >
                                          {rfp.result.toUpperCase()}
                                        </Badge>
                                      </td>
                                      <td className={`p-3 text-right font-medium ${rfp.margin > 0 ? "text-neon-green" : rfp.margin < 0 ? "text-neon-red" : "text-muted-foreground"}`}>
                                        {rfp.margin > 0 ? "+" : ""}{rfp.margin} pts
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Analytics Sidebar */}
        <div className="space-y-4">
          {/* Comparison Charts - Only show when competitors selected */}
          {selectedCompetitors.length > 0 ? (
            <>
              {/* Radar Comparison */}
              <div className="glass-card p-5">
                <h3 className="font-semibold mb-4">Capability Comparison</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <Radar
                        name="ProcureAI (Us)"
                        dataKey="ProcureAI (Us)"
                        stroke="hsl(var(--neon-cyan))"
                        fill="hsl(var(--neon-cyan))"
                        fillOpacity={0.3}
                      />
                      {selectedCompetitorData.map((comp, i) => (
                        <Radar
                          key={comp.id}
                          name={comp.name}
                          dataKey={comp.name}
                          stroke={comp.threatLevel === "high" ? "hsl(var(--neon-red))" : comp.threatLevel === "medium" ? "hsl(var(--neon-amber))" : "hsl(var(--muted-foreground))"}
                          fill={comp.threatLevel === "high" ? "hsl(var(--neon-red))" : comp.threatLevel === "medium" ? "hsl(var(--neon-amber))" : "hsl(var(--muted-foreground))"}
                          fillOpacity={0.15}
                        />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Win Rate Bar Chart */}
              <div className="glass-card p-5">
                <h3 className="font-semibold mb-4">Win Rate Comparison</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={winRateData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="winRate" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Textual Summary */}
              <div className="glass-card p-5">
                <h3 className="font-semibold mb-3">Analysis Summary</h3>
                <div className="space-y-3 text-sm">
                  {selectedCompetitorData.map((comp) => (
                    <div key={comp.id} className="p-3 rounded-lg bg-glass">
                      <p className="font-medium mb-1">{comp.name}</p>
                      <p className="text-muted-foreground">
                        {comp.winRateVsUs > 50 
                          ? `Strong competitor. Focus on ${comp.weaknesses[0]?.toLowerCase()} to gain edge.`
                          : `We lead by ${ourCompany.winRate - comp.winRateVsUs}pts. Maintain advantage in ${comp.ourAdvantages[0]?.toLowerCase()}.`
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="glass-card p-8 text-center">
              <CheckCircle2 className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Select Competitors to Compare</h3>
              <p className="text-sm text-muted-foreground">
                Click the circle icon next to competitors to add them to your comparison analysis.
              </p>
            </div>
          )}

          {/* Market Position Summary */}
          <div className="glass-card p-5">
            <h3 className="font-semibold mb-4">Market Position</h3>
            <div className="space-y-3">
              {[
                { name: "ProcureAI (Us)", share: ourCompany.marketShare, color: "bg-neon-cyan" },
                ...mockCompetitors.slice(0, 4).map((c) => ({
                  name: c.name,
                  share: c.marketShare,
                  color: c.threatLevel === "high" ? "bg-neon-red" : c.threatLevel === "medium" ? "bg-neon-amber" : "bg-muted-foreground",
                })),
              ].sort((a, b) => b.share - a.share).map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className={`size-2 rounded-full ${item.color}`} />
                  <span className="text-sm flex-1 truncate">{item.name}</span>
                  <span className="text-sm font-medium">{item.share}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
