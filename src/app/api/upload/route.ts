import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { type AllowedMimeType } from '@/lib/admin/types'
import { FILE_CONFIG, CLOUDINARY_CONFIG } from '@/lib/admin/constants'

// Parse Cloudinary URL from environment variable
const cloudinaryUrl = process.env.CLOUDINARY_URL
if (!cloudinaryUrl) {
  throw new Error('CLOUDINARY_URL is not defined')
}

// Extract credentials from cloudinary URL
const match = cloudinaryUrl.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/)
if (!match) {
  throw new Error('Invalid CLOUDINARY_URL format')
}

const [_, api_key, api_secret, cloud_name] = match

// Configure Cloudinary
cloudinary.config({
  cloud_name,
  api_key,
  api_secret,
  secure: true,
})

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
    
    // Validate file
    if (!file) {
      console.log('❌ No file provided in request')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('📁 File details:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    })

    // Check file type
    if (!FILE_CONFIG.ALLOWED_TYPES.includes(file.type as AllowedMimeType)) {
      console.log('❌ Invalid file type:', file.type)
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed.' 
      }, { status: 400 })
    }

    // Check file size
    if (file.size > FILE_CONFIG.MAX_SIZE) {
      console.log('❌ File too large:', `${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 })
    }

    console.log('✅ File validation passed')

    // Convert file to base64
    console.log('🔄 Converting file to base64...')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64File = buffer.toString('base64')
    const dataURI = `data:${file.type};base64,${base64File}`
    console.log('✅ File converted to base64')

    // Upload to Cloudinary
    console.log('📤 Uploading to Cloudinary...')
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: CLOUDINARY_CONFIG.FOLDER,
      resource_type: 'auto',
      transformation: CLOUDINARY_CONFIG.TRANSFORMATION
    })
    console.log('✅ Cloudinary upload successful:', {
      publicId: result.public_id,
      format: result.format,
      size: `${(result.bytes / 1024 / 1024).toFixed(2)}MB`,
      width: result.width,
      height: result.height
    })

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id
    })
  } catch (error) {
    console.error('❌ Upload error:', error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
} 