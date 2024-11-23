import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminLogService } from '@/lib/admin/services/admin-log-service';
import { AppError } from '@/lib/admin/utils/error-handler';

// Add logging utility
const log = {
  api: (message: string, data?: any) => {
    console.log(`🏷️ [Tags API] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  },
  error: (message: string, error: any) => {
    console.error(`❌ [Tags Error] ${message}`, error)
  }
}

export async function POST(request: Request) {
  try {
    const { tag, action, bookId } = await request.json();
    log.api('Processing tag action:', { tag, action, bookId })

    // First get current book data
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title_zh: true,
        pending_tags: true,
        search_tags: true,
        rejected_tags: true
      }
    });

    if (!book) {
      throw new AppError({
        type: 'VALIDATION_ERROR',
        message: 'Book not found'
      });
    }

    // Update book tags based on action
    if (action === 'approve') {
      await prisma.book.update({
        where: { id: bookId },
        data: {
          search_tags: {
            push: tag
          },
          pending_tags: book.pending_tags.filter((t: string) => t !== tag)
        }
      });

      // Log the action
      await adminLogService.logAction({
        action: 'APPROVE_TAG',
        bookId,
        bookTitle: book.title_zh,
        metadata: { tag },
        sessionId: undefined
      });
    } else if (action === 'reject') {
      await prisma.book.update({
        where: { id: bookId },
        data: {
          rejected_tags: {
            push: tag
          },
          pending_tags: book.pending_tags.filter((t: string) => t !== tag)
        }
      });

      // Log the action
      await adminLogService.logAction({
        action: 'REJECT_TAG',
        bookId,
        bookTitle: book.title_zh,
        metadata: { tag },
        sessionId: undefined
      });
    }

    return NextResponse.json({ 
      success: true,
      message: `Tag ${action}ed successfully`
    });
  } catch (error) {
    log.error('Tag action error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json({ 
        error: error.message,
        details: error.type
      }, { 
        status: error.type === 'VALIDATION_ERROR' ? 400 : 500 
      });
    }

    return NextResponse.json(
      { error: 'Failed to process tag action' },
      { status: 500 }
    );
  }
} 