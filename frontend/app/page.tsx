"use client"

import { motion } from "framer-motion"
import { ArrowRight, Cpu, Shield, Zap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HeroSphere } from "@/components/hero-sphere"
import { LiveMetricsTicker } from "@/components/live-metrics-ticker"
import { TrustLayerMarquee } from "@/components/trust-layer-marquee"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card mx-4 mt-4 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Cpu className="size-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">ProcureAI</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#solutions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Solutions
            </Link>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/auth">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth">
              <Button size="sm" className="gap-2">
                Get Started <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <HeroSphere />
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 glass-button px-4 py-2 text-sm text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon-green opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-neon-green" />
              </span>
              Autonomous Procurement Intelligence
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="block"
              >
                Procurement,
              </motion.span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="block text-primary text-glow"
              >
                Reimagined
              </motion.span>
            </h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance"
            >
              AI-powered agents that analyze RFPs, negotiate with vendors, and execute 
              procurement workflows autonomously. Aligned with Viksit Bharat @ 2047.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-4 pt-4"
            >
              <Link href="/auth">
                <Button size="lg" className="gap-2 neon-glow-blue">
                  Launch Platform <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="glass-button">
                  Explore Features
                </Button>
              </Link>
            </motion.div>
          </motion.div>
          
          {/* Live Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-16"
          >
            <LiveMetricsTicker />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Intelligent Procurement Stack
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              End-to-end automation powered by specialized AI agents working in concert
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Cpu className="size-6" />,
                title: "RFP Intelligence",
                description: "Deep analysis of requirements, risk assessment, and win probability scoring",
                color: "neon-blue"
              },
              {
                icon: <Shield className="size-6" />,
                title: "Autonomous Negotiation",
                description: "AI-driven vendor negotiations with human oversight and intervention capabilities",
                color: "neon-cyan"
              },
              {
                icon: <Zap className="size-6" />,
                title: "Real-time Execution",
                description: "Live workflow tracking with self-correcting agents and audit trails",
                color: "neon-green"
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-8 group hover:border-primary/50 transition-all duration-300"
              >
                <div className={`size-12 rounded-xl bg-${feature.color}/10 flex items-center justify-center text-${feature.color} mb-6 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Layer */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-2">Trusted by Industry Leaders</h2>
            <p className="text-muted-foreground">
              Powering procurement excellence across sectors
            </p>
          </motion.div>
          
          <TrustLayerMarquee />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Transform Your Procurement?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Join leading organizations leveraging autonomous AI for 
                intelligent procurement decisions.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/auth?type=oem">
                  <Button size="lg" className="gap-2 bg-neon-red hover:bg-neon-red/90 text-white">
                    OEM Portal <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/auth?type=client">
                  <Button size="lg" className="gap-2">
                    Client Portal <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded bg-primary flex items-center justify-center">
              <Cpu className="size-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">ProcureAI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Autonomous Procurement Intelligence Platform
          </p>
        </div>
      </footer>
    </div>
  )
}
