"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Filter, Grid3X3, List, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RFPCard, type RFPData } from "@/components/rfp-card"
import { DeadlineHeatmap } from "@/components/deadline-heatmap"

const mockRFPs: RFPData[] = [
  {
    id: "rfp-001",
    title: "Advanced Defense Communication Systems - Phase II",
    organization: "Ministry of Defence",
    deadline: "Apr 15, 2026",
    pwinScore: 78,
    riskScore: 35,
    status: "ready",
    value: "$12.5M",
    category: "Defense",
  },
  {
    id: "rfp-002",
    title: "Smart Grid Infrastructure Modernization Project",
    organization: "National Power Grid Corp",
    deadline: "Apr 22, 2026",
    pwinScore: 65,
    riskScore: 55,
    status: "analyzing",
    value: "$8.2M",
    category: "Energy",
  },
  {
    id: "rfp-003",
    title: "Healthcare Data Analytics Platform",
    organization: "Central Health Authority",
    deadline: "May 1, 2026",
    pwinScore: 82,
    riskScore: 28,
    status: "new",
    value: "$4.8M",
    category: "Healthcare",
  },
  {
    id: "rfp-004",
    title: "Railway Signaling System Upgrade",
    organization: "National Railways",
    deadline: "Apr 30, 2026",
    pwinScore: 71,
    riskScore: 42,
    status: "in-progress",
    value: "$15.3M",
    category: "Infrastructure",
  },
  {
    id: "rfp-005",
    title: "Cybersecurity Operations Center",
    organization: "National Cyber Agency",
    deadline: "May 10, 2026",
    pwinScore: 88,
    riskScore: 22,
    status: "ready",
    value: "$6.7M",
    category: "Defense",
  },
  {
    id: "rfp-006",
    title: "Cloud Migration for Financial Services",
    organization: "Reserve Bank",
    deadline: "May 15, 2026",
    pwinScore: 59,
    riskScore: 68,
    status: "analyzing",
    value: "$9.1M",
    category: "Finance",
  },
]

export default function RFPsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const filteredRFPs = mockRFPs.filter((rfp) => {
    const matchesSearch = rfp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfp.organization.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || rfp.status === statusFilter
    const matchesCategory = categoryFilter === "all" || rfp.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  const handleProceed = (id: string) => {
    console.log("[v0] Proceeding with RFP:", id)
    // This would trigger POST /execute endpoint
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RFP Intelligence</h1>
          <p className="text-muted-foreground">
            Analyze and manage procurement opportunities
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          Upload RFP
        </Button>
      </div>

      {/* Heatmap */}
      <DeadlineHeatmap />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search RFPs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass-button"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 glass-button">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="analyzing">Analyzing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 glass-button">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Defense">Defense</SelectItem>
            <SelectItem value="Energy">Energy</SelectItem>
            <SelectItem value="Healthcare">Healthcare</SelectItem>
            <SelectItem value="Infrastructure">Infrastructure</SelectItem>
            <SelectItem value="Finance">Finance</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 glass-button p-1 rounded-lg">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="size-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setViewMode("list")}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {/* RFP Grid */}
      <motion.div
        layout
        className={
          viewMode === "grid"
            ? "grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "flex flex-col gap-4"
        }
      >
        {filteredRFPs.map((rfp, index) => (
          <motion.div
            key={rfp.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <RFPCard rfp={rfp} onProceed={handleProceed} />
          </motion.div>
        ))}
      </motion.div>

      {filteredRFPs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No RFPs found matching your criteria</p>
        </div>
      )}
    </div>
  )
}
