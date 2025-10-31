"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "destructive" | "success" | "warning"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const styles =
    variant === "destructive"
      ? "border-fire-500/30 bg-fire-500/20 text-fire-400"
      : variant === "success"
      ? "border-tacticalGreen-500/30 bg-tacticalGreen-500/20 text-tacticalGreen-400"
      : variant === "warning"
      ? "border-warning-500/30 bg-warning-500/20 text-warning-400"
      : "border-dark-700 bg-dark-800 text-tactical-300"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        styles,
        className
      )}
      {...props}
    />
  )
}
