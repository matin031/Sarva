"use client"

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { useInView, useMotionValue, useSpring } from "motion/react"

import { cn } from "@/lib/cn"
import { useReducedMotion } from "@/lib/perf/use-perf"

/**
 * Magic UI — Number Ticker. Source: https://magicui.design/r/number-ticker
 *
 * دو تغییر نسبت به اصل: ارقام فارسی (`fa-IR`) به‌جای `en-US`، و رندرِ اول
 * خودِ عدد نهایی است و نه صفر — تا HTMLِ سرور و کاربرِ reduced-motion عددِ
 * درست را ببینند و انیمیشن فقط روی کلاینت از صفر شروع شود.
 */
const fmt = (n: number, d: number) =>
  new Intl.NumberFormat("fa-IR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  delay?: number
  decimalPlaces?: number
}

export function NumberTicker({ value, delay = 0, className, decimalPlaces = 0, ...props }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  useEffect(() => {
    if (reduced || !isInView) return
    if (ref.current) ref.current.textContent = fmt(0, decimalPlaces)
    const timer = setTimeout(() => motionValue.set(value), delay * 1000)
    return () => clearTimeout(timer)
  }, [motionValue, isInView, delay, value, reduced, decimalPlaces])

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) ref.current.textContent = fmt(Number(latest.toFixed(decimalPlaces)), decimalPlaces)
      }),
    [springValue, decimalPlaces]
  )

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)} {...props}>
      {fmt(value, decimalPlaces)}
    </span>
  )
}
