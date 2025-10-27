#!/usr/bin/env ts-node
/*
  Purge Cloudinary temp uploads older than a retention window.
  Usage:
    OPENAI_API_KEY=... CLOUDINARY_URL=... ts-node scripts/cloudinary-purge-temp.ts [days]
  Defaults to 7 days if not specified.
*/

import { v2 as cloudinary } from 'cloudinary'

function daysAgo(days: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

async function main() {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL is required')
  }
  const days = Number(process.argv[2] || '7')
  if (!Number.isFinite(days) || days < 1) {
    throw new Error('Invalid days argument')
  }
  const before = daysAgo(days)
  const prefix = 'temp-uploads/'
  let nextCursor: string | undefined
  let deleted = 0
  console.log(`[purge] Deleting assets under ${prefix} older than ${before.toISOString()}`)
  do {
    const res = await cloudinary.api.resources({
      type: 'upload',
      prefix,
      max_results: 500,
      next_cursor: nextCursor,
    }) as any
    const batch = (res.resources || []) as Array<{ public_id: string; created_at: string }>
    const oldOnes = batch.filter((r) => new Date(r.created_at) < before)
    if (oldOnes.length > 0) {
      const ids = oldOnes.map((r) => r.public_id)
      const del = await cloudinary.api.delete_resources(ids, { invalidate: true })
      const count = Array.isArray(ids) ? ids.length : 0
      deleted += count
      console.log(`[purge] Deleted ${count} assets (cumulative ${deleted})`)
    }
    nextCursor = (res as any).next_cursor
  } while (nextCursor)
  console.log(`[purge] Done. Total deleted: ${deleted}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

