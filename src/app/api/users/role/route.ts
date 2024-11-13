import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Verify super admin status
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.email !== process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role || !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Prevent changing super admin's role
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (targetUser?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Cannot modify super admin role' }, 
        { status: 403 }
      )
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role }
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 