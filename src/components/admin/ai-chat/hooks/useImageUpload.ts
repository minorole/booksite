"use client";

import { useState } from 'react'
import { ERROR_MESSAGES, type UILanguage } from '@/lib/admin/i18n'

export function useImageUpload(language: UILanguage = 'en') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File): Promise<string | null> {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      // Route chat attachments to temporary storage for later purge
      const res = await fetch('/api/upload?temp=1', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || ERROR_MESSAGES[language].upload_failed)
      }
      const data = (await res.json()) as { url: string }
      return data.url
    } catch (e: unknown) {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : ERROR_MESSAGES[language].upload_failed
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { upload, loading, error, setError }
}
