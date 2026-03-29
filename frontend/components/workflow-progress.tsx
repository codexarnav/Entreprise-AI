"use client"

import { motion } from "framer-motion"
import { Check, Loader2, AlertTriangle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface WorkflowNode {
  id: string
  name: string
  status: "pending" | "running" | "completed" | "recovered" | "failed"
  output?: string
  duration?: string
}

interface WorkflowProgressProps {
  nodes: WorkflowNode[]
  currentNode?: string
}

export function WorkflowProgress({ nodes, currentNode }: WorkflowProgressProps) {
  const getNodeColor = (status: WorkflowNode["status"]) => {
    switch (status) {
      case "completed":
        return "bg-neon-green border-neon-green"
      case "running":
        return "bg-neon-cyan border-neon-cyan animate-pulse"
      case "recovered":
        return "bg-neon-amber border-neon-amber"
      case "failed":
        return "bg-neon-red border-neon-red"
      default:
        return "bg-muted border-muted-foreground/30"
    }
  }

  const getLineColor = (index: number) => {
    const node = nodes[index]
    if (node.status === "completed" || node.status === "recovered") {
      return "bg-neon-green"
    }
    if (node.status === "running") {
      return "bg-gradient-to-r from-neon-green to-neon-cyan"
    }
    return "bg-muted"
  }

  return (
    <TooltipProvider>
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-6">Workflow Progress</h3>
        
        <div className="relative">
          {/* Progress Track */}
          <div className="absolute top-5 left-8 right-8 h-1 bg-muted rounded-full" />
          
          {/* Nodes */}
          <div className="relative flex items-start justify-between">
            {nodes.map((node, index) => (
              <div key={node.id} className="flex flex-col items-center relative z-10">
                {/* Connection Line */}
                {index < nodes.length - 1 && (
                  <motion.div
                    className={`absolute top-5 left-1/2 h-1 rounded-full ${getLineColor(index)}`}
                    initial={{ width: 0 }}
                    animate={{ 
                      width: node.status === "completed" || node.status === "recovered" ? "100%" : 
                             node.status === "running" ? "50%" : "0%"
                    }}
                    style={{ 
                      marginLeft: "20px",
                      minWidth: index < nodes.length - 1 ? "calc(100% - 40px)" : 0
                    }}
                    transition={{ duration: 0.5 }}
                  />
                )}
                
                {/* Node */}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`size-10 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${getNodeColor(node.status)} ${
                        node.status === "recovered" ? "neon-glow-amber" : 
                        node.status === "running" ? "neon-glow-cyan" : ""
                      }`}
                    >
                      {node.status === "completed" && <Check className="size-5 text-background" />}
                      {node.status === "running" && <Loader2 className="size-5 text-background animate-spin" />}
                      {node.status === "recovered" && <AlertTriangle className="size-5 text-background" />}
                      {node.status === "failed" && <span className="text-background font-bold">!</span>}
                      {node.status === "pending" && <span className="size-2 rounded-full bg-muted-foreground/50" />}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="glass-card max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{node.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{node.status}</p>
                      {node.output && (
                        <p className="text-xs text-muted-foreground">{node.output}</p>
                      )}
                      {node.duration && (
                        <p className="text-xs text-neon-cyan">Duration: {node.duration}</p>
                      )}
                      {node.status === "recovered" && (
                        <p className="text-xs text-neon-amber">Self-corrected from error</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
                
                {/* Label */}
                <div className="mt-3 text-center">
                  <p className={`text-xs font-medium ${
                    node.status === "running" ? "text-neon-cyan" :
                    node.status === "completed" ? "text-neon-green" :
                    node.status === "recovered" ? "text-neon-amber" :
                    "text-muted-foreground"
                  }`}>
                    {node.name}
                  </p>
                  {node.status === "recovered" && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-[10px] text-neon-amber mt-1"
                    >
                      Self-Correcting
                    </motion.p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
