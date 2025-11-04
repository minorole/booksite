Foundations-2: Slice 1 Checklist

Scope

- Typed env module
- Lazy, role-aware OpenAI client
- Central auth guards
- Minimal rate limit wrapper
- User orders API to satisfy existing UI

Tasks

1. Add typed env

- Create src/lib/config/env.ts with zod schema and typed getters.
- Include validation for DATABASE_URL, DIRECT_URL, OPENAI_API_KEY (admin) and OPENAI_API_KEY_USER (user), NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPER_ADMIN_EMAIL, CLOUDINARY_URL.
  Acceptance
- Importing env module does not throw unless a getter is called for a missing required var.

2. Update env example

- Edit .env.example to add OPENAI_API_KEY_USER directly under OPENAI_API_KEY.
  Acceptance
- .env.example documents both admin and user keys.

3. Make OpenAI client lazy and role-aware

- Refactor src/lib/openai.ts:
  - Remove module-time throw and client construction.
  - Add getOpenAIClient(role: 'ADMIN' | 'USER') using the correct key and OPENAI_CONFIG settings.
  - Use the client inside createChatCompletion and createVisionChatCompletion.
- Update imports where needed (e.g., src/app/api/admin/ai-chat/route.ts should not import a global client).
  Acceptance
- Admin AI chat still works; missing keys error at call time with a clear message.

4. Centralize guards

- Add src/lib/security/guards.ts with assertAdmin/assertUser/isSuperAdmin helpers based on Supabase user metadata.
- Apply in:
  - src/app/api/admin/function-call/route.ts
  - src/app/api/admin/manual/books/[id]/route.ts
    Acceptance
- Routes return 401 for unauthorized and proceed for ADMIN or SUPER_ADMIN.

5. Minimal rate limiting

- Add src/lib/security/ratelimit.ts (Upstash wrapper).
- Apply to heavy endpoints:
  - src/app/api/admin/ai-chat/route.ts
  - src/app/api/upload/route.ts
    Acceptance
- Returns 429 when exceeding configured rate; normal operation otherwise.

6. Implement user orders API

- Add src/app/api/orders/user/route.ts to return current user’s orders with items and shipping summary.
  Acceptance
- src/app/users/orders/page.tsx renders without errors and displays orders when present.

Validation

- Sign in via magic link and hit protected pages.
- Verify /api/admin/ai-chat and /api/upload accept authorized requests and rate limit as configured.
- Verify /api/orders/user returns 401 unauthenticated; returns data when authenticated.

Notes

- Do not alter business behavior in this slice; focus on infra surfaces and parity with current flows.
