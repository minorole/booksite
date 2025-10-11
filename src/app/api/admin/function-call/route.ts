import { NextResponse } from 'next/server'
import { 
  analyzeBookCover,
  checkDuplicates,
  createBook,
  updateBook,
  searchBooks,
  updateOrder,
  analyzeBookAndCheckDuplicates
} from '@/lib/admin/function-handlers'
import { logOperation } from '@/lib/openai'
import { type AdminOperationResult } from '@/lib/admin/types'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'

export async function POST(request: Request) {
  try {
    console.log('📥 Function call request received')
    
    // Verify admin access
    let user
    try {
      user = await assertAdmin()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        console.log('❌ Unauthorized access attempt')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      throw e
    }

    console.log('✅ User authorized:', { email: user.email })

    const { name, arguments: args } = await request.json()
    console.log('📝 Function call details:', { name, args })

    logOperation('FUNCTION_CALL', {
      name,
      user: user.email,
      timestamp: new Date().toISOString()
    })

    const parsedArgs = JSON.parse(args)
    console.log('📝 Parsed arguments:', parsedArgs)

    let result: AdminOperationResult

    switch (name) {
      case 'analyze_book_cover':
        console.log('🔍 Starting book cover analysis')
        result = await analyzeBookCover(parsedArgs, user.email!)
        break

      case 'check_duplicates':
        console.log('🔍 Starting duplicate check')
        result = await checkDuplicates(parsedArgs, user.email!)
        break

      case 'create_book':
        console.log('📚 Creating new book')
        result = await createBook(parsedArgs, user.email!)
        break

      case 'update_book':
        console.log('📝 Updating book')
        result = await updateBook(parsedArgs, user.email!)
        break

      case 'search_books':
        console.log('🔍 Searching books')
        result = await searchBooks(parsedArgs)
        break

      case 'update_order':
        console.log('🔄 Updating order')
        result = await updateOrder(parsedArgs, user.email!)
        break

      // Keep for backward compatibility
      case 'analyze_book_and_check_duplicates':
        console.warn('⚠️ Using deprecated function')
        result = await analyzeBookAndCheckDuplicates(parsedArgs, user.email!)
        break

      default:
        console.log('❌ Unknown function:', name)
        return NextResponse.json(
          { error: `Unknown function: ${name}` },
          { status: 400 }
        )
    }

    console.log('📥 Operation result:', {
      success: result.success,
      message: result.message,
      error: result.error,
      data: result.data
    })

    logOperation('FUNCTION_SUCCESS', {
      name,
      user: user.email,
      timestamp: new Date().toISOString(),
      result: {
        success: result.success,
        data: result.data ? true : false
      }
    })

    return NextResponse.json(result)

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
