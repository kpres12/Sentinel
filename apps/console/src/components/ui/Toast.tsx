'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'

type Toast = {
  id: string
  title: string
  description?: string
  variant?: 'success' | 'error' | 'info'
}

type ToastContextValue = {
  show: (t: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = (t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const toast: Toast = { id, ...t }
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 3500)
  }

  const value = useMemo(() => ({ show }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-[240px] max-w-[360px] rounded-lg border px-3 py-2 shadow-lg backdrop-blur bg-dark-900/90 ${
              t.variant === 'success'
                ? 'border-tacticalGreen-500/30'
                : t.variant === 'error'
                ? 'border-fire-500/30'
                : 'border-dark-700'
            }`}
          >
            <div className="text-sm font-mono text-tactical-300">{t.title}</div>
            {t.description && (
              <div className="text-xs font-mono text-tactical-muted mt-0.5">{t.description}</div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
