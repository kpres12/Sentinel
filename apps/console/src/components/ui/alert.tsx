"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 bg-dark-900 border-dark-700 text-tactical-300",
        className
      )}
      {...props}
    />
  )
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-xs font-mono text-tactical-muted", className)} {...props} />
}
