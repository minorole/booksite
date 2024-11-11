import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = session
    
    // Check if user exists
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!dbUser) {
      // Create new user
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          role: user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? 'ADMIN' : 'USER',
        }
      })
    }

    return NextResponse.json({ user: dbUser })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 