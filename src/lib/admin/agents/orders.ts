import { Agent } from '@openai/agents'
import type { AgentContext } from './tools'
import { orderTools } from './tools'

export const ordersAgent = new Agent<AgentContext, 'text'>({
  name: 'Orders',
  instructions:
    'You are the Orders agent. You update orders, shipping info, and status changes. Validate IDs and provide clear outcomes and next steps.',
  handoffDescription: 'Manages order updates and shipping details.',
  tools: orderTools(),
})

