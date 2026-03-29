"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, X, Send, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

const suggestedQuestions = [
  "Why is the technical analysis taking so long?",
  "What is the current negotiation status?",
  "Summarize the active agent's memory",
  "What are the top risk factors for RFP-001?",
]

export function BrainChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI procurement assistant. I can help you understand agent activities, workflow status, and answer questions about your procurement operations. What would you like to know?",
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (message?: string) => {
    const content = message || inputValue
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        "Why is the technical analysis taking so long?": 
          "The Technical Agent is currently processing a complex requirements matrix with 47 specifications. The delay is due to cross-referencing vendor capabilities against specialized defense certifications. Current progress: 78%. Estimated completion: 2 minutes.",
        "What is the current negotiation status?":
          "The Pricing Agent is in active negotiation with TechCorp Industries. Current status:\n\n• Initial Quote: $12.5M\n• Our Counter: $10.2M\n• Their Counter: $10.5M (with standard support)\n\nThe agent is evaluating the latest offer and recommends acceptance based on 23% cost savings vs. market average.",
        "Summarize the active agent's memory":
          "Active Agent: PricingAgent\n\nRecent Memory Context:\n• Vendor: TechCorp Industries (Score: 92)\n• RFP Value: Defense Communications Phase II\n• Negotiation Round: 3\n• Key Decision: Evaluating $10.5M counter-offer\n• Risk Factors: None critical\n• Recommendation: Accept with standard support package",
        "What are the top risk factors for RFP-001?":
          "Risk Analysis for RFP-001:\n\n1. Timeline Constraints (Medium)\n   - 12-week delivery vs. 14-week estimate\n   - Mitigation: Parallel workstreams identified\n\n2. Technical Complexity (Low)\n   - All requirements mapped to vendor capabilities\n\n3. Compliance (Minimal)\n   - All certifications verified\n\nOverall Risk Score: 35% (Acceptable)",
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[content] || 
          "I understand your question. Let me analyze the current workflow state and provide insights. Based on the active session data, the procurement workflow is progressing normally with all agents functioning within expected parameters. Is there a specific aspect you'd like me to elaborate on?",
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
    }, 1500)
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-primary flex items-center justify-center neon-glow-blue cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
      >
        <Brain className="size-6 text-primary-foreground" />
        
        {/* Pulse animation */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[400px] h-[600px] glass-card flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Brain className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Assistant</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3" />
                    Powered by Agent Memory
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="size-8"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl p-3">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions */}
            {messages.length === 1 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      onClick={() => handleSend(question)}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-left"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about agent activities..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="glass-button"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
