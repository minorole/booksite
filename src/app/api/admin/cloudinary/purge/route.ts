import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/security/guards'
import { env } from '@/lib/config/env'
import { getServerDb } from '@/lib/db/client'

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const qToken = url.searchParams.get('token') || undefined
    const hToken = request.headers.get('x-admin-task-token') || undefined
    const taskToken = env.adminTaskToken?.()
    const tokenOk = !!taskToken && (qToken === taskToken || hToken === taskToken)
    if (!tokenOk) {
      await assertAdmin()
    }

    env.cloudinaryUrl()
    const { v2: cloudinary } = await import('cloudinary')
    const db = await getServerDb()

    const daysParam = url.searchParams.get('days')
    const envDays = Number(env.cloudinaryTempRetentionDays?.() || '')
    const daysInput = Number.isFinite(Number(daysParam)) ? Number(daysParam) : (Number.isFinite(envDays) ? envDays : 7)
    const days = Math.max(1, Math.min(365, daysInput))
    const before = new Date()
    before.setUTCDate(before.getUTCDate() - days)

    const dry = url.searchParams.get('dry') === '1'
    const rawPrefix = env.cloudinaryTempPrefix?.() || 'temp-uploads/'
    const prefix = rawPrefix.endsWith('/') ? rawPrefix : `${rawPrefix}/`

    async function sleep(ms: number) { return new Promise<void>((resolve) => setTimeout(resolve, ms)) }
    async function withRetry<T>(fn: () => Promise<T>, desc: string, retries = 3, baseMs = 500): Promise<T> {
      for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
          return await fn()
        } catch (e) {
          if (attempt === retries + 1) throw e
          const delay = baseMs * Math.pow(2, attempt - 1)
          console.warn(`[purge] ${desc} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`, (e as any)?.message || e)
          await sleep(delay)
        }
      }
      throw new Error('withRetry exhausted')
    }

    let nextCursor: string | undefined
    let scanned = 0
    let eligible = 0
    let referenced = 0
    let deleted = 0
    do {
      const expr = `(tags=temp) OR (folder="${prefix.replace(/\/$/, '')}")`
      const res = await withRetry<any>(
        () => cloudinary.search
          .expression(expr)
          .with_field('tags')
          .sort_by('created_at','asc')
          .max_results(500)
          .next_cursor(nextCursor)
          .execute(),
        'search resources'
      )
      const batch = (res.resources || []) as Array<{ public_id: string; created_at: string; secure_url?: string }>
      scanned += batch.length
      const oldOnes = batch.filter((r) => new Date(r.created_at) < before)
      eligible += oldOnes.length

      // Reference-aware filter: exclude assets whose secure_url is referenced in DB
      for (const r of oldOnes) {
        const secureUrl = r.secure_url || cloudinary.url(r.public_id, { secure: true })
        const { data: used } = await db.from('books').select('id').eq('cover_image', secureUrl).limit(1)
        const isReferenced = (used ?? []).length > 0
        if (isReferenced) {
          referenced++
          continue
        }
        if (!dry) {
          await withRetry(() => cloudinary.api.delete_resources([r.public_id], { invalidate: true }), 'delete resource')
          deleted++
          await sleep(50)
        }
      }

      nextCursor = (res as any).next_cursor
      await sleep(200)
    } while (nextCursor)

    return NextResponse.json({ success: true, days, prefix, dry_run: dry, scanned, eligible, referenced, deleted })
  } catch (error) {
    console.error('reference-aware purge failed', error)
    return NextResponse.json({ success: false, error: 'Failed to purge temp uploads' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

