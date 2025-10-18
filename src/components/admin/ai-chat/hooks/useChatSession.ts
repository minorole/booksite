"use client";

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Message } from '@/lib/admin/types'
import { ERROR_MESSAGES, LOADING_MESSAGES, type UILanguage, mapUnknownError } from '@/lib/admin/i18n'
import { useImageUpload } from './useImageUpload'
import { parseSSEEvent, type SSEEvent } from '@/lib/admin/types/events'
import { ADMIN_AI_IMAGE_HINT } from '@/lib/admin/constants'

export function useChatSession(
  language: UILanguage = 'en',
  opts?: {
    onToolResult?: (evt: SSEEvent) => void
    onRequestId?: (id: string | null) => void
  }
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingKey, setLoadingKey] = useState<keyof typeof LOADING_MESSAGES['en'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
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

      // Capture request id from header for observability
      const headerReqId = res.headers.get('X-Request-ID')
      if (headerReqId) opts?.onRequestId?.(headerReqId)

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

      // Find next SSE boundary among common variants (\n\n, \r\n\r\n, \r\r)
      const findBoundary = (s: string): { idx: number; sepLen: number } => {
        const seps = ['\r\n\r\n', '\n\n', '\r\r']
        for (const sep of seps) {
          const i = s.indexOf(sep)
          if (i !== -1) return { idx: i, sepLen: sep.length }
        }
        return { idx: -1, sepLen: 0 }
      }

      const processBlock = (raw: string) => {
        const lines = raw.split(/\r?\n/)
        for (const ln of lines) {
          const line = ln.trim()
          if (!line.startsWith('data:')) continue
          const json = line.slice(5).trim()
          if (!json) continue
          try {
            const evt = parseSSEEvent(json)
            if (!evt) continue
            if (evt.request_id) opts?.onRequestId?.(evt.request_id)
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
                  { id: `handoff:${Date.now()}:${target}`, name: `handoff:${target}`, status: 'done' },
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
              case 'error': {
                // Surface server-side error events to the user
                // This helps diagnose cases where no assistant/tool output appears
                setError(
                  typeof (evt as any).message === 'string'
                    ? ((evt as any).message as string)
                    : ERROR_MESSAGES[language].unknown_error
                )
                if (!haveAssistant && assistantIndex !== null) {
                  // Remove empty placeholder on error when nothing streamed
                  setMessages((prev) => prev.slice(0, -1))
                }
                break
              }
              case 'tool_start': {
                setSteps((prev) => [...prev, { id: evt.id, name: evt.name, status: 'running' }])
                break
              }
              case 'tool_result': {
                setSteps((prev) =>
                  prev.map((s) => (s.id === evt.id ? { ...s, status: evt.success ? 'done' : 'error' } : s))
                )
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
          } catch {
            // ignore parse errors for partial lines
          }
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          // Flush decoder and process any remaining buffered block(s)
          buffer += decoder.decode()
          // Process all full blocks
          while (true) {
            const { idx, sepLen } = findBoundary(buffer)
            if (idx === -1) break
            const raw = buffer.slice(0, idx)
            buffer = buffer.slice(idx + sepLen)
            processBlock(raw)
          }
          // Process trailing data without a final boundary, if any
          if (buffer.trim().length > 0) {
            processBlock(buffer)
            buffer = ''
          }
          break
        }
        buffer += decoder.decode(value, { stream: true })
        // Drain available complete blocks
        while (true) {
          const { idx, sepLen } = findBoundary(buffer)
          if (idx === -1) break
          const raw = buffer.slice(0, idx)
          buffer = buffer.slice(idx + sepLen)
          processBlock(raw)
        }
      }
    } catch (err) {
      setError(mapUnknownError(language, err))
    } finally {
      setLoading(false)
      setLoadingKey(null)
    }
  }, [language, opts])

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
      const imageMessage: Message = {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url } },
        ],
      }
      const nextMessages = [...messages, imageMessage]
      setMessages((prev) => [...prev, imageMessage])

      // Never auto-send; give a helpful hint in the input
      setLoadingKey(null)
      // Only replace input if it is empty to avoid overwriting user's draft
      setInput((prev) => (prev && prev.trim().length > 0 ? prev : ADMIN_AI_IMAGE_HINT[language]))
    },
    [upload, messages, language]
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setInput('')
    setError(null)
    setUploadError(null)
    setSteps([])
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
    reset,
  }
}
