"use client";

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Message } from '@/lib/admin/types'
import { ERROR_MESSAGES, LOADING_MESSAGES, type UILanguage, mapUnknownError } from '@/lib/admin/i18n'
import { useImageUpload } from './useImageUpload'
import type { SSEEvent } from '@/lib/admin/types/events'
import { ADMIN_AI_IMAGE_HINT } from '@/lib/admin/constants'
import { streamOrchestrated as sseStreamOrchestrated } from '@/lib/admin/chat/client/sse-transport'
import { createAssistantBuffer } from '@/lib/admin/chat/client/assistant-buffer'

const DEBUG_CLIENT_TRACE = !(
  process.env.NEXT_PUBLIC_ADMIN_AI_TRACE_DISABLED === '1' ||
  process.env.NEXT_PUBLIC_ADMIN_AI_TRACE_DISABLED === 'true' ||
  process.env.NEXT_PUBLIC_ADMIN_AI_TRACE === '0' ||
  process.env.NEXT_PUBLIC_ADMIN_AI_TRACE === 'false'
)

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
    // local buffering handled by helper (createAssistantBuffer)
    try {
      // Create an assistant message placeholder
      let assistantIndex: number | null = null
      let haveAssistant = false
      const buf = createAssistantBuffer()
      setMessages((prev) => {
        assistantIndex = prev.length
        return [...prev, { role: 'assistant', content: '' }]
      })
      await sseStreamOrchestrated({
        messages: payload.messages,
        uiLanguage: language,
        signal: ac.signal,
        onRequestId: (id) => id && opts?.onRequestId?.(id),
        onEvent: (evt) => {
          if (DEBUG_CLIENT_TRACE) {
            try {
              if ((evt as any).type === 'assistant_delta') {
                const t = (evt as any).content || ''
                console.debug('[AdminAI client]', { type: 'assistant_delta', req: (evt as any).request_id?.slice?.(0, 8), len: String(t).length, preview: String(t).slice(0, 80) })
              } else {
                console.debug('[AdminAI client]', { type: (evt as any).type, req: (evt as any).request_id?.slice?.(0, 8) })
              }
            } catch {}
          }
          if (evt.request_id) opts?.onRequestId?.(evt.request_id)
          switch (evt.type) {
            case 'assistant_delta': {
              const delta = evt.content
              if (typeof delta === 'string') {
                buf.push(delta)
                if (assistantIndex === null) {
                  setMessages((prev) => {
                    assistantIndex = prev.length
                    return [...prev, { role: 'assistant', content: '' }]
                  })
                }
                if (assistantIndex !== null) {
                  haveAssistant = true
                  setMessages((prev) => {
                    const next = [...prev]
                    const current = next[assistantIndex!]
                    const content = (typeof current.content === 'string' ? current.content : '') + delta
                    next[assistantIndex!] = { ...current, content }
                    return next
                  })
                }
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
              if (assistantIndex !== null) {
                setMessages((prev) => {
                  const next = [...prev]
                  const current = next[assistantIndex!]
                  const str = typeof current.content === 'string' ? current.content : ''
                  if (!haveAssistant && buf.length() === 0) {
                    next.pop()
                    return next
                  }
                  if (buf.length() > str.length) {
                    next[assistantIndex!] = { ...current, content: buf.value() }
                  }
                  return next
                })
              } else if (buf.length() > 0) {
                setMessages((prev) => [...prev, { role: 'assistant', content: buf.value() }])
              }
              break
            }
            case 'error': {
              setError(
                typeof (evt as any).message === 'string'
                  ? ((evt as any).message as string)
                  : ERROR_MESSAGES[language].unknown_error
              )
              if (!haveAssistant && assistantIndex !== null) {
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
        },
      })
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
