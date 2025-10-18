This directory previously contained legacy Assistants-era plumbing.

There is no `route.ts` here, and no API is exposed at `/api/admin/function-call`.

Purpose: avoid confusion by documenting that this endpoint is intentionally unavailable.

If you need a new API, add it under `src/app/api/admin/**/route.ts` following the project guidelines.
