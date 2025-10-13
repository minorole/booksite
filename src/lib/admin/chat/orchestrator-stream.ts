import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { createChatCompletion, logOperation } from '@/lib/openai'
import { toOpenAIMessage } from '@/lib/openai/messages'
import { adminTools } from '@/lib/admin/function-definitions'
import type { Message } from '@/lib/admin/types'
import {
  analyzeBookCover,
  checkDuplicates,
  createBook,
  updateBook,
  searchBooks,
  updateOrder,
} from '@/lib/admin/function-handlers'

type ToolName =
  | 'analyze_book_cover'
  | 'check_duplicates'
  | 'create_book'
  | 'update_book'
  | 'search_books'
  | 'update_order'

// Centralized converter from '@/lib/openai/messages'

type SSEWriter = (event: any) => void

export async function runChatWithToolsStream(params: {
  messages: Message[]
  userEmail: string
  imageUrl?: string
  confirmedInfo?: Record<string, unknown>
  maxSteps?: number
  write: SSEWriter
}): Promise<void> {
  const { messages, userEmail, imageUrl, confirmedInfo, maxSteps = 5, write } = params
  const history: ChatCompletionMessageParam[] = messages.map(toOpenAIMessage)
  let steps = 0

  while (steps < maxSteps) {
    const tool_choice: any = confirmedInfo
      ? {
          type: 'function',
          function: { name: 'analyze_book_cover', parameters: { image_url: imageUrl, stage: 'structured', confirmed_info: confirmedInfo } },
        }
      : 'auto'

    // Stream assistant output and collect tool calls
    const response = await createChatCompletion({ messages: history, tools: adminTools, tool_choice, stream: true })
    if (!(response instanceof ReadableStream)) {
      // Fallback: non-stream
      break
    }

    const reader = response.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    // Accumulate tool_calls deltas by index
    const toolAcc: Array<{ id?: string; name?: string; arguments?: string }> = []

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
          const delta = evt?.message
          if (delta?.content) {
            write({ type: 'assistant_delta', content: delta.content })
          }
          if (Array.isArray(delta?.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const i = tc.index ?? 0
              toolAcc[i] = toolAcc[i] || {}
              if (tc.function?.name) toolAcc[i].name = tc.function.name
              if (tc.id) toolAcc[i].id = tc.id
              if (tc.function?.arguments) {
                toolAcc[i].arguments = (toolAcc[i].arguments || '') + tc.function.arguments
              }
            }
          }
        } catch {}
      }
    }

    // Assistant finished; flush
    write({ type: 'assistant_done' })

    // If no tool calls gathered, we're done
    const toolCalls = toolAcc
      .map((t, i) => (t && t.name && typeof t.arguments === 'string' ? { id: t.id || String(i), function: { name: t.name!, arguments: t.arguments! } } : null))
      .filter(Boolean) as Array<{ id: string; function: { name: string; arguments: string } }>

    if (!toolCalls.length) break

    // Execute tool calls and append tool messages
    for (const tc of toolCalls) {
      const name = tc.function.name as ToolName
      let args: any
      try {
        args = JSON.parse(tc.function.arguments || '{}')
      } catch {
        args = {}
      }
      if (name === 'analyze_book_cover' && imageUrl) args.image_url = imageUrl
      write({ type: 'tool_start', id: tc.id, name, args, startedAt: new Date().toISOString() })

      const started = Date.now()
      let result: any
      try {
        switch (name) {
          case 'analyze_book_cover':
            result = await analyzeBookCover(args, userEmail)
            break
          case 'check_duplicates':
            result = await checkDuplicates(args, userEmail)
            break
          case 'create_book':
            result = await createBook(args, userEmail)
            break
          case 'update_book':
            result = await updateBook(args, userEmail)
            break
          case 'search_books':
            result = await searchBooks(args)
            break
          case 'update_order':
            result = await updateOrder(args, userEmail)
            break
          default:
            result = { success: false, message: `Unknown function: ${name}` }
        }
        const durationMs = Date.now() - started
        write({ type: 'tool_result', id: tc.id, name, success: !!result?.success, result, finishedAt: new Date().toISOString(), durationMs })
        const toolMessage: Message = { role: 'tool', name, tool_call_id: tc.id, content: JSON.stringify(result) }
        history.push(toOpenAIMessage(toolMessage))
        write({ type: 'tool_append', message: toolMessage })
      } catch (e) {
        const durationMs = Date.now() - started
        write({ type: 'tool_result', id: tc.id, name, success: false, error: { message: (e as Error).message }, finishedAt: new Date().toISOString(), durationMs })
      }
    }

    steps += 1
    logOperation('ORCHESTRATOR_STREAM_STEP', { steps, toolCalls: toolCalls.length })
    // Continue loop for next assistant turn with appended tool messages in history
  }

  logOperation('ORCHESTRATOR_STREAM_DONE', {})
}
