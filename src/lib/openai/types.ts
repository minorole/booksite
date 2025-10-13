import { type ChatCompletion } from 'openai/resources/chat/completions'
import { type ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions'

export type ChatCompletionMessage = ChatCompletionCreateParamsBase['messages'][number]

export interface ChatOptions {
  messages: ChatCompletionMessage[]
  stream?: boolean
  tools?: ChatCompletionCreateParamsBase['tools']
  tool_choice?: ChatCompletionCreateParamsBase['tool_choice']
  temperature?: number
  max_tokens?: number
}

export type ChatResponse = ChatCompletion | ReadableStream

export interface ContextMetadata {
  totalTokens: number
  promptTokens: number
  responseTokens: number
  images?: number
  functions?: number
  timestamp: string
  operation: string
  model: string
}

