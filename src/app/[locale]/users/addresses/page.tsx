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
  is_valid: boolean
  created_at: string
} | null

export default function AddressesPage() {
  const { user } = useAuth()
  const [address, setAddress] = useState<Address>(null)
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
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/addresses')
      const data = await res.json()
      setAddress(data.address ?? null)
      if (data.address) {
        setForm({
          recipient_name: data.address.recipient_name ?? '',
          phone: data.address.phone ?? '',
          address1: data.address.address1 ?? '',
          address2: data.address.address2 ?? '',
          city: data.address.city ?? '',
          state: data.address.state ?? '',
          zip: data.address.zip ?? '',
          country: data.address.country ?? 'US',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user) load() }, [user])

  const add = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/addresses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setForm({ recipient_name: form.recipient_name, phone: form.phone, address1: form.address1, address2: form.address2, city: form.city, state: form.state, zip: form.zip, country: form.country })
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
          <Button onClick={add} disabled={saving || !form.address1 || !form.city || !form.state || !form.zip}>{saving ? 'Saving…' : (address ? 'Save Address' : 'Add Address')}</Button>
        </div>
      </Card>

      {address && (
        <div className="text-sm text-muted-foreground">
          Current address saved on {new Date(address.created_at).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
