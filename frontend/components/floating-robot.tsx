"use client"

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { useEffect, useState } from "react"

interface FloatingRobotProps {
  isTyping?: boolean
  variant?: "oem" | "client" | "vendor"
}

export function FloatingRobot({ isTyping = false, variant = "vendor" }: FloatingRobotProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [blinking, setBlinking] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { stiffness: 100, damping: 20 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)

  const rotateX = useTransform(y, [-300, 300], [15, -15])
  const rotateY = useTransform(x, [-300, 300], [-15, 15])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      mouseX.set(e.clientX - centerX)
      mouseY.set(e.clientY - centerY)
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinking(true)
      setTimeout(() => setBlinking(false), 150)
    }, 3000 + Math.random() * 2000)

    return () => clearInterval(blinkInterval)
  }, [])

  const primaryColor = variant === "oem" ? "#ef4444" : "#3b82f6"
  const glowColor = variant === "oem" ? "neon-red" : "neon-blue"

  return (
    <motion.div
      className="fixed bottom-8 right-8 z-40 pointer-events-none"
      style={{ x, y, rotateX, rotateY }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.8 }}
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative"
      >
        {/* Robot Body */}
        <div className={`relative size-20 glass-card rounded-2xl flex items-center justify-center ${isTyping ? `neon-glow-${glowColor === 'neon-red' ? 'red' : 'blue'}` : ''}`}>
          {/* Antenna */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <div className="w-1 h-4 bg-muted-foreground rounded-full" />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
              className="size-3 rounded-full -mt-1 mx-auto"
              style={{ backgroundColor: primaryColor }}
            />
          </div>

          {/* Face */}
          <div className="flex flex-col items-center gap-2">
            {/* Eyes */}
            <div className="flex gap-3">
              <motion.div
                animate={{
                  scaleY: blinking ? 0.1 : 1,
                }}
                transition={{ duration: 0.1 }}
                className="size-3 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <motion.div
                animate={{
                  scaleY: blinking ? 0.1 : 1,
                }}
                transition={{ duration: 0.1 }}
                className="size-3 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
            </div>

            {/* Mouth */}
            <motion.div
              animate={{
                scaleX: isTyping ? [1, 1.3, 1] : 1,
              }}
              transition={{
                duration: 0.3,
                repeat: isTyping ? Infinity : 0,
              }}
              className="w-6 h-1.5 rounded-full bg-muted-foreground"
            />
          </div>

          {/* Ears */}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2">
            <div className="w-2 h-4 bg-muted rounded-l-full border border-glass-border" />
          </div>
          <div className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2">
            <div className="w-2 h-4 bg-muted rounded-r-full border border-glass-border" />
          </div>
        </div>

        {/* Speech Bubble when typing */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-10 -left-20 glass-card px-3 py-1.5 rounded-lg text-xs"
          >
            <div className="flex gap-1">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                className="size-1.5 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                className="size-1.5 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                className="size-1.5 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
