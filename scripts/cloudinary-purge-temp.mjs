#!/usr/bin/env node
// Purge Cloudinary temp uploads older than a retention window.
// Usage:
//   CLOUDINARY_URL=... node scripts/cloudinary-purge-temp.mjs [days]
// Defaults to 7 days if not specified.

import cloudinaryPkg from 'cloudinary'
const { v2: cloudinary } = cloudinaryPkg

function daysAgo(days) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

async function main() {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL is required')
  }
  const daysArg = process.argv[2]
  const days = Number(daysArg || '7')
  if (!Number.isFinite(days) || days < 1) {
    throw new Error('Invalid days argument')
  }
  const before = daysAgo(days)
  const prefix = 'temp-uploads/'
  let nextCursor
  let deleted = 0
  console.log(`[purge] Deleting assets under ${prefix} older than ${before.toISOString()}`)
  do {
    const res = await cloudinary.api.resources({
      type: 'upload',
      prefix,
      max_results: 500,
      next_cursor: nextCursor,
    })
    const batch = (res.resources || [])
    const oldOnes = batch.filter((r) => new Date(r.created_at) < before)
    if (oldOnes.length > 0) {
      const ids = oldOnes.map((r) => r.public_id)
      await cloudinary.api.delete_resources(ids, { invalidate: true })
      const count = Array.isArray(ids) ? ids.length : 0
      deleted += count
      console.log(`[purge] Deleted ${count} assets (cumulative ${deleted})`)
    }
    nextCursor = res.next_cursor
  } while (nextCursor)
  console.log(`[purge] Done. Total deleted: ${deleted}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
