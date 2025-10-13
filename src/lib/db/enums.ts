// String union enums used across the Supabase-native data layer
// Keep in sync with SQL checks and application guardrails

export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN'

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'

// Category types used by the application (tuple for ergonomic zod enums)
export const CATEGORY_TYPES = [
  'PURE_LAND_BOOKS',
  'OTHER_BOOKS',
  'DHARMA_ITEMS',
  'BUDDHA_STATUES',
] as const
export type CategoryType = typeof CATEGORY_TYPES[number]

export const ROLES: Role[] = ['USER', 'ADMIN', 'SUPER_ADMIN']
export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
]

// Admin action types mirrored from SQL CHECK constraint on public.admin_logs.action
export type AdminAction =
  | 'DELETE_BOOK'
  | 'EDIT_BOOK'
  | 'CREATE_BOOK'
  | 'UPDATE_QUANTITY'
  | 'UPDATE_STATUS'
  | 'PROCESS_ORDER'
  | 'CANCEL_ORDER'
  | 'MARK_SHIPPED'
  | 'UPDATE_TRACKING'
  | 'ANALYZE_IMAGE'
  | 'CHECK_DUPLICATE'
  | 'APPROVE_TAG'
  | 'REJECT_TAG'
  | 'UPDATE_TAGS'
  | 'OVERRIDE_MONTHLY_LIMIT'
  | 'UPDATE_SYSTEM_SETTINGS'
  | 'UPDATE_PROMPTS'
  | 'CHAT_MESSAGE'
  | 'LLM_REQUEST'
  | 'LLM_RESPONSE'
  | 'FUNCTION_CALL'
  | 'FUNCTION_SUCCESS'
  | 'CONFIDENCE_CHECK_FAILED'
  | 'CHAT_COMPLETE'
  | 'LLM_RETRY'

export const ADMIN_ACTIONS: AdminAction[] = [
  'DELETE_BOOK',
  'EDIT_BOOK',
  'CREATE_BOOK',
  'UPDATE_QUANTITY',
  'UPDATE_STATUS',
  'PROCESS_ORDER',
  'CANCEL_ORDER',
  'MARK_SHIPPED',
  'UPDATE_TRACKING',
  'ANALYZE_IMAGE',
  'CHECK_DUPLICATE',
  'APPROVE_TAG',
  'REJECT_TAG',
  'UPDATE_TAGS',
  'OVERRIDE_MONTHLY_LIMIT',
  'UPDATE_SYSTEM_SETTINGS',
  'UPDATE_PROMPTS',
  'CHAT_MESSAGE',
  'LLM_REQUEST',
  'LLM_RESPONSE',
  'FUNCTION_CALL',
  'FUNCTION_SUCCESS',
  'CONFIDENCE_CHECK_FAILED',
  'CHAT_COMPLETE',
  'LLM_RETRY',
]
