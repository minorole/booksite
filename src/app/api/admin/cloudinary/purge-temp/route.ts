import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/security/guards'
import { env } from '@/lib/config/env'

export async function POST(request: Request) {
  try {
    // Authorization: allow either (1) admin session or (2) token via header/query for cron
    const url = new URL(request.url)
    const qToken = url.searchParams.get('token') || undefined
    const hToken = request.headers.get('x-admin-task-token') || undefined
    const taskToken = env.adminTaskToken?.()
    const tokenOk = !!taskToken && (qToken === taskToken || hToken === taskToken)
    if (!tokenOk) {
      await assertAdmin()
    }
    // Ensure Cloudinary is configured
    env.cloudinaryUrl()
    const { v2: cloudinary } = await import('cloudinary')

    const daysParam = url.searchParams.get('days')
    const days = Math.max(1, Math.min(365, Number(daysParam || '7')))
    const before = new Date()
    before.setUTCDate(before.getUTCDate() - days)

    const prefix = 'temp-uploads/'
    let next_cursor: string | undefined
    let deleted = 0
    do {
      const res = await cloudinary.api.resources({
        type: 'upload',
        prefix,
        max_results: 500,
        next_cursor,
      }) as any
      const batch = (res.resources || []) as Array<{ public_id: string; created_at: string }>
      const oldOnes = batch.filter((r) => new Date(r.created_at) < before)
      if (oldOnes.length > 0) {
        const ids = oldOnes.map((r) => r.public_id)
        await cloudinary.api.delete_resources(ids, { invalidate: true })
        deleted += ids.length
      }
      next_cursor = (res as any).next_cursor
    } while (next_cursor)

    return NextResponse.json({ success: true, deleted, days })
  } catch (error) {
    console.error('purge-temp failed', error)
    return NextResponse.json({ success: false, error: 'Failed to purge temp uploads' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
