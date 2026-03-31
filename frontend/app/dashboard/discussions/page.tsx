"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Send,
  Bot,
  User,
  Loader2,
  CheckCircle2,
  CircleDot,
  AlertCircle,
  ShieldCheck,
  Building2,
  History,
  FileText,
  Paperclip,
  X,
  AlertTriangle,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  executeWorkflow,
  getWorkflowStatus,
  getAuditLogs,
  resumeWorkflow,
  approveWorkflow
} from "@/lib/api"
import { toast } from "sonner"

interface Message {
  id: string
  role: "user" | "ai"
  content: string
  type: "text" | "audit_stream" | "result" | "error"
  workflowId?: string
  data?: any
}

interface AuditLog {
  id: string
  event: string
  details: any
  timestamp: string
}

export default function DiscussionsChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "ai",
      content: "Hello! I am your Enterprise AI assistant. How can I help you today? I can help with RFP processing, vendor procurement, onboarding, and competitor intelligence.",
      type: "text"
    }
  ])
  const [inputMsg, setInputMsg] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Execution Control State
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null)
  const [workflowStatus, setWorkflowStatus] = useState<string | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [hilStatus, setHilStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // KYC Form State
  const [kycForm, setKycForm] = useState<Record<string, string>>({})
  const [isSubmittingHIL, setIsSubmittingHIL] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const auditIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, auditLogs, workflowStatus, hilStatus, scrollToBottom])

  // Polling Cleanup
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (auditIntervalRef.current) clearInterval(auditIntervalRef.current)
    pollIntervalRef.current = null
    auditIntervalRef.current = null
  }, [])

  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  // DUAL POLLING SYSTEM (Workflow Status + Audit Logs)
  const startPolling = useCallback((workflowId: string) => {
    stopPolling()

    // Status Polling Loop (2s)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await getWorkflowStatus(workflowId)
        setWorkflowStatus(status.status)
        setHilStatus(status.hil_status)

        if (status.status === "completed" || status.status === "failed") {
          stopPolling()
          handleWorkflowCompletion(status)
        } else if (status.status === "awaiting_hil") {
          stopPolling() // Stop and wait for user
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }, 2000)

    // Audit Polling Loop (1s)
    auditIntervalRef.current = setInterval(async () => {
      try {
        const logs = await getAuditLogs(workflowId)
        setAuditLogs(prev => {
          // Deduplicate by timestamp/details/event stringify
          const existingIds = new Set(prev.map(l => `${l.event}-${l.timestamp}`))
          const newLogs = logs.filter((l: any) => !existingIds.has(`${l.event}-${l.timestamp}`))
          return [...prev, ...newLogs]
        })
      } catch (err) {
        console.error("Audit polling error:", err)
      }
    }, 1000)
  }, [stopPolling])

  const handleWorkflowCompletion = (finalState: any) => {
    const results = finalState.results || {};
    let finalContent = "";
    let finalType: "text" | "result" | "error" = "result";
    let finalData = results;

    // Detect conversational/general response from the new backend short-circuit
    if (finalState.workflow_type === "conversational") {
      finalContent = results.reply || "I've completed my assessment. How else can I help you today?";
      finalType = "text";
      finalData = null;
    } else if (finalState.status === "failed") {
      finalContent = `Execution failed: ${finalState.error || 'Unknown system error'}`;
      finalType = "error";
    } else {
      finalContent = "System has completed the request. Review the execution results below:";
      finalType = "result";
    }

    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      role: "ai",
      content: finalContent,
      type: finalType,
      data: finalData,
      workflowId: finalState.id
    }])
    setCurrentWorkflowId(null)
    setWorkflowStatus(null)
  }

  const handleSend = async () => {
    if (!inputMsg.trim() && !selectedFile) return

    stopPolling()
    setAuditLogs([])
    setHilStatus(null)
    setCurrentWorkflowId(null)

    const prompt = inputMsg
    const currentSessionId = localStorage.getItem("session_id") || `sess_${Math.random().toString(36).substring(7)}`
    localStorage.setItem("session_id", currentSessionId)

    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: prompt + (selectedFile ? `\n[Attached File: ${selectedFile.name}]` : ""),
      type: "text"
    }])

    setInputMsg("")
    setSelectedFile(null)
    setIsLoading(true)

    try {
      let filePath = undefined;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("http://localhost:8000/upload", {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });

        const uploadData = await uploadRes.json();

        filePath = uploadData.file_path;

        console.log("✅ Uploaded file path:", filePath);
      }

      const res = await executeWorkflow(
        prompt,
        currentSessionId,
        filePath
      );
      setCurrentWorkflowId(res.workflow_id)
      setWorkflowStatus("running")
      startPolling(res.workflow_id)
    } catch (err: any) {
      toast.error("Execution error: " + (err.response?.data?.detail || err.message))
    } finally {
      setIsLoading(false)
    }
  }

  const handleHILSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentWorkflowId || isSubmittingHIL) return

    setIsSubmittingHIL(true)
    try {
      if (hilStatus.request?.hil_type === "approval") {
        await approveWorkflow(currentWorkflowId, kycForm["approval"] || "approve", kycForm["notes"])
      } else {
        await resumeWorkflow(currentWorkflowId, kycForm)
      }

      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        role: "user",
        content: `Submitted inputs: ${Object.keys(kycForm).filter(k => k !== "notes").join(", ")}`,
        type: "text"
      }])

      setHilStatus(null)
      setKycForm({})
      setWorkflowStatus("running")
      startPolling(currentWorkflowId)
    } catch (err: any) {
      toast.error("Resumption failed: " + (err.response?.data?.detail || err.message))
    } finally {
      setIsSubmittingHIL(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0])
  }

  const removeFile = () => setSelectedFile(null)

  // KEY: REPLACEMENT OF JSON RENDERING WITH PROPER STRUCTURED LISTS
  const renderValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined) return "N/A"
    if (typeof val === "string") return val
    if (typeof val === "number") return val.toString()
    if (typeof val === "boolean") return val ? "Yes" : "No"

    if (Array.isArray(val)) {
      return (
        <div className="ml-4 mt-1 space-y-2">
          {val.slice(0, 5).map((item, idx) => (
            <div key={idx} className="flex gap-2 text-xs">
              <span className="text-primary/40">•</span>
              <div className="flex-1">{renderValue(item)}</div>
            </div>
          ))}
          {val.length > 5 && <div className="text-[10px] italic text-muted-foreground ml-4">...and {val.length - 5} others</div>}
        </div>
      )
    }

    if (typeof val === "object") {
      return (
        <div className="ml-2 border-l border-primary/10 pl-3 py-1 space-y-1">
          {Object.entries(val).map(([k, v]) => {
            // Hide internal metadata and the chat reply from the structured cards
            if (["id", "status", "type", "workflow_id", "reply"].includes(k.toLowerCase())) return null
            return (
              <div key={k} className="text-xs">
                <span className="font-semibold text-primary/70 mr-1 capitalize">{k.replace(/_/g, " ")}:</span>
                {renderValue(v)}
              </div>
            )
          })}
        </div>
      )
    }

    return String(val)
  }

  const renderResult = (data: any) => {
    if (!data) return null
    if (typeof data === "string") return <p className="text-sm">{data}</p>

    // Filter out internal results like email_config if they leaked
    const visibleTasks = Object.entries(data).filter(([k]) => !["email_config", "reply"].includes(k))
    if (visibleTasks.length === 0) return null

    return (
      <div className="space-y-4">
        {visibleTasks.map(([taskId, taskData]) => (
          <div key={taskId} className="p-4 border border-primary/20 rounded-2xl bg-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-1.5 rounded-full bg-primary" />
              <div className="text-[10px] uppercase font-bold tracking-widest text-primary/80">
                {taskId.replace(/_/g, " ").toUpperCase()}
              </div>
            </div>

            <div className="space-y-2">
              {renderValue(taskData)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative glass-card overflow-hidden">

      {/* Header */}
      <div className="flex-none p-4 border-b border-border/50 flex justify-between items-center bg-background/50 backdrop-blur-md z-10 shadow-sm px-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <Bot className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold tracking-tight">Enterprise Orchestrator</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                    currentWorkflowId ? "animate-ping bg-neon-green" : "bg-neon-cyan"
                  )}></span>
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    currentWorkflowId ? "bg-neon-green" : "bg-neon-cyan"
                  )}></span>
                </span>
                {currentWorkflowId ? "Processing Workflow..." : "Agent Ready"}
              </span>
            </div>
          </div>
        </div>

        {auditLogs.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/10 text-primary">
                <History className="size-4" />
                Execution Audit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl glass-card border-primary/20">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  Workflow Execution Trace
                </DialogTitle>
                <DialogDescription>
                  Full audit trail of reasoning steps, tool invocations, and decisions.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 mt-4 font-mono text-xs">
                {auditLogs.map((log, i) => (
                  <div key={i} className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-semibold text-primary">{log.event.toUpperCase()}</div>
                      <div className="text-muted-foreground opacity-60">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </div>
                    {log.details && (
                      <pre className="text-muted-foreground whitespace-pre-wrap bg-muted/20 p-2 rounded">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth overflow-x-hidden">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex flex-col gap-4 max-w-4xl mx-auto",
              msg.role === "user" ? "items-end" : "items-start"
            )}
          >
            <div className={cn(
              "flex gap-4 w-full",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "flex-none size-9 rounded-xl flex items-center justify-center mt-1 border shadow-sm",
                msg.role === "user" ? "bg-muted border-border" : "bg-primary/10 border-primary/30 text-primary"
              )}>
                {msg.role === "user" ? <User className="size-5" /> : <Bot className="size-5" />}
              </div>

              <div className={cn(
                "flex-1 space-y-2",
                msg.role === "user" ? "text-right" : "text-left"
              )}>
                <div className={cn(
                  "inline-block rounded-2xl px-6 py-4 shadow-sm max-w-[90%]",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground text-left"
                    : "bg-background/80 glass-card text-foreground border border-white/5"
                )}>
                  {msg.type === "result" ? renderResult(msg.data) : msg.content}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Audit Log Stream (Inline) */}
        {auditLogs.length > 0 && currentWorkflowId && (
          <div className="max-w-4xl mx-auto w-full flex">
            <div className="size-9 mr-4 flex-none hidden sm:block" />
            <div className="flex-1 max-w-[90%] glass-card bg-primary/5 p-6 rounded-2xl border border-primary/20 space-y-4 shadow-inner">
              <div className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em] flex items-center gap-3 mb-2">
                <Loader2 className="size-3 animate-spin" />
                Execution Reasoning Stream
              </div>
              <div className="space-y-3 font-mono text-[11px] text-muted-foreground">
                {auditLogs.slice(-4).map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 border-l border-primary/20 pl-3"
                  >
                    <span className="text-primary opacity-50">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="text-foreground/80">{log.event.replace(/_/g, ' ')}</span>
                  </motion.div>
                ))}
                {workflowStatus === "running" && (
                  <div className="flex items-center gap-2 text-primary animate-pulse">
                    <CircleDot className="size-3" />
                    Thinking...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HIL Interaction Area */}
        <AnimatePresence>
          {hilStatus && hilStatus.required && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto w-full flex gap-4"
            >
              <div className="size-9 flex-none hidden sm:block" />
              <div className="flex-1 max-w-[90%] glass-card border-neon-amber/50 bg-neon-amber/5 p-8 rounded-3xl shadow-xl shadow-neon-amber/5">
                <div className="flex items-center gap-3 text-neon-amber font-bold mb-4">
                  <AlertTriangle className="size-6" />
                  <span className="tracking-tight">Human-In-The-Loop Required</span>
                </div>

                <div className="mb-6 p-4 rounded-xl bg-background/50 border border-neon-amber/20 text-sm leading-relaxed text-foreground/90">
                  {hilStatus.request?.message}
                </div>

                <form onSubmit={handleHILSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {Object.entries(hilStatus.request?.required_fields || {}).map(([key, desc]) => (
                      <div key={key} className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{desc as string}</Label>
                        {key === "approval" ? (
                          <div className="flex gap-4">
                            <Button
                              type="button"
                              className="flex-1 neon-glow-green"
                              onClick={() => setKycForm(p => ({ ...p, approval: "approve" }))}
                              variant={kycForm["approval"] === "approve" ? "default" : "outline"}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              className="flex-1 neon-glow-red"
                              onClick={() => setKycForm(p => ({ ...p, approval: "reject" }))}
                              variant={kycForm["approval"] === "reject" ? "default" : "outline"}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Input
                            placeholder={`Enter ${key}...`}
                            required
                            className="bg-background/80 border-white/10 h-12 focus-visible:ring-neon-amber"
                            value={kycForm[key] || ""}
                            onChange={e => setKycForm(p => ({ ...p, [key]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmittingHIL}
                    className="w-full bg-neon-amber hover:bg-neon-amber/90 text-black font-bold h-12 shadow-lg shadow-neon-amber/20"
                  >
                    {isSubmittingHIL ? <Loader2 className="size-5 animate-spin" /> : "Resume Execution Protocol"}
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 md:px-8 md:pb-8 md:pt-4 bg-background z-20">
        <div className="max-w-4xl mx-auto">
          {selectedFile && (
            <div className="mb-3 flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-xl w-fit">
              <FileText className="size-4 text-primary" />
              <span className="text-xs font-medium max-w-[200px] truncate">{selectedFile.name}</span>
              <button onClick={removeFile} className="hover:bg-primary/20 p-1 rounded-full transition-colors">
                <X className="size-3" />
              </button>
            </div>
          )}

          <div className="relative flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={currentWorkflowId ? "Agent is busy..." : "Ask your Agent... (e.g., 'Analyze this RFP')"}
                className="pr-20 py-8 rounded-2xl glass-card text-base bg-muted/40 border-border/50 shadow-inner focus-visible:ring-1 focus-visible:ring-primary/40 h-16"
                disabled={!!currentWorkflowId}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-xl hover:bg-primary/10 text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!currentWorkflowId}
                >
                  <Paperclip className="size-5" />
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={(!inputMsg.trim() && !selectedFile) || !!currentWorkflowId || isLoading}
                  className="size-10 rounded-xl neon-glow-blue"
                  size="icon"
                >
                  {isLoading ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5 ml-0.5" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 opacity-40">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck className="size-3" />
              Secure Protocol
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
              <Building2 className="size-3" />
              Enterprise Validated
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
              <Info className="size-3" />
              Auto-archived
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
