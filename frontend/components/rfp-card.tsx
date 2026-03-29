"use client"

import { motion } from "framer-motion"
import { FileText, Calendar, AlertTriangle, ArrowRight, Globe, Upload, Rss } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Shape returned by GET /rfps (backend _id is mapped to id by _doc helper)
export interface RFPData {
  id: string
  source: "email" | "upload" | "scraper" | string
  document_path: string | null
  parsed_data: Record<string, unknown> | null
  risk_analysis: Record<string, unknown> | null
  technical_fit: Record<string, unknown> | null
  pricing: Record<string, unknown> | null
  status: "processed" | "pending" | string
  created_at: string | null
}

interface RFPCardProps {
  rfp: RFPData
  onClick: (id: string) => void
}

const statusConfig: Record<string, { label: string; color: string }> = {
  processed: { label: "Processed", color: "bg-neon-green/20 text-neon-green" },
  pending:   { label: "Pending",   color: "bg-neon-amber/20 text-neon-amber" },
}

const sourceIcon: Record<string, React.ReactNode> = {
  email:   <Rss className="size-3" />,
  upload:  <Upload className="size-3" />,
  scraper: <Globe className="size-3" />,
}

function getStatusCfg(status: string) {
  return statusConfig[status] ?? { label: status, color: "bg-muted/50 text-muted-foreground" }
}

/** Try to pull a human-readable title from parsed_data, or fall back to document path / id */
function getTitle(rfp: RFPData): string {
  const pd = rfp.parsed_data
  if (pd) {
    const t = pd["title"] ?? pd["name"] ?? pd["rfp_title"] ?? pd["subject"]
    if (t && typeof t === "string") return t
  }
  if (rfp.document_path) {
    // Use the filename portion of the path
    const parts = rfp.document_path.replace(/\\/g, "/").split("/")
    return parts[parts.length - 1] || rfp.id
  }
  return rfp.id
}

function getRiskLevel(rfp: RFPData): { label: string; high: boolean } | null {
  const ra = rfp.risk_analysis
  if (!ra) return null
  const score =
    typeof ra["risk_score"] === "number"
      ? ra["risk_score"]
      : typeof ra["score"] === "number"
      ? ra["score"]
      : null
  if (score === null) return null
  return { label: `Risk: ${(score * 100).toFixed(0)}%`, high: score > 0.5 }
}

function getDate(rfp: RFPData): string | null {
  const raw = rfp.created_at
  if (!raw) return null
  try {
    return new Date(raw).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return null
  }
}

export function RFPCard({ rfp, onClick }: RFPCardProps) {
  const status  = getStatusCfg(rfp.status)
  const title   = getTitle(rfp)
  const risk    = getRiskLevel(rfp)
  const date    = getDate(rfp)
  const srcIcon = sourceIcon[rfp.source] ?? <FileText className="size-3" />

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={() => onClick(rfp.id)}
      className="glass-card p-6 group hover:border-primary/50 transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
            <Badge variant="outline" className="bg-muted/50 flex items-center gap-1">
              {srcIcon}
              <span className="capitalize">{rfp.source}</span>
            </Badge>
          </div>
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
            {title}
          </h3>
          {date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-3" />
              <span>{date}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-4 text-sm">
          {risk && (
            <div className={`flex items-center gap-1.5 ${risk.high ? "text-neon-amber" : "text-muted-foreground"}`}>
              {risk.high && <AlertTriangle className="size-3" />}
              <span>{risk.label}</span>
            </div>
          )}
          {rfp.pricing && typeof (rfp.pricing as Record<string,unknown>)["total_value"] === "string" && (
            <span className="text-neon-green font-medium">
              {(rfp.pricing as Record<string,unknown>)["total_value"] as string}
            </span>
          )}
        </div>

        <Button
          size="sm"
          className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onClick(rfp.id) }}
        >
          View <ArrowRight className="size-3" />
        </Button>
      </div>
    </motion.div>
  )
}
