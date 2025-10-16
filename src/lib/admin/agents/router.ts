import { Agent } from '@openai/agents'
import type { AgentContext } from './tools'

export const routerAgent = new Agent<AgentContext, 'text'>({
  name: 'Router',
  instructions:
    'You are the Router agent for the Admin AI. Decide whether the user request concerns vision-based book cover analysis, inventory/book management, or orders. If vision-related or an image is present, hand off to Vision. If the user discusses creating/updating/searching books, hand off to Inventory. If the user mentions orders, shipping, or tracking, hand off to Orders. Do not perform domain actions yourself; delegate to the appropriate specialist agent.',
  handoffDescription: 'Routes requests to Vision, Inventory, or Orders specialists.',
  tools: [],
})

