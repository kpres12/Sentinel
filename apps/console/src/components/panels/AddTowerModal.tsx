'use client'

import * as Dialog from '@radix-ui/react-dialog'
import React, { useState } from 'react'
import { summitClient } from '../../lib/summitClient'
import { assetStore } from '../../store/assetStore'

export function AddTowerModal() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    id: '',
    pubkey: '',
    fw_version: '1.0.0',
    lat: '',
    lon: '',
    elev_m: '',
    capabilities: 'THERMAL,EO',
    comm: 'LTE'
  })
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await summitClient.registerNode({
        id: form.id,
        type: 'TOWER',
        pubkey: form.pubkey,
        fw_version: form.fw_version,
        location: { lat: Number(form.lat), lon: Number(form.lon), elev_m: form.elev_m ? Number(form.elev_m) : undefined },
        capabilities: form.capabilities.split(',').map(s => s.trim()).filter(Boolean),
        comm: form.comm.split(',').map(s => s.trim()).filter(Boolean)
      })
      // Fetch coverage immediately
      try {
        const cov = await summitClient.getCoverage()
        assetStore.setCoverage({ type: 'FeatureCollection', features: (cov as any).features || [] })
      } catch {}
      // Zoom to location
      window.dispatchEvent(new CustomEvent('zoom-to', { detail: { lat: Number(form.lat), lon: Number(form.lon), zoom: 12 } }))
      // Toast
      if (typeof window !== 'undefined') alert('Tower accepted')
      setOpen(false)
    } catch (err) {
      console.error(err)
      alert('Failed to register tower')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="px-3 py-2 rounded bg-tacticalGreen-600 text-white text-sm">Add Tower</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-dark-900 p-4 rounded w-[420px] border border-dark-700">
          <Dialog.Title className="text-lg font-mono text-tactical-300 mb-3">Register Tower</Dialog.Title>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-tactical-muted mb-1">ID</label>
              <input required value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-mono text-tactical-muted mb-1">Public Key (BASE64)</label>
              <input required value={form.pubkey} onChange={e => setForm({ ...form, pubkey: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-mono text-tactical-muted mb-1">Lat</label>
                <input required value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-mono text-tactical-muted mb-1">Lon</label>
                <input required value={form.lon} onChange={e => setForm({ ...form, lon: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-mono text-tactical-muted mb-1">Elev (m)</label>
                <input value={form.elev_m} onChange={e => setForm({ ...form, elev_m: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono text-tactical-muted mb-1">FW Version</label>
              <input value={form.fw_version} onChange={e => setForm({ ...form, fw_version: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-mono text-tactical-muted mb-1">Capabilities (comma)</label>
                <input value={form.capabilities} onChange={e => setForm({ ...form, capabilities: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-mono text-tactical-muted mb-1">Comm (comma)</label>
                <input value={form.comm} onChange={e => setForm({ ...form, comm: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Dialog.Close asChild>
                <button type="button" className="px-3 py-2 rounded bg-dark-800 text-tactical-300">Cancel</button>
              </Dialog.Close>
              <button disabled={submitting} type="submit" className="px-3 py-2 rounded bg-tacticalGreen-600 text-white">
                {submitting ? 'Submitting...' : 'Register'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
