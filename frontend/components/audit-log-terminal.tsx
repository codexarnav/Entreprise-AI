"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Terminal, Download, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface AuditLogEntry {
  id: string
  timestamp: Date
  agent: "TechnicalAgent" | "RiskAgent" | "PricingAgent" | "ProposalAgent" | "System"
  event: string
  detail: {
    decision?: string
    rationale?: string
    data?: Record<string, unknown>
  }
  level: "info" | "warning" | "error" | "success"
}

const mockLogs: AuditLogEntry[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 120000),
    agent: "System",
    event: "WORKFLOW_STARTED",
    detail: { decision: "Initiated procurement workflow", rationale: "RFP-001 submitted for processing" },
    level: "info",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 100000),
    agent: "TechnicalAgent",
    event: "REQUIREMENTS_PARSED",
    detail: { 
      decision: "Identified 47 technical requirements", 
      rationale: "NLP extraction completed with 98% confidence",
      data: { requirements_count: 47, confidence: 0.98 }
    },
    level: "success",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 80000),
    agent: "RiskAgent",
    event: "RISK_ASSESSMENT",
    detail: { 
      decision: "Risk level: MEDIUM", 
      rationale: "Timeline constraints identified. Mitigation strategies available.",
      data: { risk_score: 45, flags: ["timeline_risk", "resource_availability"] }
    },
    level: "warning",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 60000),
    agent: "TechnicalAgent",
    event: "VENDOR_MATCHING",
    detail: { 
      decision: "4 vendors qualified", 
      rationale: "Based on capability matrix and compliance requirements",
      data: { matched_vendors: 4, total_evaluated: 12 }
    },
    level: "success",
  },
  {
    id: "5",
    timestamp: new Date(Date.now() - 40000),
    agent: "PricingAgent",
    event: "PRICE_ANALYSIS",
    detail: { 
      decision: "Target price: $10.8M", 
      rationale: "Based on market analysis, historical data, and vendor capacity",
      data: { target_price: 10800000, market_average: 11200000 }
    },
    level: "info",
  },
  {
    id: "6",
    timestamp: new Date(Date.now() - 20000),
    agent: "System",
    event: "DATABASE_FALLBACK",
    detail: { 
      decision: "Switched to backup retrieval", 
      rationale: "Primary vector store timeout. Self-correction initiated.",
    },
    level: "warning",
  },
  {
    id: "7",
    timestamp: new Date(Date.now() - 10000),
    agent: "PricingAgent",
    event: "NEGOTIATION_STARTED",
    detail: { 
      decision: "Autonomous negotiation initiated", 
      rationale: "TechCorp Industries selected as primary vendor",
      data: { vendor: "TechCorp Industries", initial_quote: 12500000 }
    },
    level: "success",
  },
]

const agentColors: Record<AuditLogEntry["agent"], string> = {
  TechnicalAgent: "text-neon-green",
  RiskAgent: "text-neon-red",
  PricingAgent: "text-neon-cyan",
  ProposalAgent: "text-primary",
  System: "text-muted-foreground",
}

export function AuditLogTerminal() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [logs, setLogs] = useState<AuditLogEntry[]>(mockLogs)
  const [filter, setFilter] = useState<AuditLogEntry["agent"] | "all">("all")
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalRef.current && isExpanded) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs, isExpanded])

  // Simulate new log entries
  useEffect(() => {
    const interval = setInterval(() => {
      const newLog: AuditLogEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        agent: ["TechnicalAgent", "RiskAgent", "PricingAgent", "System"][Math.floor(Math.random() * 4)] as AuditLogEntry["agent"],
        event: ["PROCESSING", "ANALYZING", "EVALUATING", "UPDATING"][Math.floor(Math.random() * 4)],
        detail: { 
          decision: "Ongoing analysis...", 
          rationale: "Real-time processing" 
        },
        level: "info",
      }
      setLogs(prev => [...prev.slice(-50), newLog])
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const filteredLogs = filter === "all" ? logs : logs.filter(log => log.agent === filter)

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Terminal className="size-5 text-neon-cyan" />
          <h3 className="font-semibold">Agent Thought Stream</h3>
          <Badge variant="outline" className="bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30 text-xs">
            Live
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 glass-button p-1 rounded-lg">
            {(["all", "TechnicalAgent", "RiskAgent", "PricingAgent"] as const).map((agent) => (
              <Button
                key={agent}
                variant={filter === agent ? "secondary" : "ghost"}
                size="sm"
                className={`text-xs h-7 ${filter === agent ? "" : agentColors[agent as AuditLogEntry["agent"]] || ""}`}
                onClick={() => setFilter(agent)}
              >
                {agent === "all" ? "All" : agent.replace("Agent", "")}
              </Button>
            ))}
          </div>
          
          <Button variant="ghost" size="icon" className="size-8">
            <Download className="size-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 400 }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div
              ref={terminalRef}
              className="h-[400px] overflow-y-auto p-4 font-mono text-sm bg-background/50"
            >
              {filteredLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="mb-3 group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-muted-foreground text-xs shrink-0">
                      [{formatTimestamp(log.timestamp)}]
                    </span>
                    <span className={`font-semibold shrink-0 ${agentColors[log.agent]}`}>
                      {log.agent}:
                    </span>
                    <div className="flex-1">
                      <span className={`font-medium ${
                        log.level === "success" ? "text-neon-green" :
                        log.level === "warning" ? "text-neon-amber" :
                        log.level === "error" ? "text-neon-red" :
                        "text-foreground"
                      }`}>
                        {log.event}
                      </span>
                      <p className="text-muted-foreground mt-0.5">
                        {log.detail.decision}
                      </p>
                      {log.detail.rationale && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 italic">
                          Rationale: {log.detail.rationale}
                        </p>
                      )}
                      {log.detail.data && (
                        <pre className="text-xs text-neon-cyan/70 mt-1 p-2 rounded bg-neon-cyan/5 overflow-x-auto">
                          {JSON.stringify(log.detail.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Cursor */}
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-block w-2 h-4 bg-neon-cyan ml-1"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
