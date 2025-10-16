import { Agent } from '@openai/agents'
import { routerAgent } from './router'
import { visionAgent } from './vision'
import { inventoryAgent } from './inventory'
import { ordersAgent } from './orders'
import type { AgentContext } from './tools'

export type AgentRegistry = {
  router: Agent<any, any>
  vision: Agent<any, any>
  inventory: Agent<any, any>
  orders: Agent<any, any>
}

export function createAgentRegistry(): AgentRegistry {
  // Wire handoffs from router to specialists
  const router = Agent.create({
    name: 'Router',
    handoffs: [visionAgent, inventoryAgent, ordersAgent],
    instructions: (ctx) => routerAgent.instructions instanceof Function ? routerAgent.instructions(ctx as any, routerAgent) : (routerAgent.instructions as string),
    handoffDescription: routerAgent.handoffDescription,
    tools: [],
  })

  return {
    router,
    vision: visionAgent,
    inventory: inventoryAgent,
    orders: ordersAgent,
  }
}
