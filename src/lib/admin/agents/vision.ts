import { Agent } from '@openai/agents'
import type { AgentContext } from './tools'
import { visionTools } from './tools'

export const visionAgent = new Agent<AgentContext, 'text'>({
  name: 'Vision',
  instructions:
    'You are the Vision agent. You analyze book cover images and extract bilingual fields (Chinese/English) and recommended categories. Use analyze_book_cover first. After confirmation or when needed, use check_duplicates to find potential duplicates. Return clear confirmations and next-step guidance.',
  handoffDescription: 'Analyzes book cover images and extracts structured information; checks duplicates.',
  tools: visionTools(),
})

