# ADR 0005: Locale Assertion and Middleware i18n Invariants

Status: Accepted
Date: 2025-10-16

Context
The app uses a locale-prefixed segment (`/[locale]`) with only two supported locales: `en` and `zh`. Server components under this segment previously coerced any slug to `en`/`zh`, silently accepting invalid values. Middleware duplicated Accept-Language parsing and hardcoded the cookie name, and locale-prefixed API paths (e.g., `/en/api/...`) would 404 because such routes do not exist. These issues conflict with our negative-space coding practice: invalid states should be impossible or immediately visible.

Decision
- Enforce strict locale validity at route boundaries using a server-only assertion helper. When invalid, surface an error by calling `notFound()`.
- Standardize middleware on shared i18n config and helpers:
  - `detectLocaleFromHeader` for Accept-Language parsing.
  - `COOKIE_NAME` and `SUPPORTED_LOCALES` as the single source of truth.
  - Compute the best locale once per request and hint SSR via the `x-ui-locale` header.
- Canonicalize locale-prefixed API paths by redirecting `/{locale}/api/...` to `/api/...` and aligning the locale cookie.
- Lazily fetch Supabase session/user only when required by guarded paths to reduce overhead.

Changes
- Assertion helper
  - `src/lib/i18n/assert.ts` — `InvalidLocaleError`, `isLocale`, `assertLocaleParam(value, { notFoundOnError })`.
- Server components updated to assert locale
  - `src/app/[locale]/layout.tsx` — pass asserted `Locale` to `LocaleProvider`.
  - `src/app/[locale]/page.tsx` — assert in `generateMetadata`.
  - `src/app/[locale]/auth/signin/page.tsx` — assert page param and back link locale.
- Single source of `Locale` type in client context
  - `src/contexts/LocaleContext.tsx` — import `type Locale` from `src/lib/i18n/config.ts`.
- Middleware refactor
  - `src/lib/i18n/middleware-helpers.ts` — testable helpers for prefix parsing and best-locale resolution.
  - `src/middleware.ts` — use shared helpers and constants; add `/[locale]/api` canonicalization; lazy Supabase checks; keep cookie alignment and SSR hint.

Consequences
- Invalid locale slugs no longer render silently in server components and tests; they produce a 404 (via `notFound()`), improving observability and preventing state drift.
- Middleware logic is simpler and consistent; supported locales and cookie name are centralized.
- API calls under a locale prefix now redirect to the canonical `/api/...` path, avoiding confusing 404s.
- Reduced auth overhead on public pages by deferring Supabase checks.

Alternatives Considered
- Continue permissive `normalizeLocale` for route params: rejected; masking invalid inputs violates fail-fast.
- Retain per-file Accept-Language parsing and hardcoded cookie: rejected; encourages drift.
- Allow `/{locale}/api` without redirect: rejected; would require duplicating routes or accepting 404s.

Verification
- `npm run lint && npm run build` — pass.
- Unit tests cover assertion helper, auth redirects, navbar language links, verify-page locale links, and middleware helper behavior.

Rollback Plan
- Remove `src/lib/i18n/assert.ts` imports and revert ternary coercions in server components.
- Restore previous middleware locale parsing and remove API canonicalization branch.
- Revert helper tests and any ADR references.

