"use client"

import { useState, useRef, useEffect } from "react"
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
  FileText
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

type Role = "user" | "ai"

interface WorkflowTask {
  task_name: string
  status: "pending" | "running" | "completed"
  output?: any
}

interface Message {
  id: string
  role: Role
  content: string
  workflowId?: string
  isWorkflowStatus?: boolean
  tasks?: WorkflowTask[]
}

interface AuditLog {
  event: string
  detail: any
  timestamp: string
}

export default function DiscussionsChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "ai",
      content: "Hello! I am your Enterprise AI assistant. How can I help you manage workflows, monitor RFPs, or handle vendor communications today?",
    }
  ])
  const [inputMsg, setInputMsg] = useState("")
  
  // Mock Workflow State
  const [workflowId, setWorkflowId] = useState<string | null>(null)
  const [workflowState, setWorkflowState] = useState<"idle" | "running" | "hil_kyc" | "hil_approval" | "completed">("idle")
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  
  // KYC Form State
  const [kycForm, setKycForm] = useState({ aadhar: "", pan: "" })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, workflowState])

  const addMessage = (role: Role, content: string, isWorkflowStatus = false) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      role,
      content,
      isWorkflowStatus
    }])
  }

  const updateWorkflowTasks = (wId: string, mutator: (prev: WorkflowTask[]) => WorkflowTask[]) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === wId) {
        return { ...msg, tasks: mutator(msg.tasks || []) }
      }
      return msg
    }))
  }

  const handleSend = () => {
    if (!inputMsg.trim()) return
    
    addMessage("user", inputMsg)
    const prompt = inputMsg
    setInputMsg("")

    // Start mock workflow
    if (workflowState === "idle") {
      startMockWorkflow(prompt)
    } else {
      addMessage("ai", "A workflow is currently active. Please complete it or wait for it to finish.", true)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // MOCK BACKEND LOGIC
  const startMockWorkflow = (prompt: string) => {
    const wId = "wf-" + Math.random().toString(36).substring(7)
    setWorkflowId(wId)
    setWorkflowState("running")
    
    setMessages(prev => [...prev, {
      id: wId,
      role: "ai",
      content: `Started workflow execution to process: "${prompt}"`,
      tasks: [{ task_name: "rfp_ingestion", status: "running" }]
    }])

    setAuditLogs([
      { event: "workflow_started", detail: { prompt, session_id: "demo-session" }, timestamp: new Date().toISOString() }
    ])

    // Simulate task 1 completion and dynamically appending the next task
    setTimeout(() => {
      updateWorkflowTasks(wId, () => [
        { 
          task_name: "rfp_ingestion", 
          status: "completed", 
          output: { 
            documents_found: 4, 
            key_entities: ["TechCorp", "DataSec"],
            action: "Ingested and structured 4 specs.",
            raw_text_scan: "This is a massive block of OCR text extracted from the RFP. It contains hundreds of lines of complex details... (simulated large output to demonstrate the side canvas). It exceeds normal inline viewing and needs a dedicated panel for review."
          } 
        },
        { task_name: "vendor_pre_screening", status: "running" }
      ])
      setAuditLogs(prev => [...prev, { event: "task_completed", detail: { task: "rfp_ingestion", result: "Extracted 4 specifications" }, timestamp: new Date().toISOString() }])
      
      // Simulate HITL KYC pause
      setTimeout(() => {
        setWorkflowState("hil_kyc")
        setAuditLogs(prev => [...prev, { event: "hitl_triggered", detail: { reason: "Missing KYC details for Vendor preliminary validation" }, timestamp: new Date().toISOString() }])
        addMessage("ai", "I need some additional KYC information to proceed with the compliance checks.")
      }, 2500)
    }, 2500)
  }

  const handleResumeWorkflow = (e: React.FormEvent) => {
    e.preventDefault()
    if (!workflowId) return
    const wId = workflowId
    setWorkflowState("running")
    addMessage("user", `Provided KYC Details: Aadhar ending in ${kycForm.aadhar.slice(-4) || 'XXXX'}`)
    setAuditLogs(prev => [...prev, { event: "workflow_resumed", detail: { inputs: ["aadhar", "pan"] }, timestamp: new Date().toISOString() }])
    
    // Simulate pre_screening completion and conditionally adding risk_compliance
    setTimeout(() => {
      updateWorkflowTasks(wId, (prev) => [
        prev[0],
        { 
          task_name: "vendor_pre_screening", 
          status: "completed",
          output: "KYC verified. Identity match: 98%. Proceeding smoothly."
        },
        { task_name: "risk_compliance_analysis", status: "running" }
      ])
      setAuditLogs(prev => [...prev, { event: "task_completed", detail: { task: "vendor_pre_screening", status: "passed" }, timestamp: new Date().toISOString() }])
      
      // Simulate Analysis passing and Approval triggering
      setTimeout(() => {
        setWorkflowState("hil_approval")
        setAuditLogs(prev => [...prev, { event: "approval_required", detail: { decision: "Vendor Selection: TechCorp Inc." }, timestamp: new Date().toISOString() }])
        addMessage("ai", "Risk checks passed. Based on the evaluation metrics, I propose selecting 'TechCorp Inc.' as the primary vendor. Do you approve this selection?")
      }, 2500)
    }, 2500)
  }

  const handleApprove = (approved: boolean) => {
    if (!workflowId) return
    const wId = workflowId

    if (approved) {
      addMessage("user", "Approved vendor selection.")
      setAuditLogs(prev => [...prev, { event: "approval_granted", detail: { target: "TechCorp Inc.", notes: "Approved via dashboard inside Chat UI" }, timestamp: new Date().toISOString() }])
    } else {
      addMessage("user", "Rejected vendor selection.")
      setAuditLogs(prev => [...prev, { event: "approval_rejected", detail: { target: "TechCorp Inc.", notes: "Rejected via dashboard inside Chat UI" }, timestamp: new Date().toISOString() }])
    }
    
    setWorkflowState("running")
    
    // Simulate Finish
    setTimeout(() => {
      updateWorkflowTasks(wId, (prev) => [
        prev[0], prev[1],
        { 
          task_name: "risk_compliance_analysis", 
          status: "completed",
          output: approved ? "Risk metrics analyzed. Final selected vendor: TechCorp Inc." : "Workflow aborted by user rejection."
        }
      ])
      setWorkflowState("completed")
      setAuditLogs(prev => [...prev, { event: "workflow_completed", detail: { status: approved ? "success" : "aborted" }, timestamp: new Date().toISOString() }])
      addMessage("ai", approved ? "Workflow completed successfully. The vendor strategy has been deployed." : "Workflow halted due to rejection. Standing by.")
      
      setTimeout(() => {
        setWorkflowState("idle")
        setWorkflowId(null)
      }, 3000)
      
    }, 2000)
  }

  // Helper to determine if output should be collapsed into a side sheet
  const isLargeOutput = (output: any) => {
    if (!output) return false
    const str = typeof output === 'object' ? JSON.stringify(output) : String(output)
    return str.length > 120 || (typeof output === 'object' && Object.keys(output).length > 3)
  }

  const renderTaskOutput = (output: any, taskName: string) => {
    if (!output) return null

    if (isLargeOutput(output)) {
      return (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 mt-1 ml-7 border-primary/20 hover:bg-primary/10 text-primary">
              <FileText className="size-3" />
              View Large Output
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-xl glass-card overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>Task Output Validation</SheetTitle>
              <SheetDescription>
                Detailed output payload for: <span className="font-mono text-primary">{taskName}</span>
              </SheetDescription>
            </SheetHeader>
            <div className="bg-background/80 p-4 rounded-xl border border-border/50 font-mono text-sm whitespace-pre-wrap text-muted-foreground">
              {typeof output === 'object' ? JSON.stringify(output, null, 2) : output}
            </div>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <div className="ml-7 text-[11px] text-muted-foreground bg-black/20 p-2 rounded border border-border/50 font-mono shadow-inner text-left whitespace-pre-wrap mt-1">
        {typeof output === 'object' ? JSON.stringify(output, null, 2) : output}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative glass-card overflow-hidden">
      
      {/* Header */}
      <div className="flex-none p-4 border-b border-border/50 flex justify-between items-center bg-background/50 backdrop-blur-md z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <Bot className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold tracking-tight">Enterprise Agent Chat</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-cyan"></span>
                </span>
                Agent Online
              </span>
              {workflowState !== "idle" && (
                <Badge variant="outline" className="text-[10px] h-4 leading-none bg-primary/10 text-primary border-primary/20 ml-2">
                  {workflowState === "completed" ? "Finished" : "Workflow Active"}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {workflowId && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/10 text-primary">
                <History className="size-4" />
                Audit Logs
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl glass-card border-primary/20">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  Workflow Execution Audit
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Detailed execution logs for the complete workflow duration.
                </DialogDescription>
                <div className="text-xs text-muted-foreground">ID: {workflowId}</div>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 mt-4 font-mono text-xs">
                {auditLogs.map((log, i) => (
                  <div key={i} className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-semibold text-primary">{log.event.toUpperCase()}</div>
                      <div className="text-muted-foreground opacity-60">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <pre className="text-muted-foreground whitespace-pre-wrap overflow-x-auto bg-muted/20 p-2 rounded">
                      {JSON.stringify(log.detail, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
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
              "flex gap-4",
              msg.role === "user" ? "flex-row-reverse" : "flex-row",
              "w-full"
            )}>
              <div className={cn(
                "flex-none size-8 rounded-lg flex items-center justify-center mt-1 border",
                msg.role === "user" ? "bg-muted border-border" : "bg-primary/10 border-primary/30 text-primary"
              )}>
                {msg.role === "user" ? <User className="size-5" /> : <Bot className="size-5" />}
              </div>
              
              <div className={cn(
                 "flex-1 space-y-2",
                 msg.role === "user" ? "text-right" : "text-left"
              )}>
                <div className={cn(
                  "inline-block rounded-2xl px-5 py-3 shadow-sm max-w-[85%]",
                  msg.role === "user" 
                    ? "bg-muted/80 text-foreground text-left" 
                    : msg.isWorkflowStatus 
                      ? "bg-primary/5 text-primary border border-primary/10 font-medium text-sm"
                      : "bg-background/80 glass-card text-foreground border border-white/5"
                )}>
                  {msg.content}
                </div>
              </div>
            </div>

            {/* If the message has tasks, render them directly beneath */}
            {msg.tasks && msg.tasks.length > 0 && (
              <div className="w-full flex">
                <div className="size-8 mr-4 flex-none hidden sm:block" />
                <div className="flex-1 max-w-[85%] glass-card bg-background/40 p-5 rounded-2xl border border-primary/10 space-y-4 shadow-sm">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    {msg.tasks.some(t => t.status === "running") ? (
                      <Loader2 className="size-3 animate-spin text-primary" />
                    ) : (
                      <CheckCircle2 className="size-3 text-primary" />
                    )}
                    Execution Stream
                  </div>
                  <div className="space-y-4 text-left">
                    {msg.tasks.map((task, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-3 text-sm">
                          {task.status === "completed" && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                          {task.status === "running" && <Loader2 className="size-4 text-neon-cyan animate-spin shrink-0" />}
                          {task.status === "pending" && <CircleDot className="size-4 text-muted-foreground shrink-0" />}
                          
                          <span className={cn(
                            "font-mono text-sm",
                            task.status === "completed" && "text-foreground",
                            task.status === "running" && "text-foreground font-medium",
                            task.status === "pending" && "text-muted-foreground opacity-50",
                          )}>
                            {task.task_name}
                          </span>
                          
                          {task.status === "running" && (
                            <Badge variant="outline" className="ml-auto bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20 px-2 py-0 h-5 text-[10px]">
                              Running
                            </Badge>
                          )}
                        </div>
                        {renderTaskOutput(task.output, task.task_name)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {/* HITL: KYC Form */}
        <AnimatePresence>
          {workflowState === "hil_kyc" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto flex gap-4"
            >
               <div className="size-8 flex-none hidden sm:block" />
               <div className="flex-1 max-w-[85%] glass-card border-neon-red/30 bg-neon-red/5 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 text-neon-red font-semibold mb-6">
                    <AlertCircle className="size-5" />
                    Human-In-The-Loop: Input Required
                  </div>
                  <form onSubmit={handleResumeWorkflow} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Aadhar Number</Label>
                        <Input 
                          placeholder="1234 5678 9012" 
                          required
                          className="bg-background/80 border-white/10 focus-visible:ring-neon-red"
                          value={kycForm.aadhar}
                          onChange={e => setKycForm(p => ({ ...p, aadhar: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">PAN Number</Label>
                        <Input 
                          placeholder="ABCDE1234F" 
                          required
                          className="bg-background/80 border-white/10 uppercase focus-visible:ring-neon-red"
                          value={kycForm.pan}
                          onChange={e => setKycForm(p => ({ ...p, pan: e.target.value.toUpperCase() }))}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full sm:w-auto bg-neon-red hover:bg-neon-red/90 text-white">
                      Submit Details
                    </Button>
                  </form>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HITL: Approval */}
        <AnimatePresence>
          {workflowState === "hil_approval" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto flex gap-4"
            >
               <div className="size-8 flex-none hidden sm:block" />
               <div className="flex-1 max-w-[85%] glass-card border-primary/30 bg-primary/5 p-6 rounded-2xl shadow-lg shadow-primary/5">
                  <div className="flex items-center gap-2 text-primary font-semibold mb-3">
                    <Building2 className="size-5" />
                    System Approval Required
                  </div>
                  <p className="text-sm text-foreground/80 mb-6 leading-relaxed">
                    Review the proposed vendor selection and terms before proceeding. By approving, you authorize the agent to finalize the contract.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={() => handleApprove(true)} className="flex-1 gap-2">
                      <CheckCircle2 className="size-4" />
                      Approve & Execute
                    </Button>
                    <Button variant="outline" onClick={() => handleApprove(false)} className="flex-1 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      Reject Proposal
                    </Button>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 md:px-6 md:pb-6 md:pt-4 bg-background z-20">
        <div className="max-w-4xl mx-auto relative flex flex-col justify-end">
          <div className="relative flex items-center">
            <Input
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={workflowState === "idle" ? "Instruct the Enterprise AI Agent..." : "Agent workflow in progress..."}
              className="pr-14 py-7 rounded-2xl glass-button text-base bg-muted/30 border-border/50 shadow-sm focus-visible:ring-1 focus-visible:ring-primary/50"
              disabled={workflowState !== "idle"}
            />
            <Button 
              onClick={handleSend}
              disabled={!inputMsg.trim() || workflowState !== "idle"}
              size="icon"
              className={cn(
                "absolute right-2.5 size-10 rounded-xl transition-all",
                inputMsg.trim() && workflowState === "idle" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="size-5 mt-0.5 ml-0.5" />
            </Button>
          </div>
          <div className="text-center mt-3 text-xs text-muted-foreground/70 font-medium">
            Agents operate autonomously in the background. Use the Audit Logs to review executed steps.
          </div>
        </div>
      </div>
      
    </div>
  )
}
