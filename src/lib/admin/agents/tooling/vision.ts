import { z } from 'zod';
import { tool, type Tool } from '@openai/agents-core';
import type { RunContext } from '@openai/agents-core';
import { HttpUrl } from '@/lib/schema/http-url';
import { analyzeBookCover, analyzeItemPhoto } from '@/lib/admin/services/vision';
import type { AgentContext } from './common';
import { buildCheckDuplicatesTool, shouldSkipDuplicateCall } from './common';

export function visionTools(): Tool<AgentContext>[] {
  const analyze = tool({
    name: 'analyze_book_cover',
    description:
      'Analyze a book cover image (structured, single step). Extract only the necessary fields.',
    strict: true,
    parameters: z.object({ image_url: HttpUrl }).strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      if (shouldSkipDuplicateCall('analyze_book_cover', input)) {
        return {
          success: true,
          message: 'Skipped duplicate analyze_book_cover call (same image/args in this request).',
        };
      }
      const email = context?.context?.userEmail || 'admin@unknown';
      const result = await analyzeBookCover(
        input as import('@/lib/admin/types').BookAnalyzeParams,
        email,
      );
      return result;
    },
  });

  const dup = buildCheckDuplicatesTool();

  const analyzeItem = tool({
    name: 'analyze_item_photo',
    description:
      'Analyze a non-book item photo and return structured fields (name/type, material/finish, size/dimensions, category suggestion, tags).',
    strict: true,
    parameters: z.object({ image_url: HttpUrl }).strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      if (shouldSkipDuplicateCall('analyze_item_photo', input)) {
        return {
          success: true,
          message: 'Skipped duplicate analyze_item_photo call (same image/args in this request).',
        };
      }
      const email = context?.context?.userEmail || 'admin@unknown';
      const { image_url } = input as { image_url: string };
      const result = await analyzeItemPhoto(image_url, email);
      return result;
    },
  });

  return [analyze, dup, analyzeItem];
}
