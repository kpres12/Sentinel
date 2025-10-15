1|'use client'
2|
3|import * as Dialog from '@radix-ui/react-dialog'
4|import React, { useState } from 'react'
5|import { summitClient } from '../../lib/summitClient'
6|import { assetStore } from '../../store/assetStore'
7|
8|export function AddTowerModal() {
9|  const [open, setOpen] = useState(false)
10|  const [form, setForm] = useState({
11|    id: '',
12|    pubkey: '',
13|    fw_version: '1.0.0',
14|    lat: '',
15|    lon: '',
16|    elev_m: '',
17|    capabilities: 'THERMAL,EO',
18|    comm: 'LTE'
19|  })
20|  const [submitting, setSubmitting] = useState(false)
21|
22|  const onSubmit = async (e: React.FormEvent) => {
23|    e.preventDefault()
24|    setSubmitting(true)
25|    try {
26|      await summitClient.registerNode({
27|        id: form.id,
28|        type: 'TOWER',
29|        pubkey: form.pubkey,
30|        fw_version: form.fw_version,
31|        location: { lat: Number(form.lat), lon: Number(form.lon), elev_m: form.elev_m ? Number(form.elev_m) : undefined },
32|        capabilities: form.capabilities.split(',').map(s => s.trim()).filter(Boolean),
33|        comm: form.comm.split(',').map(s => s.trim()).filter(Boolean)
34|      })
35|      // Fetch coverage immediately
36|      try {
37|        const cov = await summitClient.getCoverage()
38|        assetStore.setCoverage({ type: 'FeatureCollection', features: (cov as any).features || [] })
39|      } catch {}
40|      // Zoom to location
41|      window.dispatchEvent(new CustomEvent('zoom-to', { detail: { lat: Number(form.lat), lon: Number(form.lon), zoom: 12 } }))
42|      // Toast
43|      if (typeof window !== 'undefined') alert('Tower accepted')
44|      setOpen(false)
45|    } catch (err) {
46|      console.error(err)
47|      alert('Failed to register tower')
48|    } finally {
49|      setSubmitting(false)
50|    }
51|  }
52|
53|  return (
54|    <Dialog.Root open={open} onOpenChange={setOpen}>
55|      <Dialog.Trigger asChild>
56|        <button className="px-3 py-2 rounded bg-tacticalGreen-600 text-white text-sm">Add Tower</button>
57|      </Dialog.Trigger>
58|      <Dialog.Portal>
59|        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
60|        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-dark-900 p-4 rounded w-[420px] border border-dark-700">
61|          <Dialog.Title className="text-lg font-mono text-tactical-300 mb-3">Register Tower</Dialog.Title>
62|          <form onSubmit={onSubmit} className="space-y-3">
63|            <div>
64|              <label className="block text-xs font-mono text-tactical-muted mb-1">ID</label>
65|              <input required value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
66|            </div>
67|            <div>
68|              <label className="block text-xs font-mono text-tactical-muted mb-1">Public Key (BASE64)</label>
69|              <input required value={form.pubkey} onChange={e => setForm({ ...form, pubkey: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
70|            </div>
71|            <div className="grid grid-cols-3 gap-2">
72|              <div>
73|                <label className="block text-xs font-mono text-tactical-muted mb-1">Lat</label>
74|                <input required value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
75|              </div>
76|              <div>
77|                <label className="block text-xs font-mono text-tactical-muted mb-1">Lon</label>
78|                <input required value={form.lon} onChange={e => setForm({ ...form, lon: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
79|              </div>
80|              <div>
81|                <label className="block text-xs font-mono text-tactical-muted mb-1">Elev (m)</label>
82|                <input value={form.elev_m} onChange={e => setForm({ ...form, elev_m: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
83|              </div>
84|            </div>
85|            <div>
86|              <label className="block text-xs font-mono text-tactical-muted mb-1">FW Version</label>
87|              <input value={form.fw_version} onChange={e => setForm({ ...form, fw_version: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
88|            </div>
89|            <div className="grid grid-cols-2 gap-2">
90|              <div>
91|                <label className="block text-xs font-mono text-tactical-muted mb-1">Capabilities (comma)</label>
92|                <input value={form.capabilities} onChange={e => setForm({ ...form, capabilities: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
93|              </div>
94|              <div>
95|                <label className="block text-xs font-mono text-tactical-muted mb-1">Comm (comma)</label>
96|                <input value={form.comm} onChange={e => setForm({ ...form, comm: e.target.value })} className="w-full p-2 rounded bg-dark-800 text-tactical-200 outline-none" />
97|              </div>
98|            </div>
99|            <div className="flex justify-end gap-2 mt-2">
100|              <Dialog.Close asChild>
101|                <button type="button" className="px-3 py-2 rounded bg-dark-800 text-tactical-300">Cancel</button>
102|              </Dialog.Close>
103|              <button disabled={submitting} type="submit" className="px-3 py-2 rounded bg-tacticalGreen-600 text-white">
104|                {submitting ? 'Submitting...' : 'Register'}
105|              </button>
106|            </div>
107|          </form>
108|        </Dialog.Content>
109|      </Dialog.Portal>
110|    </Dialog.Root>
111|  )
112|}
