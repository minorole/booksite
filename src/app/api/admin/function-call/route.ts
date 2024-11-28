import { NextResponse } from 'next/server'
import { analyzeBookAndCheckDuplicates } from '@/lib/admin/function-handlers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { logOperation } from '@/lib/openai'
import { type AdminOperationResult } from '@/lib/admin/types'

export async function POST(request: Request) {
  try {
    console.log('📥 Function call request received')
    
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

    const { name, arguments: args } = await request.json()
    console.log('📝 Function call details:', { name, args })

    logOperation('FUNCTION_CALL', {
      name,
      user: user.email,
      timestamp: new Date().toISOString()
    })

    switch (name) {
      case 'analyze_book_and_check_duplicates':
        console.log('🔍 Starting book analysis and duplicate check')
        const parsedArgs = JSON.parse(args)
        console.log('📝 Parsed arguments:', parsedArgs)

        console.log('📤 Calling analyzeBookAndCheckDuplicates with:', {
          book_info: parsedArgs.book_info,
          image_url: parsedArgs.image_url
        })

        const result = await analyzeBookAndCheckDuplicates(
          parsedArgs,
          user.email!
        ) as AdminOperationResult

        console.log('📥 Analysis result:', {
          success: result.success,
          message: result.message,
          error: result.error,
          data: result.data
        })

        const hasMatches = result.data?.analysis_result?.matches?.length ?? 0 > 0

        console.log('✅ Analysis complete:', {
          success: result.success,
          hasMatches
        })

        logOperation('FUNCTION_SUCCESS', {
          name,
          user: user.email,
          timestamp: new Date().toISOString(),
          result: {
            success: result.success,
            hasMatches
          }
        })

        return NextResponse.json(result)

      default:
        console.log('❌ Unknown function:', name)
        return NextResponse.json(
          { error: `Unknown function: ${name}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('❌ Function execution error:', error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error)

    logOperation('FUNCTION_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Function execution failed' },
      { status: 500 }
    )
  }
} 