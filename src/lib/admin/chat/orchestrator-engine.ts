import { Runner } from '@openai/agents-core'
import { setDefaultOpenAIClient, setOpenAIAPI } from '@openai/agents'
import { OpenAIProvider } from '@openai/agents-openai'
import type { Agent } from '@openai/agents'
import type { AgentContext } from '@/lib/admin/agents/tools'
import { getAdminClient } from '@/lib/openai/client'
import { adminAiSensitiveEnabled } from '@/lib/observability/toggle'

export interface OrchestratorEngine {
  run(params: {
    startAgent: Agent<any, any>
    input: unknown
    context: AgentContext
    maxTurns: number
    model: string
    traceMetadata?: Record<string, string>
  }): Promise<AsyncIterable<unknown>>
}

class DefaultEngine implements OrchestratorEngine {
  private provider: OpenAIProvider
  constructor() {
    // Configure Agents SDK to use our OpenAI client and Responses API mode
    try {
      setDefaultOpenAIClient(getAdminClient('text') as unknown as any)
      setOpenAIAPI('responses')
    } catch {}
    this.provider = new OpenAIProvider()
  }

  async run(params: {
    startAgent: Agent<any, any>
    input: unknown
    context: AgentContext
    maxTurns: number
    model: string
    traceMetadata?: Record<string, string>
  }): Promise<AsyncIterable<unknown>> {
    const runner = new Runner({
      modelProvider: this.provider,
      model: params.model,
      workflowName: 'Admin AI Chat',
      traceMetadata: params.traceMetadata || {},
      traceIncludeSensitiveData: adminAiSensitiveEnabled(),
    })
    const stream = await runner.run(
      params.startAgent as unknown as Parameters<typeof runner.run>[0],
      params.input as any,
      {
        stream: true,
        context: params.context,
        maxTurns: params.maxTurns,
      },
    )
    return (stream as unknown) as AsyncIterable<unknown>
  }
}

let currentEngine: OrchestratorEngine | null = null

export function getOrchestratorEngine(): OrchestratorEngine {
  if (!currentEngine) currentEngine = new DefaultEngine()
  return currentEngine
}

export function setOrchestratorEngine(engine: OrchestratorEngine | null) {
  currentEngine = engine
}
