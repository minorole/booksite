"use client";

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Message } from '@/lib/admin/types'
import { ERROR_MESSAGES, LOADING_MESSAGES, type UILanguage, mapUnknownError } from '@/lib/admin/i18n'
import { useImageUpload } from './useImageUpload'

type AnalysisState = {
  imageUrl: string | null
  confirmedInfo?: unknown
}

export function useChatSession(language: UILanguage = 'en', opts?: { onToolResult?: (evt: import('@/lib/admin/types/events').SSEEvent) => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingKey, setLoadingKey] = useState<keyof typeof LOADING_MESSAGES['en'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisState>({ imageUrl: null })
  const [steps, setSteps] = useState<Array<{ id: string; name: string; status: 'running' | 'done' | 'error'; summary?: string }>>([])
  const { upload, loading: uploadLoading, error: uploadError, setError: setUploadError } = useImageUpload(language)

  useEffect(() => {
    if (uploadError) setError(uploadError)
  }, [uploadError])

  const streamOrchestrated = useCallback(async (payload: { messages: Message[] }) => {
    setLoading(true)
    setError(null)
    setLoadingKey('processing')
    const ac = new AbortController()
    abortRef.current = ac
    try {
      const res = await fetch('/api/admin/ai-chat/stream/orchestrated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload.messages, uiLanguage: language }),
        signal: ac.signal,
      })
      if (!res.ok || !res.body) throw new Error(ERROR_MESSAGES[language].network_error)

      // Create an assistant message placeholder
      let assistantIndex: number | null = null
      let haveAssistant = false
      setMessages((prev) => {
        assistantIndex = prev.length
        return [...prev, { role: 'assistant', content: '' }]
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const line = raw.trim()
          if (!line.startsWith('data:')) continue
          const json = line.slice(5).trim()
          if (!json) continue
          try {
            const evt = JSON.parse(json)
            switch (evt.type) {
              case 'assistant_delta': {
                const delta = evt.content
                if (typeof delta === 'string' && assistantIndex !== null) {
                  haveAssistant = true
                  setMessages((prev) => {
                    const next = [...prev]
                    const current = next[assistantIndex!]
                    const content = (typeof current.content === 'string' ? current.content : '') + delta
                    next[assistantIndex!] = { ...current, content }
                    return next
                  })
                }
                break
              }
              case 'handoff': {
                const target = (evt?.to as string) || 'agent'
                setSteps((prev) => [
                  ...prev,
                  { id: `handoff:${Date.now()}:${target}` , name: `handoff:${target}`, status: 'done' }
                ])
                break
              }
              case 'assistant_done': {
                if (!haveAssistant && assistantIndex !== null) {
                  // Remove empty placeholder
                  setMessages((prev) => prev.slice(0, -1))
                }
                break
              }
              case 'tool_start': {
                setSteps((prev) => [...prev, { id: evt.id, name: evt.name, status: 'running' }])
                break
              }
              case 'tool_result': {
                setSteps((prev) => prev.map((s) => (s.id === evt.id ? { ...s, status: evt.success ? 'done' : 'error' } : s)))
                opts?.onToolResult?.(evt)
                break
              }
              case 'tool_append': {
                const msg = evt.message as Message
                setMessages((prev) => [...prev, msg])
                break
              }
              default:
                break
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(mapUnknownError(language, err))
    } finally {
      setLoading(false)
      setLoadingKey(null)
    }
  }, [language])

  const sendText = useCallback(async () => {
    if (!input.trim() || loading) return
    const user: Message = { role: 'user', content: input }
    const nextMessages = [...messages, user]
    setMessages((prev) => [...prev, user])
    setInput('')
    await streamOrchestrated({ messages: nextMessages })
  }, [input, loading, messages, streamOrchestrated])

  const attachImage = useCallback(
    async (file: File) => {
      setLoadingKey('uploading')
      const url = await upload(file)
      if (!url) return
      setAnalysis({ imageUrl: url })
      setLoadingKey('analyzing')
      const imageMessage: Message = {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url } },
          { type: 'text', text: 'Please analyze this book cover image.' },
        ],
      }
      const nextMessages = [...messages, imageMessage]
      setMessages((prev) => [...prev, imageMessage])
      await streamOrchestrated({ messages: nextMessages })
    },
    [upload, messages, streamOrchestrated]
  )

  const confirmAnalysis = useCallback(
    async (confirmedInfo: unknown) => {
      if (!analysis.imageUrl) return
      const user: Message = { role: 'user', content: `Yes, the information is correct. Confirmed info: ${JSON.stringify(confirmedInfo)}. Please proceed with the structured analysis using this confirmed information.` }
      const nextMessages = [...messages, user]
      setMessages((prev) => [...prev, user])
      await streamOrchestrated({ messages: nextMessages })
      setAnalysis((prev) => ({ ...prev, confirmedInfo }))
    },
    [analysis.imageUrl, messages, streamOrchestrated]
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setInput('')
    setError(null)
    setUploadError(null)
    setAnalysis({ imageUrl: null })
  }, [setUploadError])

  return {
    language,
    messages,
    input,
    setInput,
    loading: loading || uploadLoading,
    error,
    setError,
    loadingLabel: loadingKey ? LOADING_MESSAGES[language][loadingKey] : null,
    steps,
    sendText,
    attachImage,
    confirmAnalysis,
    reset,
  }
}
