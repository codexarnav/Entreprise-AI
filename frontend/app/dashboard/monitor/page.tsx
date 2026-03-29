"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Play, Pause, RotateCcw, Zap, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WorkflowProgress, type WorkflowNode } from "@/components/workflow-progress"
import { AuditLogTerminal } from "@/components/audit-log-terminal"
import { ConfidenceGauge } from "@/components/confidence-gauge"

const mockWorkflows = [
  { id: "wf-001", name: "RFP-001: Defense Communications", status: "running" },
  { id: "wf-002", name: "RFP-003: Healthcare Analytics", status: "completed" },
  { id: "wf-003", name: "RFP-004: Railway Signaling", status: "pending" },
]

const mockNodes: WorkflowNode[] = [
  { id: "1", name: "Ingestion", status: "completed", output: "Document parsed successfully", duration: "2.3s" },
  { id: "2", name: "Risk Analysis", status: "recovered", output: "Risk assessment complete with fallback", duration: "5.1s" },
  { id: "3", name: "Tech Match", status: "completed", output: "4 vendors matched", duration: "3.8s" },
  { id: "4", name: "Pricing", status: "running", output: "Negotiation in progress" },
  { id: "5", name: "Proposal", status: "pending" },
]

const agentStats = [
  { name: "Technical Agent", status: "Active", tasks: 12, avgTime: "4.2s", color: "neon-green" },
  { name: "Risk Agent", status: "Analyzing", tasks: 8, avgTime: "5.1s", color: "neon-amber" },
  { name: "Pricing Agent", status: "Negotiating", tasks: 6, avgTime: "8.3s", color: "neon-cyan" },
  { name: "Proposal Agent", status: "Idle", tasks: 4, avgTime: "12.1s", color: "muted-foreground" },
]

export default function MonitorPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState(mockWorkflows[0].id)
  const [isPaused, setIsPaused] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Monitor</h1>
          <p className="text-muted-foreground">
            Real-time workflow execution tracking
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger className="w-[300px] glass-button">
              <SelectValue placeholder="Select workflow" />
            </SelectTrigger>
            <SelectContent>
              {mockWorkflows.map((wf) => (
                <SelectItem key={wf.id} value={wf.id}>
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${
                      wf.status === "running" ? "bg-neon-cyan animate-pulse" :
                      wf.status === "completed" ? "bg-neon-green" :
                      "bg-muted-foreground"
                    }`} />
                    {wf.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            className="glass-button"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </Button>
          
          <Button variant="outline" size="icon" className="glass-button">
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>

      {/* Workflow Progress */}
      <WorkflowProgress nodes={mockNodes} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {agentStats.map((agent, index) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`size-3 rounded-full bg-${agent.color}`} />
              <span className={`text-xs text-${agent.color}`}>{agent.status}</span>
            </div>
            <h4 className="font-medium text-sm mb-2">{agent.name}</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Tasks</span>
                <p className="font-semibold">{agent.tasks}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Time</span>
                <p className="font-semibold">{agent.avgTime}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Audit Log */}
        <div className="lg:col-span-2">
          <AuditLogTerminal />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Current Task */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="size-4 text-neon-cyan" />
              Current Task
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Task Name</p>
                <p className="font-medium">Price Negotiation</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agent</p>
                <p className="font-medium text-neon-cyan">PricingAgent</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="size-2 rounded-full bg-neon-cyan animate-pulse" />
                  <span className="text-sm">Running</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-mono text-neon-cyan">00:03:42</p>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Workflow Metrics</h3>
            <div className="flex items-center justify-around">
              <ConfidenceGauge value={78} size="md" label="P(Win)" />
              <ConfidenceGauge value={35} size="md" label="Risk" />
            </div>
          </div>

          {/* Alerts */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="size-4 text-neon-amber" />
              Active Alerts
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-neon-amber/10 border border-neon-amber/20">
                <p className="text-sm font-medium text-neon-amber">Self-Correction Active</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Risk Agent recovered from timeout using backup data source
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20">
                <p className="text-sm font-medium text-neon-cyan">Negotiation Update</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Counter-offer received from TechCorp: $10.5M
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
