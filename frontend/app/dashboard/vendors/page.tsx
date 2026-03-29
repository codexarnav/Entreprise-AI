"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Filter, RefreshCw, X, Users,
  ShieldCheck, ShieldX, AlertTriangle, ChevronRight,
  Loader2, Building2, Hash, Calendar, Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import api from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

// Matches backend _doc() output: _id → id
interface VendorListItem {
  id: string
  name: string
  risk_score: number | null
  kyc_status: string | null
}

interface VendorDetail extends VendorListItem {
  pan: string | null
  aadhar: string | null
  embedding: unknown[] | null
  created_at: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRiskColor(score: number | null): string {
  if (score === null) return "text-muted-foreground"
  if (score <= 0.3) return "text-neon-green"
  if (score <= 0.6) return "text-neon-amber"
  return "text-neon-red"
}

function getRiskLabel(score: number | null): string {
  if (score === null) return "Unknown"
  if (score <= 0.3) return "Low Risk"
  if (score <= 0.6) return "Med Risk"
  return "High Risk"
}

function getRiskBg(score: number | null): string {
  if (score === null) return "bg-muted/20"
  if (score <= 0.3) return "bg-neon-green/10"
  if (score <= 0.6) return "bg-neon-amber/10"
  return "bg-neon-red/10"
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}

function formatDate(raw: string | null): string {
  if (!raw) return "—"
  try {
    return new Date(raw).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    })
  } catch {
    return raw
  }
}

// ─── Vendor Card ──────────────────────────────────────────────────────────────

interface VendorCardProps {
  vendor: VendorListItem
  onClick: (id: string) => void
}

