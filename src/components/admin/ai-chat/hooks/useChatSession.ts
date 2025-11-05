'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '@/lib/admin/types';
import {
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  type UILanguage,
  mapUnknownError,
} from '@/lib/admin/i18n';
import { useImageUpload } from './useImageUpload';
import type { SSEEvent } from '@/lib/admin/types/events';
import { ADMIN_AI_IMAGE_HINT } from '@/lib/admin/constants';
import { streamOrchestrated as sseStreamOrchestrated } from '@/lib/admin/chat/client/sse-transport';
import { createAssistantBuffer } from '@/lib/admin/chat/client/assistant-buffer';

const DEBUG_CLIENT_TRACE = !(
  process.env.NEXT_PUBLIC_ADMIN_AI_TRACE_DISABLED === '1' ||
  process.env.NEXT_PUBLIC_ADMIN_AI_TRACE_DISABLED === 'true' ||
  process.env.NEXT_PUBLIC_ADMIN_AI_TRACE === '0' ||
  process.env.NEXT_PUBLIC_ADMIN_AI_TRACE === 'false'
);

export function useChatSession(
  language: UILanguage = 'en',
  opts?: {
    onToolResult?: (evt: SSEEvent) => void;
    onRequestId?: (id: string | null) => void;
  },
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState<keyof (typeof LOADING_MESSAGES)['en'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thinkingAgent, setThinkingAgent] = useState<string | null>(null);
  const [inflightTools, setInflightTools] = useState<Message[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const [steps, setSteps] = useState<
    Array<{ id: string; name: string; status: 'running' | 'done' | 'error'; summary?: string }>
  >([]);
  const [inputPlaceholder, setInputPlaceholder] = useState<string | null>(null);
  const {
    upload,
    loading: uploadLoading,
    error: uploadError,
    setError: setUploadError,
  } = useImageUpload(language);

  useEffect(() => {
    if (uploadError) setError(uploadError);
  }, [uploadError]);

  // Draft persistence (per UI language)
  useEffect(() => {
    try {
      const key = `admin-ai-input-draft:${language}`;
      const saved = localStorage.getItem(key);
      if (saved && messages.length === 0) setInput(saved);
    } catch {}
  }, [language]);

  useEffect(() => {
    try {
      const key = `admin-ai-input-draft:${language}`;
      localStorage.setItem(key, input);
    } catch {}
  }, [input, language]);

  const streamOrchestrated = useCallback(
    async (payload: { messages: Message[] }) => {
      setLoading(true);
      setError(null);
      setLoadingKey('processing');
      const ac = new AbortController();
      abortRef.current = ac;
      // local buffering handled by helper (createAssistantBuffer)
      try {
        // Create an assistant message placeholder
        let assistantIndex: number | null = null;
        let haveAssistant = false;
        const buf = createAssistantBuffer();
        setMessages((prev) => {
          assistantIndex = prev.length;
          return [...prev, { role: 'assistant', content: '' }];
        });
        await sseStreamOrchestrated({
          messages: payload.messages,
          uiLanguage: language,
          signal: ac.signal,
          onRequestId: (id) => id && opts?.onRequestId?.(id),
          onEvent: (evt) => {
            if (DEBUG_CLIENT_TRACE) {
              try {
                if ((evt as any).type === 'assistant_delta') {
                  const t = (evt as any).content || '';
                  console.debug('[AdminAI client]', {
                    type: 'assistant_delta',
                    req: (evt as any).request_id?.slice?.(0, 8),
                    len: String(t).length,
                    preview: String(t).slice(0, 80),
                  });
                } else if (
                  (evt as any).type === 'tool_start' ||
                  (evt as any).type === 'tool_result' ||
                  (evt as any).type === 'tool_append'
                ) {
                  console.debug('[AdminAI client]', {
                    type: (evt as any).type,
                    name: (evt as any).name || (evt as any).message?.name,
                    id: (evt as any).id || (evt as any).message?.tool_call_id,
                    req: (evt as any).request_id?.slice?.(0, 8),
                  });
                } else {
                  console.debug('[AdminAI client]', {
                    type: (evt as any).type,
                    req: (evt as any).request_id?.slice?.(0, 8),
                  });
                }
              } catch {}
            }
            if (evt.request_id) opts?.onRequestId?.(evt.request_id);
            switch (evt.type) {
              case 'assistant_delta': {
                const delta = evt.content;
                if (typeof delta === 'string') {
                  buf.push(delta);
                  if (assistantIndex === null) {
                    setMessages((prev) => {
                      assistantIndex = prev.length;
                      return [...prev, { role: 'assistant', content: '' }];
                    });
                  }
                  if (assistantIndex !== null) {
                    haveAssistant = true;
                    setMessages((prev) => {
                      const next = [...prev];
                      const current = next[assistantIndex!];
                      const content =
                        (typeof current.content === 'string' ? current.content : '') + delta;
                      next[assistantIndex!] = { ...current, content };
                      return next;
                    });
                  }
                }
                break;
              }
              case 'handoff': {
                const target = (evt?.to as string) || 'agent';
                // Track current agent for inline thinking indicator
                setThinkingAgent(target);
                // Reset diagnostic details for the next agent
                setInflightTools([]);
                setSteps((prev) => [
                  ...prev,
                  {
                    id: `handoff:${Date.now()}:${target}`,
                    name: `handoff:${target}`,
                    status: 'done',
                  },
                ]);
                break;
              }
              case 'assistant_done': {
                if (assistantIndex !== null) {
                  setMessages((prev) => {
                    const next = [...prev];
                    const current = next[assistantIndex!];
                    const str = typeof current.content === 'string' ? current.content : '';
                    if (!haveAssistant && buf.length() === 0) {
                      next.pop();
                      return next;
                    }
                    if (buf.length() > str.length) {
                      next[assistantIndex!] = { ...current, content: buf.value() };
                    }
                    return next;
                  });
                } else if (buf.length() > 0) {
                  setMessages((prev) => [...prev, { role: 'assistant', content: buf.value() }]);
                }
                // Clear thinking indicator when assistant is done
                setThinkingAgent(null);
                setInflightTools([]);
                break;
              }
              case 'error': {
                setError(
                  typeof (evt as any).message === 'string'
                    ? ((evt as any).message as string)
                    : ERROR_MESSAGES[language].unknown_error,
                );
                if (!haveAssistant && assistantIndex !== null) {
                  setMessages((prev) => prev.slice(0, -1));
                }
                // Clear thinking indicator on error
                setThinkingAgent(null);
                setInflightTools([]);
                break;
              }
              case 'tool_start': {
                setSteps((prev) => [...prev, { id: evt.id, name: evt.name, status: 'running' }]);
                break;
              }
              case 'tool_result': {
                setSteps((prev) =>
                  prev.map((s) =>
                    s.id === evt.id ? { ...s, status: evt.success ? 'done' : 'error' } : s,
                  ),
                );
                opts?.onToolResult?.(evt);
                break;
              }
              case 'tool_append': {
                const msg = evt.message as Message;
                const name = (msg && (msg as any).name) as string | undefined;
                const DIAGNOSTIC_TOOLS = new Set([
                  'analyze_book_cover',
                  'analyze_item_photo',
                  'check_duplicates',
                  'search_books',
                ]);
                if (name && DIAGNOSTIC_TOOLS.has(name)) {
                  setInflightTools((prev) => [...prev, msg]);
                } else {
                  setMessages((prev) => [...prev, msg]);
                }
                break;
              }
              default:
                break;
            }
          },
        });
      } catch (err) {
        setError(mapUnknownError(language, err));
      } finally {
        setLoading(false);
        setLoadingKey(null);
      }
    },
    [language, opts],
  );

  const sendText = useCallback(async () => {
    if (!input.trim() || loading) return;
    const user: Message = { role: 'user', content: input };
    const nextMessages = [...messages, user];
    setMessages((prev) => [...prev, user]);
    setInput('');
    await streamOrchestrated({ messages: nextMessages });
  }, [input, loading, messages, streamOrchestrated]);

  const attachImage = useCallback(
    async (file: File) => {
      setLoadingKey('uploading');
      const url = await upload(file);
      if (!url) return;
      const imageMessage: Message = {
        role: 'user',
        content: [{ type: 'image_url', image_url: { url } }],
      };
      const nextMessages = [...messages, imageMessage];
      setMessages((prev) => [...prev, imageMessage]);

      // Never auto-send; give a helpful hint in the input
      setLoadingKey(null);
      // If input is empty, show a non-intrusive placeholder hint instead of pre-filling text
      if (!input || input.trim().length === 0) {
        setInputPlaceholder(ADMIN_AI_IMAGE_HINT[language]);
      }
    },
    [upload, messages, language, input],
  );

  // Clear placeholder once the user starts typing
  useEffect(() => {
    if (input && input.trim().length > 0) setInputPlaceholder(null);
  }, [input]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setError(null);
    setUploadError(null);
    setSteps([]);
    setInflightTools([]);
    setInputPlaceholder(null);
    try {
      localStorage.removeItem(`admin-ai-input-draft:${language}`);
    } catch {}
  }, [setUploadError, language]);

  return {
    language,
    messages,
    input,
    setInput,
    loading: loading || uploadLoading,
    error,
    setError,
    loadingLabel: loadingKey ? LOADING_MESSAGES[language][loadingKey] : null,
    loadingKeyRaw: loadingKey,
    steps,
    sendText,
    attachImage,
    reset,
    inputPlaceholder,
    thinkingAgent,
    inflightTools,
  };
}
