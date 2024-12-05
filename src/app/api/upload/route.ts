import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { handleImageUpload } from '@/lib/admin/image-upload'

export async function POST(request: Request) {
  try {
    console.log('📥 Starting file upload process...')
    
    // Verify admin access
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.user_metadata?.role)) {
      console.log('❌ Unauthorized access attempt:', {
        email: user?.email,
        role: user?.user_metadata?.role
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authorized:', {
      email: user.email,
      role: user.user_metadata?.role
    })

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    // Use centralized image upload handler with retries
    const secureUrl = await handleImageUpload(file)
    console.log('📤 Upload complete:', secureUrl)

    return NextResponse.json({
      url: secureUrl,
      publicId: secureUrl.split('/').pop()?.split('.')[0]
    })

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
} 