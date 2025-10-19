# Dead & Duplicate Code Findings

_Last reviewed: 2025-02-14_

## Dead / Unused Artifacts

- `src/lib/i18n/config.ts:6` exports `normalizeLocale`, but no runtime module imports it (`rg normalizeLocale` only returns the definition and docs).
- `src/lib/config/env.ts:50`-`54` provide optional env getters (`databaseUrl`, `directUrl`, `openaiApiKeyUser`, `upstashUrl`, `upstashToken`) that have zero call sites in the codebase.
- `src/lib/db/enums.ts:24` (`ORDER_STATUSES`) and `src/lib/db/enums.ts:61` (`ADMIN_ACTIONS`) are unused constants; services access literal status/action strings directly.
- `src/lib/admin/types/books.ts:17` and `src/lib/admin/types/books.ts:39`-`40` expose legacy fields (`similarity_group`, `similarity_threshold`, `language_preference`) that never surface in services or UI.
- `src/lib/admin/types/orders.ts:9`-`15` defines `language_preference` and `processing_priority`, but no consumer reads or writes them.
- `src/components/effects/` is an empty directory; no imports reference it.

## Duplicated Logic to Consolidate

- Redirect shells at `src/app/admin/page.tsx:1`, `src/app/admin/ai-chat/page.tsx:1`, `src/app/admin/manual/page.tsx:1`, and `src/app/super-admin/page.tsx:1` all duplicate the same header→locale→redirect pattern; a shared helper would remove the duplication.
- `src/components/layout/pill/DesktopPillItem.tsx:18`-`21` re-implements the `isExternalLink`/`isRouterLink`/`hrefMatches` helpers already exported from `src/components/layout/pill/mobile/utils.ts:3`-`18`.
- Admin route handlers such as `src/app/api/admin/manual/books/route.ts:11`-`44`, `src/app/api/admin/manual/books/[id]/route.ts:12`-`44`, and `src/app/api/upload/route.ts:11`-`36` repeat identical `assertAdmin` guards; a thin wrapper would centralize the 401 handling.
- Auth gating in `src/app/[locale]/admin/ai-chat/page.tsx:17`-`21` and `src/app/[locale]/admin/manual/page.tsx:15`-`19` is copy-pasted; extracting a shared hook/hoc would reduce drift.

## Suggested Next Steps

1. Remove the confirmed-dead exports and the empty `src/components/effects` directory, then run `npm run lint` to verify no regressions.
2. Pick one duplication cluster (redirect helper, auth guard, or link utilities) and refactor incrementally to keep diffs reviewable.
