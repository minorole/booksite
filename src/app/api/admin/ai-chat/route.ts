import { openai } from '@/lib/openai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AI_MODELS, type Message, type MessageContent, convertToOpenAIMessage } from '@/lib/admin/constants';
import { adminTools } from '@/lib/admin/function-definitions';
import { createBook, updateBook, updateOrderStatus, searchBooks } from '@/lib/admin/function-handlers';
import { ADMIN_SYSTEM_PROMPT } from '@/lib/admin/system-prompts';
import type OpenAI from 'openai';
import type { User } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // Verify admin access
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.user_metadata?.role)) {
      console.log('❌ Unauthorized access attempt:', {
        email: user?.email,
        role: user?.user_metadata?.role
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages }: { messages: Message[] } = await request.json();

    // Add system prompt if not present
    if (!messages.find((m: Message) => m.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: ADMIN_SYSTEM_PROMPT
      });
    }

    console.log('🔄 Sending request to OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: AI_MODELS.ADMIN,
      messages: messages.map(convertToOpenAIMessage),
      tools: adminTools,
      tool_choice: "auto"
    });

    const responseMessage = completion.choices[0].message;
    
    // Handle function calls
    if (responseMessage.tool_calls) {
      console.log('🛠️ Function call detected:', {
        function: responseMessage.tool_calls[0].function.name,
        timestamp: new Date().toISOString()
      });

      try {
        const toolCall = responseMessage.tool_calls[0];
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        // Log the function call details
        console.log('📝 Function details:', {
          name: functionName,
          args: args
        });
        
        let functionResult;
        switch (functionName) {
          case 'search_books':
            functionResult = await searchBooks(args);
            break;
          case 'create_book':
            functionResult = await createBook(args, user.email!);
            break;
          case 'update_book':
            functionResult = await updateBook(args, user.email!);
            break;
          default:
            throw new Error(`Unknown function: ${functionName}`);
        }

        // Add results to conversation
        messages.push({
          role: 'assistant',
          content: responseMessage.content || '',
          tool_call_id: toolCall.id
        });
        
        messages.push({
          role: 'tool',
          content: JSON.stringify(functionResult),
          tool_call_id: toolCall.id,
          name: functionName
        });

        // Let LLM process the result
        const finalResponse = await openai.chat.completions.create({
          model: AI_MODELS.ADMIN,
          messages: messages.map(convertToOpenAIMessage),
          tools: adminTools,
          tool_choice: "auto"
        });

        console.log('✅ Operation completed');
        return NextResponse.json({ 
          message: finalResponse.choices[0].message 
        });

      } catch (error) {
        console.error('❌ Function execution failed:', error);
        return NextResponse.json({ 
          message: {
            role: 'assistant',
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      }
    }

    return NextResponse.json({ 
      message: responseMessage 
    });
  } catch (error) {
    console.error('❌ Error in AI chat:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 