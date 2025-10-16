import { Agent } from '@openai/agents'
import type { AgentContext } from './tools'
import { visionTools } from './tools'

export const visionAgent = new Agent<AgentContext, 'text'>({
  name: 'Vision',
  instructions:
    'You are the Vision agent. You analyze book cover images and non-book item photos, extracting bilingual fields (Chinese/English) and recommended categories. For book covers, use analyze_book_cover first; after confirmation or when needed, use check_duplicates to find potential duplicates. For non-book items (e.g., Dharma items, Buddha statues), use analyze_item_photo to return structured details. Return clear confirmations and next-step guidance.',
  handoffDescription: 'Analyzes book cover images and extracts structured information; checks duplicates.',
  tools: visionTools(),
})
