import { NextResponse } from 'next/server'
import { handleImageUpload } from '@/lib/admin/image-upload'
import { env } from '@/lib/config/env'
import { assertAdmin, UnauthorizedError, getAuthUser } from '@/lib/security/guards'
import { checkRateLimit, rateLimitHeaders, acquireConcurrency, releaseConcurrency } from '@/lib/security/ratelimit'

export async function POST(request: Request) {
  try {
    console.log('📥 Starting file upload process...')
    
    // Verify admin access (DB authoritative)
    let user
    try {
      user = await assertAdmin()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      throw e
    }

    // Apply rate limit
    const rl = await checkRateLimit({ route: '/api/upload', userId: user.id })
    if (rl.enabled && !rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }
    

    // Concurrency control for uploads
    const sem = await acquireConcurrency({ route: '/api/upload', userId: user.id, ttlSeconds: 60 })
    if (sem.enabled && !sem.acquired) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }

    const roleMeta = ((user.user_metadata ?? null) as Record<string, unknown> | null)?.role as string | undefined
    console.log('✅ User authorized:', {
      email: user.email,
      role: roleMeta,
    })

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    // Choose folder: allow temporary uploads via query ?temp=1
    const isTemp = new URL(request.url).searchParams.get('temp') === '1'
    const rawPrefix = env.cloudinaryTempPrefix?.() || 'temp-uploads/'
    const tempFolder = rawPrefix.endsWith('/') ? rawPrefix.slice(0, -1) : rawPrefix
    const secureUrl = await handleImageUpload(file, {
      folder: isTemp ? tempFolder : undefined,
      tags: isTemp ? ['temp'] : undefined,
    })
    console.log('📤 Upload complete:', secureUrl)

    return NextResponse.json(
      { url: secureUrl },
      { headers: rl.enabled ? rateLimitHeaders(rl) : undefined }
    )

  } catch (error) {
    console.error('❌ Upload error:', error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error)

    // Return specific error messages for known errors
    if (error instanceof Error) {
      switch (error.message) {
        case 'No file provided':
          return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        case 'Invalid file type':
          return NextResponse.json({ 
            error: 'Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed.' 
          }, { status: 400 })
        case 'File too large':
          return NextResponse.json({ 
            error: 'File too large. Maximum size is 10MB.' 
          }, { status: 400 })
        case 'Invalid image URL':
        case 'Invalid Cloudinary URL':
          return NextResponse.json({ 
            error: 'Failed to generate valid image URL' 
          }, { status: 500 })
        case 'Upload timeout':
          return NextResponse.json({
            error: 'Upload timed out. Please try again.'
          }, { status: 500 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
  finally {
    try {
      const user = await getAuthUser()
      if (user) {
        await releaseConcurrency({ route: '/api/upload', userId: user.id, ttlSeconds: 60 })
      }
    } catch (e) {
      console.error('releaseConcurrency failed', e)
    }
  }
}
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
