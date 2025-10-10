'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WildfireMap } from '@/components/map/WildfireMap'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { StatusPanel } from '@/components/panels/StatusPanel'
import { AlertsPanel } from '@/components/panels/AlertsPanel'
import { DevicesPanel } from '@/components/panels/DevicesPanel'

const queryClient = new QueryClient()

export default function HomePage() {
  const [activePanel, setActivePanel] = useState<string>('status')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const panels = {
    status: <StatusPanel />,
    alerts: <AlertsPanel />,
    devices: <DevicesPanel />,
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex flex-col">
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            open={sidebarOpen}
          />
          
          <div className="flex-1 flex flex-col">
            <div className="flex-1 relative">
              <WildfireMap />
            </div>
            
            <div className="h-64 border-t bg-white">
              {panels[activePanel as keyof typeof panels]}
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  )
}
