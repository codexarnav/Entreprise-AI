"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { 
  FileText, 
  Users, 
  Activity, 
  TrendingUp, 
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfidenceGauge } from "@/components/confidence-gauge"
import { DeadlineHeatmap } from "@/components/deadline-heatmap"

const stats = [
  { label: "Active RFPs", value: "24", icon: FileText, change: "+3 this week", trend: "up" },
  { label: "Vendors", value: "156", icon: Users, change: "+12 qualified", trend: "up" },
  { label: "Active Agents", value: "8", icon: Activity, change: "3 negotiating", trend: "neutral" },
  { label: "Win Rate", value: "73%", icon: TrendingUp, change: "+5% vs last Q", trend: "up" },
]

const recentActivity = [
  { 
    id: 1, 
    type: "rfp_analyzed", 
    title: "Defense Communications RFP analyzed",
    time: "2 minutes ago",
    status: "success"
  },
  { 
    id: 2, 
    type: "negotiation", 
    title: "Vendor negotiation in progress - TechCorp",
    time: "15 minutes ago",
    status: "pending"
  },
  { 
    id: 3, 
    type: "risk_flag", 
    title: "High risk detected in Railway RFP",
    time: "1 hour ago",
    status: "warning"
  },
  { 
    id: 4, 
    type: "completed", 
    title: "Healthcare Analytics proposal submitted",
    time: "3 hours ago",
    status: "success"
  },
]

const topRFPs = [
  { id: "rfp-001", title: "Defense Communications", pwin: 78, deadline: "Apr 15" },
  { id: "rfp-005", title: "Cybersecurity Ops Center", pwin: 88, deadline: "May 10" },
  { id: "rfp-003", title: "Healthcare Analytics", pwin: 82, deadline: "May 1" },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back. Here&apos;s your procurement overview.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" />
          <span>Last updated: Just now</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="size-5 text-primary" />
              </div>
              <span className={`text-xs ${stat.trend === "up" ? "text-neon-green" : "text-muted-foreground"}`}>
                {stat.change}
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <DeadlineHeatmap />
          
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Activity</h3>
              <Link href="/dashboard/monitor">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`size-8 rounded-full flex items-center justify-center ${
                    activity.status === "success" ? "bg-neon-green/10 text-neon-green" :
                    activity.status === "warning" ? "bg-neon-amber/10 text-neon-amber" :
                    "bg-neon-cyan/10 text-neon-cyan"
                  }`}>
                    {activity.status === "success" ? <CheckCircle2 className="size-4" /> :
                     activity.status === "warning" ? <AlertTriangle className="size-4" /> :
                     <Activity className="size-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Top Opportunities */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Top Opportunities</h3>
            <div className="space-y-4">
              {topRFPs.map((rfp, index) => (
                <motion.div
                  key={rfp.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <ConfidenceGauge value={rfp.pwin} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rfp.title}</p>
                    <p className="text-xs text-muted-foreground">Due: {rfp.deadline}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <Link href="/dashboard/rfps">
              <Button variant="outline" className="w-full mt-4 gap-2 glass-button">
                View All RFPs <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>

          {/* Agent Status */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Agent Status</h3>
            <div className="space-y-3">
              {[
                { name: "Technical Agent", status: "Active", color: "neon-green" },
                { name: "Risk Agent", status: "Analyzing", color: "neon-amber" },
                { name: "Pricing Agent", status: "Negotiating", color: "neon-cyan" },
              ].map((agent) => (
                <div key={agent.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full bg-${agent.color}`} />
                    <span className="text-sm">{agent.name}</span>
                  </div>
                  <span className={`text-xs text-${agent.color}`}>{agent.status}</span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/monitor">
              <Button variant="outline" className="w-full mt-4 gap-2 glass-button">
                Open Monitor <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
