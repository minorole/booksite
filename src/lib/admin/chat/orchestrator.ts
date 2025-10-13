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

export async function runChatWithTools(params: {
  messages: Message[]
  userEmail: string
  imageUrl?: string
  confirmedInfo?: Record<string, unknown>
  maxSteps?: number
}): Promise<{ messages: Message[] }> {
  const { messages, userEmail, imageUrl, confirmedInfo, maxSteps = 5 } = params

  const history: ChatCompletionMessageParam[] = messages.map(toOpenAIMessage)
  const appended: Message[] = []

  // If this is a confirmation step, force the structured analysis call
  const isConfirmation = !!confirmedInfo
  const tool_choice: any = isConfirmation
    ? {
        type: 'function',
        function: {
          name: 'analyze_book_cover',
          parameters: {
            image_url: imageUrl,
            stage: 'structured',
            confirmed_info: confirmedInfo,
          },
        },
      }
    : 'auto'

  let steps = 0
  // Initial completion
  let completion = (await createChatCompletion({
    messages: history,
    tools: adminTools,
    tool_choice,
  })) as any

  while (steps < maxSteps) {
    const message = (completion as any).choices[0]?.message
    if (!message) break

    if (!message.tool_calls || message.tool_calls.length === 0) {
      // No tools requested; append assistant message and return
      const assistant: Message = {
        role: message.role as any,
        content: message.content ?? '',
      }
      appended.push(assistant)
      break
    }

    // Execute tool calls server-side
    for (const toolCall of message.tool_calls) {
      const name = toolCall.function.name as ToolName
      let args: any
      try {
        args = JSON.parse(toolCall.function.arguments || '{}')
      } catch {
        args = {}
      }

      if (name === 'analyze_book_cover' && imageUrl) {
        // Ensure correct URL propagation
        args.image_url = imageUrl
      }

      let result
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

      // Append tool message for visibility in UI
      const toolMessage: Message = {
        role: 'tool',
        name,
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      }
      appended.push(toolMessage)
      history.push(toOpenAIMessage(toolMessage))
    }

    // Ask model again with tool outputs
    completion = (await createChatCompletion({
      messages: history,
      tools: adminTools,
      tool_choice: 'auto',
    })) as any
    steps += 1

    // If next response is plain assistant, append and finish; else continue loop
    const next = completion.choices[0]?.message
    if (next && (!next.tool_calls || next.tool_calls.length === 0)) {
      appended.push({ role: next.role as any, content: next.content ?? '' })
      break
    }
  }

  logOperation('ORCHESTRATOR_RESULT', { steps, appendedCount: appended.length })
  return { messages: appended }
}
