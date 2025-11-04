#!/usr/bin/env node
// Purge Cloudinary temp uploads older than a retention window.
// Usage:
//   CLOUDINARY_URL=... node scripts/cloudinary-purge-temp.mjs [days]
//   # Optional envs:
//   #   CLOUDINARY_TEMP_PREFIX (default: 'temp-uploads/')
//   #   CLOUDINARY_TEMP_RETENTION_DAYS (used if [days] arg omitted; default: 7)
//   #   DRY_RUN=1 (list, do not delete)
// Defaults: prefix 'temp-uploads/', retention 7 days.

import cloudinaryPkg from 'cloudinary';
const { v2: cloudinary } = cloudinaryPkg;

function daysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

async function main() {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL is required');
  }
  const arg = process.argv[2];
  const envDays = Number(process.env.CLOUDINARY_TEMP_RETENTION_DAYS || '');
  const days = Number.isFinite(Number(arg)) ? Number(arg) : Number.isFinite(envDays) ? envDays : 7;
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    throw new Error('Invalid days argument');
  }
  const before = daysAgo(days);
  const rawPrefix = process.env.CLOUDINARY_TEMP_PREFIX || 'temp-uploads/';
  const prefix = rawPrefix.endsWith('/') ? rawPrefix : `${rawPrefix}/`;
  const dryRun = String(process.env.DRY_RUN || '').toLowerCase() === '1' || arg === '--dry-run';

  async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  async function withRetry(fn, desc, retries = 3, baseMs = 500) {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (e) {
        attempt++;
        if (attempt > retries) throw e;
        const delay = baseMs * Math.pow(2, attempt - 1);
        console.warn(
          `[purge] ${desc} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`,
          e?.message || e,
        );
        await sleep(delay);
      }
    }
  }

  let nextCursor;
  let deleted = 0;
  let eligible = 0;
  let scanned = 0;
  console.log(
    `[purge] ${dryRun ? 'DRY-RUN: would delete' : 'Deleting'} assets tagged 'temp' or in ${prefix} older than ${before.toISOString()}`,
  );
  do {
    const expr = `(tags=temp) OR (folder="${prefix.replace(/\/$/, '')}")`;
    const res = await withRetry(
      () =>
        cloudinary.search
          .expression(expr)
          .with_field('tags')
          .sort_by('created_at', 'asc')
          .max_results(500)
          .next_cursor(nextCursor)
          .execute(),
      'search resources',
    );
    const batch = res.resources || [];
    scanned += batch.length;
    const oldOnes = batch.filter((r) => new Date(r.created_at) < before);
    eligible += oldOnes.length;
    if (!dryRun && oldOnes.length > 0) {
      const ids = oldOnes.map((r) => r.public_id);
      // Chunk deletes to reduce blast radius
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        await withRetry(
          () => cloudinary.api.delete_resources(chunk, { invalidate: true }),
          'delete resources',
        );
        deleted += chunk.length;
        console.log(`[purge] Deleted ${chunk.length} assets (cumulative ${deleted})`);
        await sleep(200);
      }
    }
    nextCursor = res.next_cursor;
    await sleep(200);
  } while (nextCursor);
  console.log(
    `[purge] Done. Scanned: ${scanned}, Eligible: ${eligible}, Deleted: ${deleted}, Days: ${days}, Prefix: ${prefix}${dryRun ? ', DRY-RUN' : ''}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
