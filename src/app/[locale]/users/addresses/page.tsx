"use client"

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

type Address = {
  id: string
  recipient_name: string | null
  phone: string | null
  address1: string
  address2: string | null
  city: string
  state: string
  zip: string
  country: string
  is_default: boolean
  is_valid: boolean
  created_at: string
}

export default function AddressesPage() {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    recipient_name: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    is_default: false,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/addresses')
      const data = await res.json()
      setAddresses(data.addresses ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user) load() }, [user])

  const setDefault = async (id: string) => {
    await fetch(`/api/addresses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_default' }) })
    await load()
  }

  const add = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/addresses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setForm({ recipient_name: '', phone: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'US', is_default: false })
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>
  )

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">My Addresses</h1>

      <Card className="p-6 mb-8 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Recipient Name" value={form.recipient_name} onChange={(e) => setForm(f => ({ ...f, recipient_name: e.target.value }))} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input placeholder="Address 1" value={form.address1} onChange={(e) => setForm(f => ({ ...f, address1: e.target.value }))} />
          <Input placeholder="Address 2" value={form.address2} onChange={(e) => setForm(f => ({ ...f, address2: e.target.value }))} />
          <Input placeholder="City" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
          <Input placeholder="State" value={form.state} onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))} />
          <Input placeholder="ZIP" value={form.zip} onChange={(e) => setForm(f => ({ ...f, zip: e.target.value }))} />
          <Input placeholder="Country" value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={(e) => setForm(f => ({ ...f, is_default: e.target.checked }))} /> Set as default</label>
          <Button onClick={add} disabled={saving || !form.address1 || !form.city || !form.state || !form.zip}>{saving ? 'Saving…' : 'Add Address'}</Button>
        </div>
      </Card>

      <div className="space-y-4">
        {addresses.map(a => (
          <Card key={a.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="text-sm">
                <div className="font-medium">{a.recipient_name || 'Recipient'}</div>
                <div className="whitespace-pre-line">
                  {a.address1}{a.address2 ? `\n${a.address2}` : ''}\n{a.city}, {a.state} {a.zip}{a.country ? `\n${a.country}` : ''}
                </div>
                {a.phone && <div className="text-muted-foreground">{a.phone}</div>}
              </div>
              <div className="flex items-center gap-2">
                {a.is_default ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Default</span>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setDefault(a.id)}>Set Default</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

