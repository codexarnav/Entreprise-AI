"use client"

import { motion } from "framer-motion"
import { Calendar, Building2, AlertTriangle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfidenceGauge } from "./confidence-gauge"

export interface RFPData {
  id: string
  title: string
  organization: string
  deadline: string
  pwinScore: number
  riskScore: number
  status: "new" | "analyzing" | "ready" | "in-progress" | "completed"
  value: string
  category: string
}

interface RFPCardProps {
  rfp: RFPData
  onProceed: (id: string) => void
}

const statusConfig = {
  new: { label: "New", color: "bg-neon-blue/20 text-neon-blue" },
  analyzing: { label: "Analyzing", color: "bg-neon-amber/20 text-neon-amber" },
  ready: { label: "Ready", color: "bg-neon-green/20 text-neon-green" },
  "in-progress": { label: "In Progress", color: "bg-neon-cyan/20 text-neon-cyan" },
  completed: { label: "Completed", color: "bg-muted text-muted-foreground" },
}

export function RFPCard({ rfp, onProceed }: RFPCardProps) {
  const status = statusConfig[rfp.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="glass-card p-6 group hover:border-primary/50 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
            <Badge variant="outline" className="bg-muted/50">
              {rfp.category}
            </Badge>
          </div>
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
            {rfp.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="size-3" />
            <span>{rfp.organization}</span>
          </div>
        </div>
        
        <ConfidenceGauge value={rfp.pwinScore} size="sm" label="P(Win)" />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="size-3" />
            <span>{rfp.deadline}</span>
          </div>
          
          {rfp.riskScore > 50 && (
            <div className="flex items-center gap-1.5 text-neon-amber">
              <AlertTriangle className="size-3" />
              <span>Risk: {rfp.riskScore}%</span>
            </div>
          )}
          
          <span className="text-neon-green font-medium">{rfp.value}</span>
        </div>

        <Button
          size="sm"
          onClick={() => onProceed(rfp.id)}
          className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Proceed <ArrowRight className="size-3" />
        </Button>
      </div>
    </motion.div>
  )
}
