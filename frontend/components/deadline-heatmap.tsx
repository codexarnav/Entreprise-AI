"use client"

import { motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface HeatmapDay {
  date: string
  count: number
  deadlines: string[]
}

interface DeadlineHeatmapProps {
  data?: HeatmapDay[]
}

// Generate mock data for the last 12 weeks
function generateMockData(): HeatmapDay[] {
  const data: HeatmapDay[] = []
  
  // Use a fixed date to avoid hydration mismatches right around midnight
  const today = new Date("2024-03-29")
  
  for (let i = 83; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // Avoid Math.random() for deterministic server/client renders
    const count = (i * 17 + 5) % 8
    const deadlines = count > 0 
      ? Array.from({ length: count }, (_, j) => `RFP-${1000 + i + j}`)
      : []
    
    data.push({
      date: date.toISOString().split("T")[0],
      count,
      deadlines,
    })
  }
  
  return data
}

export function DeadlineHeatmap({ data = generateMockData() }: DeadlineHeatmapProps) {
  const getIntensityColor = (count: number) => {
    if (count === 0) return "bg-muted/20"
    if (count <= 2) return "bg-neon-cyan/30"
    if (count <= 4) return "bg-neon-cyan/50"
    if (count <= 6) return "bg-neon-cyan/70"
    return "bg-neon-cyan neon-glow-cyan"
  }

  // Group by weeks (7 days each)
  const weeks: HeatmapDay[][] = []
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7))
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <TooltipProvider>
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">RFP Deadline Heatmap</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {[0, 2, 4, 6, 8].map((level) => (
                <div
                  key={level}
                  className={`size-3 rounded-sm ${getIntensityColor(level)}`}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
        
        <div className="flex gap-4">
          {/* Day labels */}
          <div className="flex flex-col gap-1 pt-0.5">
            {days.map((day, i) => (
              <div 
                key={day} 
                className="h-3 text-[10px] text-muted-foreground flex items-center"
                style={{ visibility: i % 2 === 0 ? "visible" : "hidden" }}
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Heatmap grid */}
          <div className="flex gap-1 overflow-x-auto">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <Tooltip key={`${weekIndex}-${dayIndex}`}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (weekIndex * 7 + dayIndex) * 0.005 }}
                        className={`size-3 rounded-sm cursor-pointer transition-transform hover:scale-125 ${getIntensityColor(day.count)}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="glass-card">
                      <div className="text-xs">
                        <p className="font-medium">{day.date}</p>
                        <p className="text-muted-foreground">
                          {day.count} deadline{day.count !== 1 ? "s" : ""}
                        </p>
                        {day.deadlines.length > 0 && (
                          <div className="mt-1 text-neon-cyan">
                            {day.deadlines.slice(0, 3).join(", ")}
                            {day.deadlines.length > 3 && ` +${day.deadlines.length - 3} more`}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
