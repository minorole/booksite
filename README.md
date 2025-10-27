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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

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
- Idempotent uploads:
  - Avatars use a deterministic `public_id` `avatars/<user.id>` and reuse/overwrite instead of creating duplicates.
  - Admin uploads (book covers/items) dedupe by content: files are hashed and stored under `book-covers/<sha1>`; identical files reuse the same asset.
- Temporary uploads:
  - Chat attachments upload to `temp-uploads/` via `POST /api/upload?temp=1`.
  - Use a periodic purge to delete old temp assets (default 7 days).

### Purging temporary uploads

- Run locally or in a cron with `CLOUDINARY_URL` set:

```
npm run cloudinary:purge-temp -- 7
```

- Omit the argument to default to 7 days. Only assets under `temp-uploads/` older than the threshold are deleted.

### Automated cleanup (recommended)

- GitHub Actions (built-in):
  - A workflow is included at `.github/workflows/purge-cloudinary-temp.yml` that runs daily at 03:00 UTC.
  - Set the repo secret `CLOUDINARY_URL` in GitHub → Settings → Secrets and variables → Actions.
  - Triggers: nightly cron and manual “Run workflow”.

- Vercel Cron (alternative):
  - Set an `ADMIN_TASK_TOKEN` in your project environment.
  - Add a cron job in Vercel to POST:
    `/api/admin/cloudinary/purge-temp?days=7&token=YOUR_ADMIN_TASK_TOKEN`
  - The endpoint also accepts a header `X-Admin-Task-Token: YOUR_ADMIN_TASK_TOKEN`.

### Promotion (optional)

- If a temp image becomes part of a saved record, prefer “promoting” it (rename/move to `book-covers/<sha1>` and update the DB reference) instead of reuploading, to keep a single canonical asset.
