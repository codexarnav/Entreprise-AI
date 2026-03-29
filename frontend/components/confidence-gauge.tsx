"use client"

import { motion } from "framer-motion"

interface ConfidenceGaugeProps {
  value: number // 0-100
  size?: "sm" | "md" | "lg"
  label?: string
}

export function ConfidenceGauge({ value, size = "md", label }: ConfidenceGaugeProps) {
  const sizes = {
    sm: { outer: 48, stroke: 4, text: "text-xs" },
    md: { outer: 72, stroke: 6, text: "text-sm" },
    lg: { outer: 96, stroke: 8, text: "text-lg" },
  }

  const { outer, stroke, text } = sizes[size]
  const radius = (outer - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  const getColor = (val: number) => {
    if (val >= 80) return "var(--neon-green)"
    if (val >= 60) return "var(--neon-cyan)"
    if (val >= 40) return "var(--neon-amber)"
    return "var(--neon-red)"
  }

  const color = getColor(value)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={outer}
        height={outer}
        viewBox={`0 0 ${outer} ${outer}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/30"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`font-bold ${text}`}
          style={{ color }}
        >
          {value}%
        </motion.span>
        {label && (
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
