import { Agent } from '@openai/agents'
import { routerConfig } from './router'
import { visionAgent } from './vision'
import { inventoryAgent } from './inventory'
import { ordersAgent } from './orders'
import type { AgentContext } from './tools'

export type AgentRegistry = {
  router: Agent<AgentContext, 'text'>
  vision: Agent<AgentContext, 'text'>
  inventory: Agent<AgentContext, 'text'>
  orders: Agent<AgentContext, 'text'>
}

export function createAgentRegistry(): AgentRegistry {
  // Wire handoffs from router to specialists; avoid duplicating router definitions
  const router = Agent.create({
    ...routerConfig,
    handoffs: [visionAgent, inventoryAgent, ordersAgent],
  }) as Agent<AgentContext, 'text'>

  return {
    router,
    vision: visionAgent,
    inventory: inventoryAgent,
    orders: ordersAgent,
  }
}
