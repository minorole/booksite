Runbook: Validate Foundations-2 Slice 1

Prereqs
- Env configured in .env.local for DATABASE_URL, DIRECT_URL, OPENAI_API_KEY (admin), NEXT_PUBLIC_* Supabase, NEXT_PUBLIC_SUPER_ADMIN_EMAIL, CLOUDINARY_URL. OPENAI_API_KEY_USER optional for this validation.
- Database migrated and seeded (if applicable).

Steps
1) Start dev
- npm run dev

2) Auth flow
- Visit /auth/signin and complete magic link signin.
- On callback, user record is created with role USER (or SUPER_ADMIN if email matches NEXT_PUBLIC_SUPER_ADMIN_EMAIL).

3) Orders API
- While signed in, GET /api/orders/user
  - Expect 200 and JSON list of orders with items.
- While signed out, GET /api/orders/user
  - Expect 401.

4) Admin AI Chat rate limit
- As ADMIN or SUPER_ADMIN, POST /api/admin/ai-chat with a small messages payload.
- Repeat the request enough times to hit the limit (as configured in ratelimit.ts).
 - Expect 429 once threshold exceeded.
  - Observe X-RateLimit-* headers present on both 200/429 responses.

5) Upload API rate limit
- As ADMIN or SUPER_ADMIN, POST /api/upload with a small image (under 10MB).
 - Repeat to trigger rate limit; expect 429 when exceeded.
  - Observe X-RateLimit-* headers present on both 200/429 responses.

6) OpenAI client behavior
- Temporarily unset OPENAI_API_KEY and invoke /api/admin/ai-chat.
- Expect a 500 with a clear message about missing API key (call-time error), not an import-time crash.

Smoke
- npm run lint && npm run build should succeed.

Implementation Notes
- Rate limiting uses Upstash sliding window per-route policies with a small concurrency semaphore for heavy endpoints.
- If Upstash env vars are not configured, limiting is disabled (enabled=false) but endpoints still function.

