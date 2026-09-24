"use client"

import React, { useCallback } from "react"
import { motion, useMotionTemplate, useMotionValue } from "motion/react"

import { cn } from "@/lib/cn"

/**
 * Magic UI — Magic Card (فقط حالتِ gradient). Source: https://magicui.design/r/magic-card
 *
 * ⚠️ حالتِ `orb` و وابستگی به `next-themes` حذف شد: این پروژه تم را با کلاسِ
 * `.dark` خودش عوض می‌کند و `next-themes` نصب نیست. رنگ‌ها هم به‌جای
 * بنفش/صورتیِ پیش‌فرض از توکن‌های سایت می‌آیند، پس با کلیدِ پالت هم‌راه‌اند.
 */
export function MagicCard({
  children,
  className,
  gradientSize = 220,
  gradientColor = "color-mix(in oklch, var(--primary) 9%, transparent)",
  gradientFrom = "var(--primary)",
  gradientTo = "var(--gold)",
  ...rest
}: {
  children?: React.ReactNode
  className?: string
  gradientSize?: number
  gradientColor?: string
  gradientFrom?: string
  gradientTo?: string
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onPointerMove" | "onPointerLeave" | "style" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart">) {
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    },
    [mouseX, mouseY]
  )
  const onLeave = useCallback(() => {
    mouseX.set(-gradientSize)
    mouseY.set(-gradientSize)
  }, [mouseX, mouseY, gradientSize])

  const border = useMotionTemplate`linear-gradient(var(--card) 0 0) padding-box, radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientFrom}, ${gradientTo}, var(--border) 100%) border-box`
  const glow = useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)`

  return (
    <motion.div
      {...rest}
      className={cn("group relative isolate overflow-hidden border border-transparent", className)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ background: border }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-px z-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glow }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  )
}
