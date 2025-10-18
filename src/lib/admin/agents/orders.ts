import { Agent } from '@openai/agents'
import type { AgentContext } from './tools'
import { orderTools } from './tools'

export const ordersAgent = new Agent<AgentContext, 'text'>({
  name: 'Orders',
  instructions:
    'You are the Orders agent. You update orders, shipping info, and status changes. Validate IDs, and do not apply changes without explicit admin confirmation (e.g., user says "Confirm" / "确认"). When you proceed to call mutating tools (update_order), include confirmed: true only after the admin has explicitly confirmed. Provide clear outcomes and next steps.',
  handoffDescription: 'Manages order updates and shipping details.',
  tools: orderTools(),
})
