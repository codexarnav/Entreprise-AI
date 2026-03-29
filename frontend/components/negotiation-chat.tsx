"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, User, Send, Hand, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Message {
  id: string
  role: "system" | "vendor" | "user"
  content: string
  timestamp: Date
  metadata?: {
    priceOffer?: string
    accepted?: boolean
    counterOffer?: string
  }
}

interface NegotiationChatProps {
  vendorName: string
  status: "bot-led" | "user-control" | "completed"
  onTakeControl: () => void
  onSendMessage: (message: string) => void
  onResumeBot: () => void
}

const mockMessages: Message[] = [
  {
    id: "1",
    role: "system",
    content: "Autonomous negotiation initiated with TechCorp Industries for RFP-001.",
    timestamp: new Date(Date.now() - 1800000),
  },
  {
    id: "2",
    role: "system",
    content: "Initial pricing analysis complete. Vendor quote: $12.5M. Target: $10.8M based on market analysis.",
    timestamp: new Date(Date.now() - 1700000),
  },
  {
    id: "3",
    role: "vendor",
    content: "Thank you for considering TechCorp for this opportunity. Our proposal includes comprehensive support and a 5-year warranty. The quoted price of $12.5M reflects our premium service tier.",
    timestamp: new Date(Date.now() - 1500000),
  },
  {
    id: "4",
    role: "system",
    content: "Counter-proposal submitted: $10.2M with modified support terms. Justification: Market comparison shows 15% lower average for similar scope.",
    timestamp: new Date(Date.now() - 1200000),
    metadata: { priceOffer: "$10.2M" },
  },
  {
    id: "5",
    role: "vendor",
    content: "We appreciate the detailed analysis. We can offer $11.8M with the full support package, or $10.5M with standard support. Both options include the 5-year warranty.",
    timestamp: new Date(Date.now() - 900000),
    metadata: { counterOffer: "$10.5M - $11.8M" },
  },
  {
    id: "6",
    role: "system",
    content: "Evaluating options. Recommendation: Accept $10.5M with standard support. ROI analysis shows 23% cost savings vs. original quote. Awaiting approval to proceed.",
    timestamp: new Date(Date.now() - 300000),
    metadata: { priceOffer: "$10.5M", accepted: true },
  },
]

export function NegotiationChat({
  vendorName,
  status,
  onTakeControl,
  onSendMessage,
  onResumeBot,
}: NegotiationChatProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!inputValue.trim()) return
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    }
    
    setMessages((prev) => [...prev, newMessage])
    onSendMessage(inputValue)
    setInputValue("")
  }

  const getStatusBadge = () => {
    switch (status) {
      case "bot-led":
        return (
          <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30">
            <Bot className="size-3 mr-1" /> Bot-Led Negotiation in Progress
          </Badge>
        )
      case "user-control":
        return (
          <Badge className="bg-neon-amber/20 text-neon-amber border-neon-amber/30">
            <User className="size-3 mr-1" /> Manual Override Active
          </Badge>
        )
      case "completed":
        return (
          <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30">
            Negotiation Complete
          </Badge>
        )
    }
  }

  return (
    <div className="glass-card flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Negotiation: {vendorName}</h3>
          <p className="text-sm text-muted-foreground">RFP-001 • Defense Communications</p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          {status === "bot-led" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onTakeControl}
              className="gap-2 border-neon-amber text-neon-amber hover:bg-neon-amber/10"
            >
              <Hand className="size-4" /> Take Control
            </Button>
          ) : status === "user-control" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onResumeBot}
              className="gap-2"
            >
              <Bot className="size-4" /> Resume Bot
            </Button>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === "vendor" ? "justify-end" : ""}`}
            >
              {message.role !== "vendor" && (
                <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                  message.role === "system" ? "bg-neon-cyan/20 text-neon-cyan" : "bg-primary/20 text-primary"
                }`}>
                  {message.role === "system" ? <Bot className="size-4" /> : <User className="size-4" />}
                </div>
              )}
              
              <div className={`max-w-[70%] ${message.role === "vendor" ? "order-first" : ""}`}>
                <div className={`rounded-xl p-3 ${
                  message.role === "system" ? "bg-neon-cyan/10 border border-neon-cyan/20" :
                  message.role === "vendor" ? "bg-muted" :
                  "bg-primary/10 border border-primary/20"
                }`}>
                  <p className="text-sm">{message.content}</p>
                  
                  {message.metadata?.priceOffer && (
                    <div className={`mt-2 p-2 rounded-lg text-xs font-medium ${
                      message.metadata.accepted 
                        ? "bg-neon-green/10 text-neon-green" 
                        : "bg-neon-cyan/10 text-neon-cyan"
                    }`}>
                      Price Offer: {message.metadata.priceOffer}
                      {message.metadata.accepted && " (Recommended)"}
                    </div>
                  )}
                  
                  {message.metadata?.counterOffer && (
                    <div className="mt-2 p-2 rounded-lg bg-neon-amber/10 text-neon-amber text-xs font-medium">
                      Counter Offer: {message.metadata.counterOffer}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              
              {message.role === "vendor" && (
                <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold">TC</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {status !== "completed" && (
        <div className="p-4 border-t border-border">
          {status === "bot-led" && (
            <div className="flex items-center gap-2 text-sm text-neon-amber mb-3">
              <AlertCircle className="size-4" />
              <span>Bot is handling negotiation. Take control to send manual messages.</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              placeholder={status === "bot-led" ? "Take control to send messages..." : "Type your message..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={status === "bot-led"}
              className="glass-button"
            />
            <Button
              onClick={handleSend}
              disabled={status === "bot-led" || !inputValue.trim()}
              className="gap-2"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
