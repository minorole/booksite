import { NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase'
import { env } from '@/lib/config/env'

function getHealthUrl(): { url: string; token?: string } {
  const embed = env.imageEmbProvider()?.toLowerCase() === 'clip' ? env.clipUrl() : undefined
  const base = embed ? (embed.endsWith('/embed') ? embed.slice(0, -'/embed'.length) : embed) : undefined
  if (!base) throw new Error('CLIP not configured')
  const token = env.clipToken()
  return { url: `${base}/health`, token }
}

export async function GET() {
  try {
    const supabase = await createRouteSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    // Super admin check via configured email
    if ((user.email || '').toLowerCase() !== env.superAdminEmail().toLowerCase()) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { url, token } = getHealthUrl()
    const start = Date.now()
    const rsp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined, cache: 'no-store' })
    const latency = Date.now() - start
    if (!rsp.ok) return NextResponse.json({ ok: false, status: rsp.status, latency_ms: latency })
    const json = await rsp.json().catch(() => ({} as any))
    return NextResponse.json({ ok: true, latency_ms: latency, details: json, url })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error)?.message || 'error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

