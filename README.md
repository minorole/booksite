This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Development

- Node.js >= 20.18 (Next.js 16)
- Commands:
  - `npm run dev` — start dev server at http://localhost:3000
  - `npm run check:ci` — lint, typecheck, tests, build
  - `npm run db:types` — regenerate Supabase types (requires Supabase CLI link)

### Environment

- Required: `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPER_ADMIN_EMAIL`, `CLOUDINARY_URL`
- Optional: `OPENAI_API_KEY_USER`, `OPENAI_TEXT_MODEL`, `OPENAI_VISION_MODEL`, `OPENAI_EMBEDDINGS_MODEL`, `CLOUDINARY_TEMP_PREFIX`, `CLOUDINARY_TEMP_RETENTION_DAYS`
- Local rate limiting: set `KV_USE_MEMORY=1` (dev only) or configure Vercel KV (`KV_REST_API_URL`, `KV_REST_API_TOKEN`).

### Notes on upgrades

- Next.js 16: middleware moved to `src/proxy.ts` (Proxy convention). If you previously used `skipMiddlewareUrlNormalize`, use `skipProxyUrlNormalize` instead.
- Tailwind CSS v4: PostCSS uses `@tailwindcss/postcss` — do not add `autoprefixer`.
- OpenAI SDK v6: Responses API used throughout (`src/lib/openai/responses.ts`). Override models with env vars.
- Zod v4 + @hookform/resolvers v5: forms and schemas updated.

### Fonts

- Archivo (Latin) is fully self‑hosted using `next/font/local`.
  - Files: `public/fonts/archivo/Archivo-Regular.ttf` (400), `Archivo-Medium.ttf` (500),
    `Archivo-SemiBold.ttf` (600), `Archivo-Bold.ttf` (700)
  - Loader: `src/styles/fonts.ts` exports `archivo` (no fallbacks, `display: 'block'`, `preload: true`).
  - Usage: `src/app/layout.tsx` imports `archivo` and sets its `className`/`variable` on `<html>`.
- Ma Shan Zheng (Chinese) is fully self‑hosted via `@font-face`.
  - Files: `public/fonts/ma-shan-zheng/*.woff2|*.ttf`
  - Definition: `src/app/globals.css` (`@font-face` and CSS variables `--font-mashanzheng`).
- CSP blocks remote fonts: `next.config.js` sets `font-src 'self' data:` so no external font can load.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Admin AI

- Start here: `src/lib/admin/README.md` — overview, setup, architecture, diagrams, and troubleshooting
- E2E manual validation: `doc/admin-ai/e2e-manual-test.md`
- Client helpers: `src/lib/admin/chat/client/README.md`

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database (Supabase)

- This repo uses Supabase for the database and manages schema via the Supabase CLI.
- See `supabase/README.md` for:
  - Linking a project (`supabase link`),
  - Running and pushing migrations (`supabase migration new`, `supabase db push`), and
- Generating TypeScript types for the app.

## Media Uploads (Cloudinary)

- Required env: `CLOUDINARY_URL` (see `.env.example`).
- Direct uploads (admin):
  - Admin chat uploads go directly to Cloudinary via a signed request (`GET /api/upload/sign`), with a server fallback.
  - Client computes SHA‑1 and uses it as `public_id` (`unique_filename=false`, `overwrite=false`) for dedupe.
- Avatars: deterministic `public_id` `avatars/<user.id>`; reuse/overwrite to avoid duplicates.
- Temporary uploads:
  - Temp attachments are tagged `temp` and use `CLOUDINARY_TEMP_PREFIX` (default `temp-uploads/`).
  - When an image is saved to a record, it is “promoted” (moved/retagged) to a permanent folder and the DB is updated.

### Purging temporary uploads (reference‑aware)

- Recommended: schedule a platform cron (e.g., Vercel Cron) to call:

```
POST /api/admin/cloudinary/purge?days=7&dry=0&token=$ADMIN_TASK_TOKEN
```

- The purge endpoint only deletes temp assets older than the threshold that are not referenced in the DB.
- Env to set: `ADMIN_TASK_TOKEN`, optionally `CLOUDINARY_TEMP_PREFIX`, `CLOUDINARY_TEMP_RETENTION_DAYS`.

### Promotion

- Temp images used in saved records are promoted server‑side (retagged and optionally moved) before persistence, keeping a single canonical asset.
