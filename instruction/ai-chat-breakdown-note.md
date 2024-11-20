
1. Core Types (src/lib/ai/types.ts)
BookState interface for book data structure
ChatState for managing chat UI state
ChatMessage for message structure
AssistantResponse for AI responses
ChatAPIAction for command types
ChatResponseData for API responses
State Management
BookCreationState class for managing book data
Chat state reducer in ChatBox component
Proper state updates with type safety
Command Pattern (src/lib/commands/)
BaseCommand abstract class
CreateBookCommand for new books
UpdateBookCommand for existing books
CommandFactory for instantiating commands
4. AI Integration (src/lib/ai/)
Structured prompts for different tasks
Image analysis handler
Chat response handler
Proper error handling for AI responses
UI Components
ChatBox main component
ChatInput for user input
ChatMessages for displaying conversation
Image upload handling
Error & Logging
Error handler utility
Logging system with different levels
Type-safe error handling
Chat Route (src/app/api/admin/chat/route.ts)
Image processing
Chat message handling
Command execution
Duplicate detection
State updates
Key Features:
Bilingual support (EN/ZH)
Image analysis
Duplicate detection
State preservation
Command-based updates
Real-time chat interface
Note: The API middleware was not implemented as it was deemed unnecessary given the existing auth setup.