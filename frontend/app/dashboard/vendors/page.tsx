"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, MessageSquare, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VendorComparison, type VendorData } from "@/components/vendor-comparison"
import { NegotiationChat } from "@/components/negotiation-chat"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const mockVendors: VendorData[] = [
  {
    id: "vendor-001",
    name: "TechCorp Industries",
    logo: "TC",
    score: 92,
    price: "$10.5M",
    priceScore: 85,
    technical: 94,
    compliance: 98,
    delivery: "12 weeks",
    experience: 15,
    certifications: ["ISO 9001", "ISO 27001", "CMMI L5"],
    riskFlags: [],
    recommended: true,
  },
  {
    id: "vendor-002",
    name: "GlobalTech Solutions",
    logo: "GT",
    score: 78,
    price: "$9.8M",
    priceScore: 92,
    technical: 76,
    compliance: 85,
    delivery: "14 weeks",
    experience: 8,
    certifications: ["ISO 9001", "ISO 27001"],
    riskFlags: ["Limited capacity"],
    recommended: false,
  },
  {
    id: "vendor-003",
    name: "DefenseFirst Inc",
    logo: "DF",
    score: 85,
    price: "$11.2M",
    priceScore: 72,
    technical: 91,
    compliance: 96,
    delivery: "10 weeks",
    experience: 22,
    certifications: ["ISO 9001", "ISO 27001", "CMMI L5", "FedRAMP"],
    riskFlags: [],
    recommended: false,
  },
  {
    id: "vendor-004",
    name: "InnovateTech",
    logo: "IT",
    score: 68,
    price: "$8.5M",
    priceScore: 98,
    technical: 65,
    compliance: 72,
    delivery: "16 weeks",
    experience: 5,
    certifications: ["ISO 9001"],
    riskFlags: ["New vendor", "Compliance gaps"],
    recommended: false,
  },
]

export default function VendorsPage() {
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null)
  const [showNegotiation, setShowNegotiation] = useState(false)
  const [negotiationStatus, setNegotiationStatus] = useState<"bot-led" | "user-control" | "completed">("bot-led")
  const [searchQuery, setSearchQuery] = useState("")

  const handleVendorSelect = (vendor: VendorData) => {
    setSelectedVendor(vendor)
  }

  const handleStartNegotiation = () => {
    setShowNegotiation(true)
  }

  const handleTakeControl = () => {
    setNegotiationStatus("user-control")
  }

  const handleResumeBot = () => {
    setNegotiationStatus("bot-led")
  }

  const handleSendMessage = (message: string) => {
    console.log("[v0] Message sent:", message)
    // This would POST to /workflow/{id}/resume endpoint
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground">
            Compare vendors and manage negotiations
          </p>
        </div>
      </div>

      <Tabs defaultValue="comparison" className="space-y-6">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="comparison">Vendor Comparison</TabsTrigger>
          <TabsTrigger value="catalog">Full Catalog</TabsTrigger>
          <TabsTrigger value="negotiations">Active Negotiations</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-6">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass-button"
              />
            </div>
            
            {selectedVendor && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4"
              >
                <span className="text-sm text-muted-foreground">
                  Selected: <span className="text-foreground font-medium">{selectedVendor.name}</span>
                </span>
                <Button onClick={handleStartNegotiation} className="gap-2">
                  <MessageSquare className="size-4" />
                  Start Negotiation
                </Button>
              </motion.div>
            )}
          </div>

          {/* Comparison Table */}
          <VendorComparison
            vendors={mockVendors}
            onSelect={handleVendorSelect}
          />
        </TabsContent>

        <TabsContent value="catalog">
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">
              Full vendor catalog with 156 qualified vendors across all categories.
            </p>
            <Button className="mt-4 gap-2">
              Browse Catalog <ArrowRight className="size-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="negotiations" className="space-y-4">
          {/* Active Negotiations List */}
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { vendor: "TechCorp Industries", rfp: "RFP-001", status: "In Progress", savings: "16%" },
              { vendor: "DefenseFirst Inc", rfp: "RFP-003", status: "Pending Response", savings: "8%" },
            ].map((neg, index) => (
              <motion.div
                key={neg.vendor}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedVendor(mockVendors[0])
                  setShowNegotiation(true)
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{neg.vendor}</h3>
                    <p className="text-sm text-muted-foreground">{neg.rfp}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-neon-cyan/10 text-neon-cyan">
                    {neg.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Projected Savings</span>
                  <span className="text-lg font-bold text-neon-green">{neg.savings}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Negotiation Dialog */}
      <Dialog open={showNegotiation} onOpenChange={setShowNegotiation}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 glass-card">
          <DialogHeader className="sr-only">
            <DialogTitle>Vendor Negotiation</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <NegotiationChat
              vendorName={selectedVendor.name}
              status={negotiationStatus}
              onTakeControl={handleTakeControl}
              onResumeBot={handleResumeBot}
              onSendMessage={handleSendMessage}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
