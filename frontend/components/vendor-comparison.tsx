"use client"

import { motion } from "framer-motion"
import { Check, X, Minus, Star, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ConfidenceGauge } from "./confidence-gauge"

export interface VendorData {
  id: string
  name: string
  logo: string
  score: number
  price: string
  priceScore: number
  technical: number
  compliance: number
  delivery: string
  experience: number
  certifications: string[]
  riskFlags: string[]
  recommended: boolean
}

interface VendorComparisonProps {
  vendors: VendorData[]
  onSelect?: (vendor: VendorData) => void
}

const criteria = [
  { key: "price", label: "Price Quote", type: "currency" },
  { key: "priceScore", label: "Price Competitiveness", type: "score" },
  { key: "technical", label: "Technical Score", type: "score" },
  { key: "compliance", label: "Compliance Score", type: "score" },
  { key: "delivery", label: "Delivery Timeline", type: "text" },
  { key: "experience", label: "Years Experience", type: "number" },
  { key: "certifications", label: "Certifications", type: "list" },
  { key: "riskFlags", label: "Risk Flags", type: "risks" },
]

export function VendorComparison({ vendors, onSelect }: VendorComparisonProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-neon-green"
    if (score >= 60) return "text-neon-cyan"
    if (score >= 40) return "text-neon-amber"
    return "text-neon-red"
  }

  const renderCell = (vendor: VendorData, criterion: typeof criteria[0]) => {
    const value = vendor[criterion.key as keyof VendorData]

    switch (criterion.type) {
      case "score":
        const score = value as number
        return (
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${getScoreColor(score)}`}>
              {score}%
            </span>
            {score >= 75 ? (
              <TrendingUp className="size-3 text-neon-green" />
            ) : score < 50 ? (
              <TrendingDown className="size-3 text-neon-red" />
            ) : null}
          </div>
        )
      
      case "currency":
        return <span className="font-semibold">{value}</span>
      
      case "number":
        return <span>{value} years</span>
      
      case "list":
        const certs = value as string[]
        return (
          <div className="flex flex-wrap gap-1">
            {certs.slice(0, 2).map((cert) => (
              <Badge key={cert} variant="outline" className="text-xs bg-primary/10">
                {cert}
              </Badge>
            ))}
            {certs.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{certs.length - 2}
              </Badge>
            )}
          </div>
        )
      
      case "risks":
        const risks = value as string[]
        return risks.length === 0 ? (
          <span className="text-neon-green flex items-center gap-1">
            <Check className="size-3" /> None
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {risks.map((risk) => (
              <Badge key={risk} variant="outline" className="text-xs bg-neon-red/10 text-neon-red border-neon-red/30">
                {risk}
              </Badge>
            ))}
          </div>
        )
      
      default:
        return <span>{String(value)}</span>
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground sticky left-0 bg-card/80 backdrop-blur-sm z-10">
                Criteria
              </th>
              {vendors.map((vendor) => (
                <th key={vendor.id} className="p-4 min-w-[200px]">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-card p-4 cursor-pointer hover:border-primary/50 transition-colors ${
                      vendor.recommended ? "border-primary/50 neon-glow-blue" : ""
                    }`}
                    onClick={() => onSelect?.(vendor)}
                  >
                    {vendor.recommended && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        <Star className="size-3 mr-1" /> Recommended
                      </Badge>
                    )}
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                        {vendor.logo}
                      </div>
                      <span className="font-semibold text-center">{vendor.name}</span>
                      <ConfidenceGauge value={vendor.score} size="sm" label="Match" />
                    </div>
                  </motion.div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion, index) => (
              <motion.tr
                key={criterion.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <td className="p-4 text-sm font-medium sticky left-0 bg-card/80 backdrop-blur-sm">
                  {criterion.label}
                </td>
                {vendors.map((vendor) => (
                  <td key={`${vendor.id}-${criterion.key}`} className="p-4 text-sm text-center">
                    {renderCell(vendor, criterion)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
