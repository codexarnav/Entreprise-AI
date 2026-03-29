"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Filter, Grid3X3, List, RefreshCw,
  X, FileText, AlertTriangle, BarChart3, Wrench, DollarSign, Link2,
  ChevronRight, Loader2, ShoppingCart, Star, TrendingUp, Users, Hash
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RFPCard, type RFPData } from "@/components/rfp-card"
import api from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcurementVendorEntry {
  vendor_id: string
  score: number
  price?: string
  risk?: number
}

interface ProcurementData {
  id: string
  rfp_id?: string
  vendors?: ProcurementVendorEntry[]
  selected_vendor?: string
  negotiation_history?: { vendor_id: string; offer: string; timestamp: string }[]
  final_decision?: { vendor_id?: string; confidence?: number }
  created_at?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DetailSection({
  title, icon, data,
}: {
  title: string
  icon: React.ReactNode
  data: Record<string, unknown> | null | undefined
}) {
  if (!data || Object.keys(data).length === 0) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <div className="glass-card p-4 space-y-1.5 rounded-lg">
        {Object.entries(data).map(([key, val]) => {
          if (val === null || val === undefined) return null
          const displayVal =
            typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)
          return (
            <div key={key} className="grid grid-cols-5 gap-2 text-sm">
              <span className="col-span-2 text-muted-foreground capitalize">
                {key.replace(/_/g, " ")}
              </span>
              <span className="col-span-3 text-foreground break-words font-mono text-xs">
                {displayVal}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Procurement Panel ────────────────────────────────────────────────────────

function ProcurementPanel({ rfpParsedData }: { rfpParsedData: Record<string, unknown> | null }) {
  // Try to auto-discover procurement_id from parsed_data
  const autoId =
    typeof rfpParsedData?.["procurement_id"] === "string"
      ? (rfpParsedData["procurement_id"] as string)
      : null

  const [procurementId, setProcurementId] = useState(autoId ?? "")
  const [inputVal, setInputVal]           = useState(autoId ?? "")
  const [data, setData]                   = useState<ProcurementData | null>(null)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  // Auto-fetch if we have an ID
  useEffect(() => {
    if (!procurementId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)
    api.get<ProcurementData>(`/procurement/${procurementId}`)
      .then(res => { if (!cancelled) setData(res.data) })
      .catch(err => {
        if (!cancelled)
          setError(err.response?.data?.detail ?? "Procurement record not found.")
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [procurementId])

  const handleLookup = () => {
    const trimmed = inputVal.trim()
    if (trimmed) setProcurementId(trimmed)
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-neon-green"
    if (score >= 0.6) return "text-neon-cyan"
    if (score >= 0.4) return "text-neon-amber"
    return "text-neon-red"
  }

  return (
    <div className="space-y-5">
      {/* Lookup bar (always show so user can try different IDs) */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {autoId
            ? "Procurement ID auto-detected from RFP data."
            : "No procurement ID found in RFP data. Enter one manually to look up the decision record."}
        </p>
        <div className="flex gap-2">
          <Input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="Enter procurement ID…"
            className="glass-button font-mono text-xs"
            onKeyDown={e => e.key === "Enter" && handleLookup()}
          />
          <Button onClick={handleLookup} disabled={!inputVal.trim() || loading} size="sm">
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Load"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5">
          {/* Final Decision Card */}
          {data.final_decision && (
            <div className="glass-card p-5 border border-primary/30">
              <div className="flex items-center gap-2 mb-4">
                <Star className="size-4 text-neon-amber" />
                <span className="text-sm font-semibold">Final Decision</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {data.selected_vendor && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Selected Vendor</p>
                    <p className="font-mono text-xs text-primary">{data.selected_vendor}</p>
                  </div>
                )}
                {typeof data.final_decision.confidence === "number" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${getScoreColor(data.final_decision.confidence)}`}>
                        {(data.final_decision.confidence * 100).toFixed(0)}%
                      </span>
                      <TrendingUp className={`size-4 ${getScoreColor(data.final_decision.confidence)}`} />
                    </div>
                    <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${data.final_decision.confidence * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vendor Scoring Table */}
          {data.vendors && data.vendors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users className="size-4 text-neon-cyan" />
                Vendor Scores
              </div>
              <div className="glass-card rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Vendor ID</th>
                      <th className="text-center p-3 text-xs text-muted-foreground font-medium">Score</th>
                      {data.vendors.some(v => v.price) && (
                        <th className="text-center p-3 text-xs text-muted-foreground font-medium">Price</th>
                      )}
                      {data.vendors.some(v => typeof v.risk === "number") && (
                        <th className="text-center p-3 text-xs text-muted-foreground font-medium">Risk</th>
                      )}
                      <th className="text-center p-3 text-xs text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.vendors
                      .slice()
                      .sort((a, b) => b.score - a.score)
                      .map((v, i) => {
                        const isSelected = v.vendor_id === data.selected_vendor
                        return (
                          <tr
                            key={v.vendor_id}
                            className={`border-b border-border/50 ${isSelected ? "bg-primary/5" : i % 2 === 0 ? "" : "bg-muted/20"}`}
                          >
                            <td className="p-3 font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                              {v.vendor_id}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`font-bold ${getScoreColor(v.score)}`}>
                                {(v.score * 100).toFixed(0)}%
                              </span>
                            </td>
                            {data.vendors!.some(ve => ve.price) && (
                              <td className="p-3 text-center text-xs">{v.price ?? "—"}</td>
                            )}
                            {data.vendors!.some(ve => typeof ve.risk === "number") && (
                              <td className="p-3 text-center text-xs">
                                {typeof v.risk === "number"
                                  ? <span className={getScoreColor(1 - v.risk)}>{(v.risk * 100).toFixed(0)}%</span>
                                  : "—"}
                              </td>
                            )}
                            <td className="p-3 text-center">
                              {isSelected ? (
                                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs flex items-center gap-1 justify-center">
                                  <Star className="size-2.5" /> Selected
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Negotiation History */}
          {data.negotiation_history && data.negotiation_history.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Hash className="size-4 text-neon-amber" />
                Negotiation History ({data.negotiation_history.length})
              </div>
              <div className="space-y-2">
                {data.negotiation_history.map((h, i) => (
                  <div key={i} className="glass-card p-3 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span className="font-mono">{h.vendor_id}</span>
                      <span>{h.timestamp ? new Date(h.timestamp).toLocaleString("en-IN") : ""}</span>
                    </div>
                    <p className="text-foreground">{h.offer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state — no ID and no data */}
      {!loading && !data && !error && !procurementId && (
        <div className="text-center py-10">
          <ShoppingCart className="size-10 text-muted-foreground opacity-50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Enter a procurement ID above to load the decision record for this RFP.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── RFP Detail Modal ─────────────────────────────────────────────────────────

function RFPDetailModal({ rfpId, onClose }: { rfpId: string; onClose: () => void }) {
  const [rfp, setRfp]       = useState<RFPData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [tab, setTab]       = useState<"analysis" | "procurement">("analysis")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.get<RFPData>(`/rfps/${rfpId}`)
      .then(res => { if (!cancelled) setRfp(res.data) })
      .catch(err => { if (!cancelled) setError(err.response?.data?.detail ?? "Failed to load RFP details.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [rfpId])

  function getTitle(r: RFPData): string {
    const pd = r.parsed_data
    if (pd) {
      const t = pd["title"] ?? pd["name"] ?? pd["rfp_title"] ?? pd["subject"]
      if (t && typeof t === "string") return t
    }
    if (r.document_path) {
      const parts = r.document_path.replace(/\\/g, "/").split("/")
      return parts[parts.length - 1] || r.id
    }
    return r.id
  }

  const hasProcurement =
    rfp?.parsed_data &&
    typeof (rfp.parsed_data as Record<string, unknown>)["procurement_id"] === "string"

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="glass-card w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold line-clamp-1">
                  {rfp ? getTitle(rfp) : "RFP Details"}
                </h2>
                <p className="text-xs text-muted-foreground font-mono">{rfpId}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
              <X className="size-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-4 flex-shrink-0">
            {(["analysis", "procurement"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t === "analysis"
                  ? <><BarChart3 className="size-3.5" /> Analysis</>
                  : <><ShoppingCart className="size-3.5" /> Procurement {hasProcurement && <span className="size-2 rounded-full bg-neon-green inline-block ml-1" />}</>
                }
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {rfp && !loading && tab === "analysis" && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={rfp.status === "processed" ? "bg-neon-green/20 text-neon-green" : "bg-neon-amber/20 text-neon-amber"}>
                    {rfp.status}
                  </Badge>
                  <Badge variant="outline" className="bg-muted/50 capitalize">{rfp.source}</Badge>
                  {rfp.created_at && (
                    <Badge variant="outline" className="bg-muted/50">
                      {new Date(rfp.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </Badge>
                  )}
                </div>

                {rfp.document_path && (
                  <div className="flex items-start gap-2 text-sm">
                    <Link2 className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground break-all font-mono text-xs">{rfp.document_path}</span>
                  </div>
                )}

                <DetailSection
                  title="Parsed Data"
                  icon={<FileText className="size-4 text-primary" />}
                  data={rfp.parsed_data as Record<string, unknown>}
                />
                <DetailSection
                  title="Risk Analysis"
                  icon={<AlertTriangle className="size-4 text-neon-amber" />}
                  data={rfp.risk_analysis as Record<string, unknown>}
                />
                <DetailSection
                  title="Technical Fit"
                  icon={<Wrench className="size-4 text-neon-cyan" />}
                  data={rfp.technical_fit as Record<string, unknown>}
                />
                <DetailSection
                  title="Pricing"
                  icon={<DollarSign className="size-4 text-neon-green" />}
                  data={rfp.pricing as Record<string, unknown>}
                />

                {!rfp.parsed_data && !rfp.risk_analysis && !rfp.technical_fit && !rfp.pricing && (
                  <div className="text-center py-8">
                    <BarChart3 className="size-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No analysis data available yet for this RFP.</p>
                  </div>
                )}
              </>
            )}

            {rfp && !loading && tab === "procurement" && (
              <ProcurementPanel
                rfpParsedData={rfp.parsed_data as Record<string, unknown> | null}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RFPsPage() {
  const [rfps, setRfps]               = useState<RFPData[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [viewMode, setViewMode]       = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [selectedId, setSelectedId]   = useState<string | null>(null)

  const fetchRFPs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<RFPData[]>("/rfps")
      setRfps(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail ?? "Failed to load RFPs.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRFPs() }, [fetchRFPs])

  const filteredRFPs = rfps.filter(rfp => {
    const title = (
      (rfp.parsed_data as Record<string, unknown>)?.["title"] ??
      (rfp.parsed_data as Record<string, unknown>)?.["name"] ??
      rfp.document_path ??
      rfp.id
    ).toString().toLowerCase()

    const matchesSearch =
      title.includes(searchQuery.toLowerCase()) ||
      rfp.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfp.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || rfp.status === statusFilter
    const matchesSource = sourceFilter === "all" || rfp.source === sourceFilter

    return matchesSearch && matchesStatus && matchesSource
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RFP Intelligence</h1>
          <p className="text-muted-foreground">Analyze and manage procurement opportunities</p>
        </div>
        <Button onClick={fetchRFPs} variant="outline" className="gap-2" disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="size-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && rfps.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ChevronRight className="size-3" />
            {rfps.length} total RFPs
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-neon-green inline-block" />
            {rfps.filter(r => r.status === "processed").length} processed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-neon-amber inline-block" />
            {rfps.filter(r => r.status === "pending").length} pending
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
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
            <SelectItem value="processed">Processed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40 glass-button">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="upload">Upload</SelectItem>
            <SelectItem value="scraper">Scraper</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 glass-button p-1 rounded-lg">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon" className="size-8"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="size-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon" className="size-8"
            onClick={() => setViewMode("list")}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-3" />
              <div className="h-3 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
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
              transition={{ delay: index * 0.04 }}
            >
              <RFPCard rfp={rfp} onClick={setSelectedId} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && !error && filteredRFPs.length === 0 && (
        <div className="text-center py-16">
          <FileText className="size-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground font-medium">
            {rfps.length === 0
              ? "No RFPs found. Run an email or scraper workflow to populate RFPs."
              : "No RFPs match your filters."}
          </p>
        </div>
      )}

      {selectedId && (
        <RFPDetailModal rfpId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
