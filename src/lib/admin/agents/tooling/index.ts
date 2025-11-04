export type { AgentContext } from './common';
export { visionTools } from './vision';
export { inventoryTools } from './inventory';
export { orderTools } from './orders';

import type { Tool } from '@openai/agents-core';
import type { AgentContext } from './common';
import { visionTools } from './vision';
import { inventoryTools } from './inventory';
import { orderTools } from './orders';

// Compatibility: Some tests reference a helper to fetch tools for an agent by id.
export function getToolsForAgent(
  agentId: 'router' | 'vision' | 'inventory' | 'orders',
): Tool<AgentContext>[] {
  if (agentId === 'vision') return visionTools();
  if (agentId === 'inventory') return inventoryTools();
  if (agentId === 'orders') return orderTools();
  // Router intentionally has no domain tools to force handoffs
  return [];
}

// Derive first-party tool names from our tool factories at runtime with memoization.
let DOMAIN_TOOL_NAMES_CACHE: Set<string> | null = null;
export function getDomainToolNames(): Set<string> {
  if (DOMAIN_TOOL_NAMES_CACHE) return DOMAIN_TOOL_NAMES_CACHE;
  const all = [...visionTools(), ...inventoryTools(), ...orderTools()] as Array<{ name?: string }>;
  DOMAIN_TOOL_NAMES_CACHE = new Set(
    all.map((t) => t?.name).filter((n): n is string => typeof n === 'string' && n.length > 0),
  );
  return DOMAIN_TOOL_NAMES_CACHE;
}
