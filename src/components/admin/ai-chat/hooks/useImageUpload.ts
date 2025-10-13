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
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || ERROR_MESSAGES[language].upload_failed)
      }
      const data = (await res.json()) as { url: string }
      return data.url
    } catch (e: any) {
      setError(e?.message || ERROR_MESSAGES[language].upload_failed)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { upload, loading, error, setError }
}

