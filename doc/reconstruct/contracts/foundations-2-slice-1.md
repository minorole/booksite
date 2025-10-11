Contracts: Foundations-2 Slice 1

OpenAI Client Refactor
- Goal: remove eager failure and global client; use a lazy, role-aware client per call.
- Remove throw (import-time): src/lib/openai.ts:73
- Remove module-time client creation: src/lib/openai.ts:76-81
- Calls that must switch to per-call client usage:
  - createChatCompletion uses openai.chat.completions.create: src/lib/openai.ts:174-181
  - createVisionChatCompletion uses openai.chat.completions.create: src/lib/openai.ts:241-247
- New API surface:
  - function getOpenAIClient(role: 'ADMIN' | 'USER'): OpenAI
  - createChatCompletion and createVisionChatCompletion call getOpenAIClient('ADMIN') internally for now.

Rate Limit Wrapper
- Goal: basic per-user rate limit for heavy endpoints.
- Module: src/lib/security/ratelimit.ts (new)
- Usage points (wrap at top of handler):
  - Admin chat POST: src/app/api/admin/ai-chat/route.ts:102
  - Upload POST: src/app/api/upload/route.ts:6
- Contract:
  - Key: `${userId}:${route}`
  - Window: 1 minute; Limit: 10
  - 429 payload: { error: "Rate limit exceeded" }

Central Guards
- Goal: replace copy-paste Supabase checks with helpers.
- Module: src/lib/security/guards.ts (new)
- Functions:
  - assertAdmin({ cookies }): throws/returns 401 when user not ADMIN|SUPER_ADMIN
  - assertUser({ cookies }): throws/returns 401 when unauthenticated
  - isSuperAdmin(user): boolean
- Replacement targets:
  - src/app/api/admin/function-call/route.ts:12-23
  - src/app/api/admin/manual/books/[id]/route.ts:12-19
  - src/app/api/admin/manual/books/route.ts:12-21

Orders API (/api/orders/user)
- Method: GET
- Auth: required (assertUser)
- Response shape expected by src/app/users/orders/page.tsx:33
  {
    orders: [
      {
        id: string,
        status: string,
        total_items: number,
        created_at: string,
        shipping_address: string,
        order_items: [
          {
            book: { title_en: string, title_zh: string },
            quantity: number
          }
        ]
      }
    ]
  }
- Error codes: 401 unauthorized; 500 server error
- Notes: include minimal joins for titles and quantities; format address as a simple string.

Env Typing
- Module: src/lib/config/env.ts (new)
- Must expose typed getters for required vars:
  - DATABASE_URL, DIRECT_URL, OPENAI_API_KEY, OPENAI_API_KEY_USER,
    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPER_ADMIN_EMAIL, CLOUDINARY_URL
- Behavior: parsing module should not throw on import; getters must validate and throw with a clear error message.

