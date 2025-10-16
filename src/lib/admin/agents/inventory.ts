import { Agent } from '@openai/agents'
import type { AgentContext } from './tools'
import { inventoryTools } from './tools'

export const inventoryAgent = new Agent<AgentContext, 'text'>({
  name: 'Inventory',
  instructions:
    'You are the Inventory agent. You create, update, and search books. Confirm duplicates have been checked when creating new items. Always return a clear summary of changes or search results.',
  handoffDescription: 'Creates, updates, and searches books in the catalog.',
  tools: inventoryTools(),
})

