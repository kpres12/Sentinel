1|'use client'
2|
3|import React, { createContext, useContext, useMemo, useState } from 'react'
4|
5|type Toast = {
6|  id: string
7|  title: string
8|  description?: string
9|  variant?: 'success' | 'error' | 'info'
10|}
11|
12|type ToastContextValue = {
13|  show: (t: Omit<Toast, 'id'>) => void
14|}
15|
16|const ToastContext = createContext<ToastContextValue | null>(null)
17|
18|export function useToast() {
19|  const ctx = useContext(ToastContext)
20|  if (!ctx) throw new Error('useToast must be used within ToastProvider')
21|  return ctx
22|}
23|
24|export function ToastProvider({ children }: { children: React.ReactNode }) {
25|  const [toasts, setToasts] = useState<Toast[]>([])
26|
27|  const show = (t: Omit<Toast, 'id'>) => {
28|    const id = Math.random().toString(36).slice(2)
29|    const toast: Toast = { id, ...t }
30|    setToasts((prev) => [...prev, toast])
31|    setTimeout(() => {
32|      setToasts((prev) => prev.filter((x) => x.id !== id))
33|    }, 3500)
34|  }
35|
36|  const value = useMemo(() => ({ show }), [])
37|
38|  return (
39|    <ToastContext.Provider value={value}>
40|      {children}
41|      <div className="fixed top-4 right-4 z-[9999] space-y-2">
42|        {toasts.map((t) => (
43|          <div
44|            key={t.id}
45|            className={`min-w-[240px] max-w-[360px] rounded-lg border px-3 py-2 shadow-lg backdrop-blur bg-dark-900/90 ${
46|              t.variant === 'success'
47|                ? 'border-tacticalGreen-500/30'
48|                : t.variant === 'error'
49|                ? 'border-fire-500/30'
50|                : 'border-dark-700'
51|            }`}
52|          >
53|            <div className="text-sm font-mono text-tactical-300">{t.title}</div>
54|            {t.description && (
55|              <div className="text-xs font-mono text-tactical-muted mt-0.5">{t.description}</div>
56|            )}
57|          </div>
58|        ))}
59|      </div>
60|    </ToastContext.Provider>
61|  )
62|}
