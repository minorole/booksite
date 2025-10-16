# Locale Assertion Helper Audit

## Context & Scope
- Trigger: home/landing/auth review against `doc/style/Negative-space-coding.md`.
- Focus: entry pages under `src/app/[locale]/**`, shared locale context, middleware redirects, and navigation widgets that depend on a valid `Locale`.
- Goal: document gaps where invalid locale slugs collapse to `en` silently and outline a negative-space-friendly fix.

## Current Locale Handling
- **Server entry** – `src/app/[locale]/layout.tsx:6-13` coerces any slug to `'zh' | 'en'` using ternaries and feeds it into `LocaleProvider`, so `/xx/home` renders English instead of rejecting.
- **Metadata** – `src/app/[locale]/page.tsx:8-23` mirrors the same fallback for `<title>/<description>`, guaranteeing mismatched metadata for bad slugs.
- **Auth** – `src/app/[locale]/auth/signin/page.tsx:16-47` repeats the pattern, meaning auth error states never surface “unknown locale”.
- **Middleware** – `src/middleware.ts:14-151` normalizes requests to `/en|zh` but unit tests or direct route invocations bypass it, so invalid params still reach components.
- **Utilities** – `src/lib/i18n/config.ts:1-17` defines `Locale`, `SUPPORTED_LOCALES`, and `normalizeLocale`, but there is no canonical assertion helper tying them to routing params.

## Risk & Invariants
- Hidden failure: server components render successfully with the wrong language instead of producing `404` or redirecting, violating the “fail fast” guidance.
- Observability gap: Sentry/logs never receive signals that a locale slug is wrong, so broken links can persist unnoticed.
- State mismatch: `LocaleProvider` trusts initial props; downstream clients assume `locale` is trustworthy, so invalid states propagate.
- Desired invariant: “route param locale ∈ SUPPORTED_LOCALES; otherwise surface an error (ideally `notFound()`).”

## Helper Design Proposal
- Location: `src/lib/i18n/assert.ts`.
- API:
  - `export class InvalidLocaleError extends Error { locale: string }`.
  - `export function isLocale(value: unknown): value is Locale` leveraging `SUPPORTED_LOCALES`.
  - `export function assertLocaleParam(value: unknown, opts?: { notFoundOnError?: boolean }): Locale` that throws `InvalidLocaleError` and optionally calls `notFound()`.
- Constraints:
  - Do **not** reuse `normalizeLocale` so variants like `zh-cn` fail loudly.
  - Mark file as server-only (no `"use client"`; importable in RSCs and route handlers).
  - Export the `Locale` type from `config.ts` to avoid circular imports; re-export in the helper for convenience without leaking server-only code to client bundles.

## Integration Plan
1. Add helper + unit test skeleton under `src/lib/i18n/__tests__/assert.test.ts` covering happy path, error path, and `notFoundOnError`.
2. Update `src/app/[locale]/layout.tsx:6-13` to call `assertLocaleParam((await params).locale)` and pass the typed `Locale` to `LocaleProvider`.
3. Update `src/app/[locale]/page.tsx:8-23` to reuse the helper for metadata generation.
4. Update `src/app/[locale]/auth/signin/page.tsx:16-47` (and any other server components fetching `params`) to replace ternaries with the helper.
5. Sweep additional server modules for manual locale coercion (e.g. future segmented routes, API handlers) and refactor to use the helper.
6. Verify with `npm run lint && npm run build`; these commands ensure type inference and server/client boundaries remain intact.

## Verification & Follow-Ups
- After integration, spot-check navigation in both locales to confirm redirects remain intact (middleware still canonicalizes URLs).
- Consider exposing a tolerant helper (e.g., `safeLocaleFromCookie`) for contexts where permissive fallbacks are acceptable, keeping `assertLocaleParam` strict.
- Evaluate client-side toggles (Navbar pills, `LanguageSwitch`) to ensure they respect the validated locale; this may also benefit from re-exporting the `Locale` type.
