"use client"

import { motion } from "framer-motion"

const clients = [
  { name: "TechCorp Industries", logo: "TC" },
  { name: "Global Manufacturing", logo: "GM" },
  { name: "FinanceFirst", logo: "FF" },
  { name: "DefenseGrid Systems", logo: "DG" },
  { name: "AeroSpace Dynamics", logo: "AD" },
  { name: "MedTech Solutions", logo: "MT" },
  { name: "Infrastructure Plus", logo: "IP" },
  { name: "Energy Innovations", logo: "EI" },
]

const successStories = [
  {
    title: "40% Cost Reduction",
    description: "Autonomous negotiation secured optimal pricing for defense contract",
    metric: "$2.4M saved"
  },
  {
    title: "72hr RFP Analysis",
    description: "AI agents processed 500-page technical requirements in record time",
    metric: "10x faster"
  },
  {
    title: "Perfect Compliance",
    description: "Zero flagged items across 50+ procurement cycles",
    metric: "100% score"
  },
  {
    title: "Vendor Optimization",
    description: "Identified and onboarded 15 new qualified suppliers",
    metric: "3x options"
  },
]

export function TrustLayerMarquee() {
  return (
    <div className="space-y-8">
      {/* Client Logos */}
      <div className="relative overflow-hidden py-4">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
        
        <motion.div
          className="flex gap-8"
          animate={{ x: [0, -1200] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear",
            },
          }}
        >
          {[...clients, ...clients, ...clients].map((client, index) => (
            <div
              key={`${client.name}-${index}`}
              className="glass-card flex items-center gap-3 px-6 py-3 min-w-max"
            >
              <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {client.logo}
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {client.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Success Stories */}
      <div className="relative overflow-hidden py-4">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
        
        <motion.div
          className="flex gap-6"
          animate={{ x: [-800, 0] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 25,
              ease: "linear",
            },
          }}
        >
          {[...successStories, ...successStories, ...successStories].map((story, index) => (
            <div
              key={`${story.title}-${index}`}
              className="glass-card p-5 min-w-[280px] group hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-foreground">{story.title}</h4>
                <span className="text-xs font-bold text-neon-cyan bg-neon-cyan/10 px-2 py-1 rounded">
                  {story.metric}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {story.description}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
