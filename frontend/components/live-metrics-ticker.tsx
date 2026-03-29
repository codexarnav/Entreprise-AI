"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, FileText, Bot, CheckCircle2 } from "lucide-react"

interface Metric {
  label: string
  value: number
  icon: React.ReactNode
  suffix?: string
}

export function LiveMetricsTicker() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: "Active Agents", value: 14, icon: <Bot className="size-4" /> },
    { label: "RFPs Processed", value: 1024, icon: <FileText className="size-4" /> },
    { label: "Negotiations Active", value: 7, icon: <Activity className="size-4" /> },
    { label: "Success Rate", value: 94, icon: <CheckCircle2 className="size-4" />, suffix: "%" },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: metric.label === "Success Rate" 
          ? Math.min(99, Math.max(90, metric.value + Math.floor(Math.random() * 3) - 1))
          : metric.value + Math.floor(Math.random() * 5) - 2
      })))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="glass-card px-6 py-3 flex items-center gap-8 overflow-hidden">
      <div className="flex items-center gap-2 text-neon-cyan text-sm font-medium">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon-cyan opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-neon-cyan" />
        </span>
        LIVE
      </div>
      
      <div className="flex items-center gap-8">
        {metrics.map((metric, index) => (
          <div key={metric.label} className="flex items-center gap-3">
            <div className="text-muted-foreground">
              {metric.icon}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {metric.label}
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={metric.value}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-lg font-bold text-foreground tabular-nums"
                >
                  {metric.value.toLocaleString()}{metric.suffix || ""}
                </motion.span>
              </AnimatePresence>
            </div>
            {index < metrics.length - 1 && (
              <div className="w-px h-6 bg-border ml-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
