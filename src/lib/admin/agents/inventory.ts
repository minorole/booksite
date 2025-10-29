import { Agent } from '@openai/agents'
import { webSearchTool } from '@openai/agents'
import type { AgentContext } from './tools'
import { inventoryTools } from './tools'
import { ALLOWED_BOOK_FIELDS, UNSUPPORTED_FIELD_EXAMPLES } from './constraints'

export const inventoryAgent = new Agent<AgentContext, 'text'>({
  name: 'Inventory',
  instructions:
    (
      'You are the Inventory agent. You create, update, and search books and items. ' +
      'Confirm duplicates have been checked when creating new items. ' +
      'Do not apply changes without explicit admin confirmation (e.g., user says "Confirm" / "确认"). ' +
      'When you proceed to call mutating tools (create_book, update_book), include confirmed: true only after the admin has explicitly confirmed. ' +
      'Always return a clear summary of proposed or applied changes or search results. ' +
      `Ask only for supported fields: ${ALLOWED_BOOK_FIELDS.join(', ')}. ` +
      `Do not ask for unsupported fields (e.g., ${UNSUPPORTED_FIELD_EXAMPLES.join(', ')}).`
    ),
  handoffDescription: 'Creates, updates, and searches books in the catalog.',
  tools: ((process.env.ADMIN_AI_INVENTORY_WEB_SEARCH || '').toLowerCase() === '1' || (process.env.ADMIN_AI_INVENTORY_WEB_SEARCH || '').toLowerCase() === 'true')
    ? [...inventoryTools(), webSearchTool()]
    : inventoryTools(),
})
