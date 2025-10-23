import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import { backfillMissingTextEmbeddings } from '@/lib/admin/services/embeddings'

export async function POST(request: Request) {
  try {
    try {
      await assertAdmin()
    } catch (e) {
      if (e instanceof UnauthorizedError) return new NextResponse('Unauthorized', { status: 401 })
      throw e
    }

    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') || '100')
    const batch = Number(url.searchParams.get('batch') || '10')
    const result = await backfillMissingTextEmbeddings(limit, batch)
    return NextResponse.json(result)
  } catch (error) {
    return new NextResponse('Backfill error', { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

