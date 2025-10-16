import { describe, it, expect } from 'vitest'

// Import core AgentKit APIs
import { Agent, tool } from '@openai/agents'
import { z } from 'zod'

describe('AgentKit smoke', () => {
  it('creates an agent with a simple tool without running the LLM', () => {
    const echo = tool({
      name: 'echo',
      description: 'Echo back the provided text',
      parameters: z.object({ text: z.string() }),
      execute: async (input) => `echo: ${input.text}`,
    })

    const agent = new Agent({
      name: 'Test Agent',
      instructions: 'You are a test agent',
      tools: [echo],
    })

    expect(agent).toBeTruthy()
    // The returned tool exposes an internal 'invoke' function
    // (the input-side uses 'execute' at definition time)
    // Ensure it exists to confirm the tool is well-formed
    // @ts-expect-error - access internal shape for smoke validation
    expect(typeof (echo as any).invoke).toBe('function')
  })
})
