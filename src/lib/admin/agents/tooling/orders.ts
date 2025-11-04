import { z } from 'zod';
import { tool, type Tool } from '@openai/agents-core';
import type { RunContext } from '@openai/agents-core';
import type { AgentContext } from './common';
import { getOrderDb, searchOrdersDb } from '@/lib/db/admin';
import { updateOrder } from '@/lib/admin/services/orders';

export function orderTools(): Tool<AgentContext>[] {
  const update = tool({
    name: 'update_order',
    description: 'Update an order with shipping info or status.',
    strict: true,
    parameters: z
      .object({
        confirmed: z.boolean(),
        order_id: z.string(),
        status: z.string().nullable(),
        tracking_number: z.string().nullable(),
        admin_notes: z.string().nullable(),
        override_monthly: z.boolean().nullable(),
      })
      .strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown';
      const pruned: Record<string, unknown> = {};
      if (typeof input === 'object' && input !== null) {
        const obj = input as Record<string, unknown>;
        if (!obj.confirmed) {
          return {
            success: false,
            message: 'Confirmation required',
            error: { code: 'confirmation_required', details: 'update_order' },
          };
        }
        for (const [k, v] of Object.entries(obj)) {
          if (v !== null && v !== undefined) pruned[k] = v;
        }
      }
      delete pruned.confirmed;
      const result = await updateOrder(
        pruned as unknown as import('@/lib/admin/types').OrderUpdate,
        email,
      );
      return result;
    },
  });

  const getOrder = tool({
    name: 'get_order',
    description: 'Fetch a single order by ID.',
    strict: true,
    parameters: z.object({ order_id: z.string() }).strict(),
    async execute(input: unknown) {
      const { order_id } = input as { order_id: string };
      const o = await getOrderDb(order_id);
      if (!o) return { success: false, message: 'Order not found' };
      return {
        success: true,
        message: 'Order found',
        data: {
          order: {
            order_id: o.order_id,
            status: o.status,
            tracking_number: o.tracking_number ?? undefined,
          },
        },
      };
    },
  });

  const searchOrders = tool({
    name: 'search_orders',
    description: 'Search orders by status or query string (id or tracking number).',
    strict: true,
    parameters: z.object({ status: z.string().nullable(), q: z.string().nullable() }).strict(),
    async execute(input: unknown) {
      const { status, q } = input as { status?: string | null; q?: string | null };
      const rows = await searchOrdersDb({ status: status ?? undefined, q: q ?? undefined });
      return { success: true, message: `Found ${rows.length} order(s)`, data: { orders: rows } };
    },
  });

  return [update, getOrder, searchOrders];
}
