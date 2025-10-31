"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "destructive"
  size?: "sm" | "md" | "lg"
}

const sizes = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-sm"
}

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  const styles =
    variant === "outline"
      ? "border border-dark-600 bg-transparent text-tactical-300 hover:bg-dark-800"
      : variant === "destructive"
      ? "border border-fire-500/30 bg-fire-500/20 text-fire-400 hover:bg-fire-500/30"
      : "border border-tactical-500/30 bg-tactical-500/20 text-tactical-400 hover:bg-tactical-500/30"

  return (
    <button
      className={cn(
        "inline-flex items-center rounded-md transition-colors",
        sizes[size],
        styles,
        className
      )}
      {...props}
    />
  )
}
