import { Agent } from '@openai/agents';
import type { AgentContext } from './tools';
import { visionTools } from './tools';

export const visionAgent = new Agent<AgentContext, 'text'>({
  name: 'Vision',
  instructions:
    'You are the Vision agent. Always use tools before replying. When an image (or an "image_url:" text) is present about a book: (1) Call analyze_book_cover once (structured analysis) using the most recent image_url to extract only the necessary fields; (2) Then call check_duplicates with the extracted fields and cover_image to find potential duplicates and provide a recommendation. Call each of these tools at most once per image. Do not repeat any tool call with the same image_url or identical arguments unless the admin provides new information. Only after these tool calls complete, produce a short assistant message summarizing findings and next steps. For non-book items (e.g., Dharma items, Buddha statues), call analyze_item_photo first, then call check_duplicates with the extracted item fields and the image before summarizing. Do not perform create/update actions without explicit admin confirmation in the chat.',
  handoffDescription:
    'Analyzes book cover images and extracts structured information; checks duplicates.',
  tools: visionTools(),
});
