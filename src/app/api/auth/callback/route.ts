import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (!code) {
      throw new Error('No code provided')
    }

    // Create the Supabase client with async cookie handling
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => Promise.resolve(cookieStore)
    })
    
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (authError || !user?.id || !user?.email) {
      throw new Error(authError?.message || 'Authentication failed')
    }

    // Check if this is the super admin email
    const isSuperAdmin = user.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL
    const userRole = isSuperAdmin ? 'SUPER_ADMIN' : 'USER'

    try {
      // Create or update user in database
      await prisma.user.upsert({
        where: { 
          id: user.id 
        },
        create: {
          id: user.id,
          email: user.email,
          role: userRole as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
        },
        update: {
          email: user.email,
          role: isSuperAdmin ? (userRole as 'SUPER_ADMIN') : undefined,
        },
      })

      // Update user metadata in Supabase
      await supabase.auth.updateUser({
        data: { role: userRole }
      })

      return NextResponse.redirect(new URL('/', requestUrl.origin))
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Database error:', error.message)
      }
      throw error
    }
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.redirect(
      new URL('/auth/signin?error=AuthError', request.url)
    )
  }
} 