function VendorCard({ vendor, onClick }: VendorCardProps) {
  const kycVerified = vendor.kyc_status === "verified"
  const risk = vendor.risk_score

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={() => onClick(vendor.id)}
      className="glass-card p-6 group hover:border-primary/50 transition-all duration-300 cursor-pointer"
    >
      {/* Avatar + Name */}
      <div className="flex items-start gap-4 mb-4">
        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
          {getInitials(vendor.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{vendor.name}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{vendor.id}</p>
        </div>
      </div>

      {/* KYC + Risk row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={
            kycVerified
              ? "bg-neon-green/10 text-neon-green border-neon-green/30 flex items-center gap-1"
              : "bg-neon-red/10 text-neon-red border-neon-red/30 flex items-center gap-1"
          }
        >
          {kycVerified ? <ShieldCheck className="size-3" /> : <ShieldX className="size-3" />}
          {kycVerified ? "KYC Verified" : vendor.kyc_status ?? "KYC Unknown"}
        </Badge>

        {risk !== null && (
          <Badge variant="outline" className={`${getRiskBg(risk)} ${getRiskColor(risk)} border-0`}>
            {getRiskLabel(risk)} ({(risk * 100).toFixed(0)}%)
          </Badge>
        )}
      </div>

      {/* Risk bar */}
      {risk !== null && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Risk Score</span>
            <span className={getRiskColor(risk)}>{(risk * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${risk * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full rounded-full ${
                risk <= 0.3 ? "bg-neon-green" : risk <= 0.6 ? "bg-neon-amber" : "bg-neon-red"
              }`}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-primary flex items-center gap-1">
          View Details <ChevronRight className="size-3" />
        </span>
      </div>
    </motion.div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface VendorDetailModalProps {
  vendorId: string
  onClose: () => void
}

function VendorDetailModal({ vendorId, onClose }: VendorDetailModalProps) {
  const [vendor, setVendor] = useState<VendorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.get<VendorDetail>(`/vendors/${vendorId}`)
      .then(res => { if (!cancelled) setVendor(res.data) })
      .catch(err => {
        if (!cancelled)
          setError(err.response?.data?.detail ?? "Failed to load vendor details.")
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vendorId])

  const v = vendor
  const risk = v?.risk_score ?? null
  const kycVerified = v?.kyc_status === "verified"

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
          className="glass-card w-full max-w-lg overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                {v ? getInitials(v.name) : <Building2 className="size-5" />}
              </div>
              <div>
                <h2 className="text-lg font-bold">{v?.name ?? "Vendor Details"}</h2>
                <p className="text-xs text-muted-foreground font-mono">{vendorId}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {v && !loading && (
              <>
                {/* KYC + Risk badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={
                      kycVerified
                        ? "bg-neon-green/10 text-neon-green border-neon-green/30 flex items-center gap-1"
                        : "bg-neon-red/10 text-neon-red border-neon-red/30 flex items-center gap-1"
                    }
                  >
                    {kycVerified ? <ShieldCheck className="size-3" /> : <ShieldX className="size-3" />}
                    KYC: {v.kyc_status ?? "Unknown"}
                  </Badge>
                  {risk !== null && (
                    <Badge variant="outline" className={`${getRiskBg(risk)} ${getRiskColor(risk)} border-0`}>
                      <Activity className="size-3 mr-1" />
                      Risk: {(risk * 100).toFixed(0)}% — {getRiskLabel(risk)}
                    </Badge>
                  )}
                </div>

                {/* Risk bar */}
                {risk !== null && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Risk Score</span>
                      <span className={getRiskColor(risk)}>{(risk * 100).toFixed(0)} / 100</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${risk * 100}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          risk <= 0.3 ? "bg-neon-green" : risk <= 0.6 ? "bg-neon-amber" : "bg-neon-red"
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Info rows */}
                <div className="space-y-3 text-sm">
                  {[
                    { icon: <Hash className="size-4 text-muted-foreground" />, label: "Vendor ID", value: v.id },
                    { icon: <Building2 className="size-4 text-muted-foreground" />, label: "PAN", value: v.pan ?? "Not provided" },
                    { icon: <Building2 className="size-4 text-muted-foreground" />, label: "Aadhaar", value: v.aadhar ? `••••••${v.aadhar.slice(-4)}` : "Not provided" },
                    { icon: <Calendar className="size-4 text-muted-foreground" />, label: "Registered", value: formatDate(v.created_at) },
                    { icon: <Activity className="size-4 text-muted-foreground" />, label: "Embedding", value: v.embedding && v.embedding.length > 0 ? `${v.embedding.length}-dim vector` : "Not generated" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-3">
                      {row.icon}
                      <span className="text-muted-foreground w-24 flex-shrink-0">{row.label}</span>
                      <span className="text-foreground font-mono text-xs break-all">{row.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const [vendors, setVendors]           = useState<VendorListItem[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [searchQuery, setSearchQuery]   = useState("")
  const [kycFilter, setKycFilter]       = useState("all")
  const [riskFilter, setRiskFilter]     = useState("all")
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<VendorListItem[]>("/vendors")
      setVendors(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail ?? "Failed to load vendors.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchVendors() }, [fetchVendors])

  const filtered = vendors.filter(v => {
    const matchSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchKyc =
      kycFilter === "all" ||
      (kycFilter === "verified" && v.kyc_status === "verified") ||
      (kycFilter === "failed" && v.kyc_status !== "verified")

    const matchRisk =
      riskFilter === "all" ||
      (riskFilter === "low"  && v.risk_score !== null && v.risk_score <= 0.3) ||
      (riskFilter === "med"  && v.risk_score !== null && v.risk_score > 0.3 && v.risk_score <= 0.6) ||
      (riskFilter === "high" && v.risk_score !== null && v.risk_score > 0.6)

    return matchSearch && matchKyc && matchRisk
  })

  const verified   = vendors.filter(v => v.kyc_status === "verified").length
  const highRisk   = vendors.filter(v => (v.risk_score ?? 0) > 0.6).length
  const avgRisk    = vendors.length
    ? vendors.reduce((sum, v) => sum + (v.risk_score ?? 0), 0) / vendors.length
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground">KYC status, risk profiles and vendor registry</p>
        </div>
        <Button onClick={fetchVendors} variant="outline" className="gap-2" disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="size-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stats bar */}
      {!loading && vendors.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Vendors",   value: vendors.length,                               color: "text-foreground" },
            { label: "KYC Verified",    value: verified,                                     color: "text-neon-green" },
            { label: "High Risk",       value: highRisk,                                     color: "text-neon-red" },
            { label: "Avg Risk Score",  value: `${(avgRisk * 100).toFixed(0)}%`,             color: avgRisk > 0.6 ? "text-neon-red" : avgRisk > 0.3 ? "text-neon-amber" : "text-neon-green" },
          ].map(stat => (
            <div key={stat.label} className="glass-card p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 glass-button"
          />
        </div>

        <Select value={kycFilter} onValueChange={setKycFilter}>
          <SelectTrigger className="w-44 glass-button">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="KYC Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All KYC</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="failed">Not Verified</SelectItem>
          </SelectContent>
        </Select>

        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-44 glass-button">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="low">Low Risk (≤30%)</SelectItem>
            <SelectItem value="med">Medium Risk (31–60%)</SelectItem>
            <SelectItem value="high">High Risk (&gt;60%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="size-12 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Vendor Grid */}
      {!loading && (
        <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vendor, index) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <VendorCard vendor={vendor} onClick={setSelectedId} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16">
          <Users className="size-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground font-medium">
            {vendors.length === 0
              ? "No vendors found. Run a vendor onboarding workflow to populate this registry."
              : "No vendors match your filters."}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedId && (
        <VendorDetailModal vendorId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
