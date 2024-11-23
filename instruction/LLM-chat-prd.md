
# LLM-Powered Chat Interface for Database Management for admins
- most important thing is fully utilize the LLM's capabilities to process natural language and image data, no preset language.
- the entire website use shadcn ui, so use the components when possible.
- export const AI_CONSTANTS = {
  MODEL: "gpt-4o",
  CONTEXT_WINDOW: 128_000,
  MAX_OUTPUT_TOKENS: 16_384,
  TEMPERATURE: 0
} as const; 

## 1. Product Overview

### 1.1 Product Vision
Create an intelligent, conversational interface powered by GPT-4o that enables administrators to interact with the database through natural language, focusing on inventory and order management for the AMTBCF Buddhist Books Distribution Platform.

### 1.2 Key Stakeholders
- AMTBCF Administrators
- Technical Maintainers
- Database Managers

## 2. Core Features

### 2.1 Inventory Management Interface
- Book listing creation and management
- Quantity tracking and updates
- Duplicate detection
- Category assignment
- Image-based book information extraction

### 2.2 Order Management Interface
- Order status tracking
- Order processing assistance
- Shipping address validation
- Inventory impact analysis

## 3. Technical Architecture

### 3.1 Core Technologies
- LLM: OpenAI GPT-4o
- Database: PostgreSQL with Prisma ORM
- Image Processing: Cloudinary
- Frontend: Next.js with Shadcn UI components

### 3.2 Integration Points
- Database Schema Mapping
- Natural Language Processing
- Image Analysis
- Logging and Auditing

### 3.3 Security Requirements
done with existing auth system, not part of the chat interface

## 4. System Enums

### 4.1 Category Types
```typescript
enum CategoryType {
    PURE_LAND_BOOKS,     // 净土佛书
    OTHER_BOOKS,         // 其他佛书
    DHARMA_ITEMS,        // 法宝
    BUDDHA_STATUES      // 佛像
}
```

### 4.2 Order Status
```typescript
enum OrderStatus {
    NEW,
    PROCESSING,
    SHIPPED,
    CANCELLED,
    COMPLETED
}
```

## 5. Data Processing Rules

### 5.1 Image Processing
- Supported Formats: JPEG, PNG, HEIC
- Max Size: 19MB
- Cloudinary Optimization
- Text Extraction Priorities:
  1. Book Title
  2. Language Detection
  3. Potential Categories
    #### 5.1.1. where image upload and image processing are used: 
      - when user uploads an image, the image is sent to cloudinary for optimization and use for book listing showing, and then image is sent to LLM for processing
      - LLM will extract the book title, language, and potential categories from the image
      - LLM will then suggest tags based on the visual content of the book cover
      - LLM will use extracted title and tags to search for existing book listings in the database (duplicate checking) if not, continue to create new book listing
        - if a similar book with similar title and tags is found, LLM will use the existing book's cloudinary image url and the new book's cloudinary image url for image data, for image comparison to check if the LLM really think is the same book. if not, continue to create new book listing
          - if the LLM thinks it is the same book, LLM will show side by side image comparison for admin to confirm along with existing book's details for admin to review and make decision, if admin confirm it is the same book, just ask what admin want to update to the existing book listing, if admin say it is not the same book, continue to create new book listing
      - Admin can review and modify the suggested tags before the book listing is created

      when admin ask LLM to search any existing book listing, if any listing is found LLM will always show the listing details with the cloudinary image url for admin to review and make decision. 


### 5.2 Validation Constraints
- Titles: Require at least one language, Must have at least one title in the book's original language (Chinese or English)
Secondary language title can be null initially and added later as translation
- Quantities: Non-negative integers
- Categories: Must match CategoryType enum
- Images: Valid Cloudinary URLs

### 5.3 Order Processing Rules
done with order system, not part of the chat interface

### 5.4 Search and Query Rules
- Multi-language search support (English/Chinese)
- Fuzzy matching for titles and tags
- Tag-based filtering:
  - Initial tag generation:
    - LLM analyzes book cover image
Automatically suggests relevant tags based on visual content
    - Example: LLM might suggest tags like "淨土", "Pure Land", "印光大師" from a book cover
  - Tag management:
    - Admin can review suggested tags
    - Admin can:
Accept suggested tags as-is
Remove irrelevant suggested tags
Add additional tags not detected by LLM
    - Modify tags for accuracy
    - Final tags are saved with the book listing after admin approval

- Category-based filtering
- Inventory level filtering

## 6. Error Handling & Logging

### 6.1 Error Categories
- Data Validation Errors
- Processing Failures
- Database Interaction Errors

### 6.2 Error Response Format
```typescript
interface ErrorResponse {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
    severity: 'WARNING' | 'ERROR' | 'CRITICAL';
}
```

### 6.3 Logging Requirements
- Comprehensive step-by-step logging
- Confidence scores for extracted data
- Error state preservation
- Admin decision tracking

## 7. multiple admin sessions
- Multiple admin sessions with their own sessions on their own devices. (existing auth system took care of this)

## 8. Scenario examples: (the language used in examples are just example, we want to fully utilize the LLM's capabilities to process natural language and image data, so no preset language what so ever)
### 8.1 Inventory Management Scenario:
Admin: [Uploads an image of a Buddhist book](image upload to cloudinary for optimization and use for book listing showing, and then image is sent to LLM for processing)
LLM: I'll process this image for you and check our database. Let me analyze it step by step.
I've detected some text from the image. Here's what I found:
Title (Chinese): 淨土十要
Title (English): Ten Essentials of Pure Land Buddhism
Category: PURE_LAND_BOOKS (净土佛书)
Suggested tags: 淨土, Pure Land, 印光大師
[Cover Image shown]
Would you like to review and modify these suggested tags before I proceed with duplicate checking?
Admin: remove "Pure Land" tag since we already have 淨土, and add "修持" tag
LLM: I've updated the information:
Title (Chinese): 淨土十要
Title (English): Ten Essentials of Pure Land Buddhism
Category: PURE_LAND_BOOKS (净土佛书)
Tags: 淨土, 印光大師, 修持
[Cover Image shown]
Let me check our database for potential duplicates...
[After database search and image comparison]
I found a similar book in our database. Let me show you both:
Existing book:
Title (Chinese): 淨土十要
Title (English): Ten Essentials of Pure Land Buddhism (Second Edition)
Category: PURE_LAND_BOOKS
Tags: 淨土, 印光大師, 修持
Quantity: 15 copies
[Cover Image shown]
Would you like to:

Update the existing listing
Create a new listing for this edition
Let me know if the extracted information needs correction

Admin: No, this is a different book. The title should be 淨土指歸
LLM: I apologize for the misunderstanding. Thank you for the correction. Here's the updated information:
Title (Chinese): 淨土指歸
Title (English): null (I don't see an English title on the cover)
Category: PURE_LAND_BOOKS (净土佛书)
Tags: 淨土, 指歸
[Cover Image shown]
How many copies would you like to add to the inventory?
Admin: 50 copies. Also add 印光大師 to the tags
LLM: Here's the final information before I create the listing:
Title (Chinese): 淨土指歸
Title (English): null
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity: 50 copies
[Cover Image shown]
Creating the listing now... Done! Would you like to make any other changes or add a description?
Admin: yes change the english title to "Pure Land Guidelines"
LLM: I'll update the English title. Here's the complete updated information:
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity: 50 copies
[Cover Image shown]
The English title has been updated. Is there anything else you'd like to modify?
Admin: show me all books with less than 20 copies
LLM: I'll search for books with low inventory (less than 20 copies). Here's what I found:
Book #1:
Title (Chinese): 淨土修持指要
Title (English): Essential Guidelines for Pure Land Practice
Category: PURE_LAND_BOOKS
Tags: 淨土, 修持
Quantity: 12 copies
[Cover Image shown]
Book #2:
Title (Chinese): 阿彌陀經講義
Title (English): Commentary on Amitabha Sutra
Category: PURE_LAND_BOOKS
Tags: 阿彌陀經, 經典
Quantity: 8 copies
[Cover Image shown]
Book #3:
Title (Chinese): 禪門修證指要
Title (English): Essential Guidelines for Chan Practice
Category: OTHER_BOOKS
Tags: 禪門, 修證
Quantity: 15 copies
[Cover Image shown]
Book #4:
Title (Chinese): 佛陀本生故事
Title (English): Buddha's Jataka Tales
Category: OTHER_BOOKS
Tags: 佛陀, 本生
Quantity: 5 copies
[Cover Image shown]
Would you like me to sort these by quantity, category, or would you like to update any of these quantities?
Admin: remove the buddha tales book, we are not planning to restock
LLM: I understand you want to remove "佛陀本生故事". Here's the current information:
Title (Chinese): 佛陀本生故事
Title (English): Buddha's Jataka Tales
Category: OTHER_BOOKS
Tags: 佛陀, 本生
Quantity: 5 copies
[Cover Image shown]
Setting quantity to 0 will effectively remove it from active inventory. Would you like me to proceed with this?
Also, would you like me to add a note in the system indicating that this item won't be restocked?
Admin: yes and yes
LLM: I've updated the book "佛陀本生故事". Here's the updated low inventory list (less than 20 copies):
Book #1:
Title (Chinese): 淨土修持指要
Title (English): Essential Guidelines for Pure Land Practice
Category: PURE_LAND_BOOKS
Tags: 淨土, 修持
Quantity: 12 copies
[Cover Image shown]
Book #2:
Title (Chinese): 阿彌陀經講義
Title (English): Commentary on Amitabha Sutra
Category: PURE_LAND_BOOKS
Tags: 阿彌陀經, 經典
Quantity: 8 copies
[Cover Image shown]
Book #3:
Title (Chinese): 禪門修證指要
Title (English): Essential Guidelines for Chan Practice
Category: OTHER_BOOKS
Tags: 禪門, 修證
Quantity: 15 copies
[Cover Image shown]
Would you like to check any other inventory levels or make additional updates?
Admin: do we have any pure land books by 印光大師?
LLM: Let me search the database for Pure Land books by Master Yin Guang:
Book #1:
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity: 50 copies
[Cover Image shown]
Book #2:
Title (Chinese): 印光大師文鈔
Title (English): Collected Works of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Quantity: 25 copies
[Cover Image shown]
Book #3:
Title (Chinese): 淨土修持指要
Title (English): Essential Guidelines for Pure Land Practice
Category: PURE_LAND_BOOKS
Tags: 淨土, 修持, 印光大師
Quantity: 12 copies
[Cover Image shown]
Would you like to see more details about any of these books or make inventory updates?
Admin: the second one is running low, add 30 more copies
LLM: I understand you want to add 30 copies to "印光大師文鈔". Let me confirm we're updating the correct book:
Title (Chinese): 印光大師文鈔
Title (English): Collected Works of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Current quantity: 25 copies
Adding: 30 copies
New total will be: 55 copies
[Cover Image shown]
Should I proceed with this update?
Admin: yes, and update the english title to "Selected Writings of Master Yin Guang"
LLM: I'll make both updates. Here's the updated information:
Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Quantity: 55 copies
[Cover Image shown]
Both changes have been applied. Is there anything else you'd like to modify?
Admin: for the book 阿彌陀經講義, i want to update its tags
LLM: Here's the current information for "阿彌陀經講義":
Title (Chinese): 阿彌陀經講義
Title (English): Commentary on Amitabha Sutra
Category: PURE_LAND_BOOKS
Tags: 阿彌陀經, 經典
Quantity: 8 copies
[Cover Image shown]
What changes would you like to make to the tags?
Admin: add 註解 and 淨土 tags
LLM: I'll update the tags. Here's the complete updated information:
Title (Chinese): 阿彌陀經講義
Title (English): Commentary on Amitabha Sutra
Category: PURE_LAND_BOOKS
Tags: 阿彌陀經, 經典, 註解, 淨土
Quantity: 8 copies
[Cover Image shown]
The tags have been updated. Would you like to make any other changes to this book?
Admin: search for books tagged with both 修持 and 淨土
LLM: I'll search for books that have both "修持" and "淨土" tags. Found 2 books:
Book #1:
Title (Chinese): 淨土修持指要
Title (English): Essential Guidelines for Pure Land Practice
Category: PURE_LAND_BOOKS
Tags: 淨土, 修持, 印光大師
Quantity: 12 copies
[Cover Image shown]
Book #2:
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 修持, 印光大師
Quantity: 50 copies
[Cover Image shown]
Would you like to see more details about any of these books?

### 8.2 Order Management Scenario:
Admin: show me new orders that need processing
LLM: I'll check for new orders in the system. Found 3 new orders with NEW status:
Order #1242 (Received 2 hours ago)
Status: NEW
Items:

Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity ordered: 2
[Cover Image shown]
Book ID: BK-2024-0389
Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: John Smith
Phone: +1 (555) 123-4567
Email: john.smith@email.com
Address: 123 Dharma Street, Unit 5
Pure Land City, PL 12345
Notes: Need before the end of month

Order #1243 (Received 1 hour ago)
Status: NEW
Items:

Book ID: BK-2024-0156
Title (Chinese): 阿彌陀經講義
Title (English): Commentary on Amitabha Sutra
Category: PURE_LAND_BOOKS
Tags: 阿彌陀經, 經典, 註解, 淨土
Quantity ordered: 5
[Cover Image shown]

Shipping Information:
Name: Mary Johnson
Phone: +1 (555) 987-6543
Email: mary.j@email.com
Address: 456 Buddha Avenue
Dharma City, DC 54321
Notes: null

Order #1244 (Just received)
Status: NEW
Items:

Book ID: BK-2024-0233
Title (Chinese): 禪門修證指要
Title (English): Essential Guidelines for Chan Practice
Category: OTHER_BOOKS
Tags: 禪門, 修證
Quantity ordered: 3
[Cover Image shown]
Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: David Chen
Phone: +1 (555) 246-8135
Email: d.chen@email.com
Address: 789 Meditation Lane
Zen Valley, ZV 98765
Notes: Urgent request - Needed for study group next week
Would you like to process any of these orders?
Admin: i will start with order 1242
LLM: I'll help process Order #1242.

Setting status to PROCESSING
Confirmation email sent to john.smith@email.com

Here's the order details for your reference:
Order #1242 (Updated to PROCESSING)
Items:

Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity ordered: 2
[Cover Image shown]
Book ID: BK-2024-0389
Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: John Smith
Phone: +1 (555) 123-4567
Email: john.smith@email.com
Address: 123 Dharma Street, Unit 5
Pure Land City, PL 12345
Notes: Need before the end of month
Admin: the tracking number is TBD-24022-1242
LLM: Updates made to Order #1242:

Tracking number added: TBD-24022-1242
Status updated from PROCESSING to SHIPPED
Shipping confirmation email sent to john.smith@email.com with tracking number




Would you like to make any other updates?
Admin: show me all orders that are processing
LLM: Here are all orders currently with PROCESSING status:
Order #1244 (Updated 30 minutes ago)
Status: PROCESSING
Items:

Book ID: BK-2024-0233
Title (Chinese): 禪門修證指要
Title (English): Essential Guidelines for Chan Practice
Category: OTHER_BOOKS
Tags: 禪門, 修證
Quantity ordered: 3
[Cover Image shown]
Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: David Chen
Phone: +1 (555) 246-8135
Email: d.chen@email.com
Address: 789 Meditation Lane
Zen Valley, ZV 98765
Notes: Urgent request - Needed for study group next week

Order #1239 (Updated 1 hour ago)
Status: PROCESSING
Items:

Book ID: BK-2024-0167
Title (Chinese): 佛門修持指南
Title (English): Buddhist Practice Guide
Category: OTHER_BOOKS
Tags: 佛門, 修持
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: Sarah Williams
Phone: +1 (555) 777-9999
Email: s.williams@email.com
Address: 321 Temple Road
Dharma Valley, DV 67890
Notes: null
Would you like to update any of these orders?
Admin: update order 1239 to shipped with no tracking number
LLM: Updates made to Order #1239:

Status updated from PROCESSING to SHIPPED
No tracking number added (as requested)
Shipping confirmation email sent to s.williams@email.com




Remaining orders in PROCESSING status:
Order #1244 (David Chen)
Would you like to process any other orders?
Admin: show me all orders that are shipped last week
LLM: Here are all orders with SHIPPED status from last 7 days:
Order #1242
Status: SHIPPED
Items:

Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity ordered: 2
[Cover Image shown]
Book ID: BK-2024-0389
Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Category: PURE_LAND_BOOKS
Tags: 印光大師, 淨土, 文鈔
Quantity ordered: 1
[Cover Image shown]

Shipping Information:
Name: John Smith
Tracking Number: TBD-24022-1242
Notes: Need before the end of month
Would you like to make any updates to the shipped orders?
Admin: mark order 1242 as completed
LLM: Updates made to Order #1242:

Status updated from SHIPPED to COMPLETED
No further action needed

Order details archived:
Order #1242 (Completed)
Items:

Book ID: BK-2024-0472
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Quantity ordered: 2
Book ID: BK-2024-0389
Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Quantity ordered: 1

Customer: John Smith
Tracking Number: TBD-24022-1242
Notes: Need before the end of month
Would you like to perform any other order operations?
## 9. Target LLM admin chat interface related file structure (simplified file structure that fully utilizes the LLM's capabilities to process natural language and image data and not over complicate the code)

src/
├── app/
│   ├── admin/
│   │   └── ai-chat/
│   │       └── page.tsx               # Admin chat interface page
│   │           - Handles auth protection
│   │           - Loads chat interface
│   │           - Manages chat state
│   │
│   └── api/
│       └── admin/
│           └── ai-chat/
│               └── route.ts           # Admin LLM API endpoint
│                   - Handles image uploads
│                   - Manages LLM interactions
│                   - Processes database operations
│                   - Error handling

├── components/
│   └── admin/
│       └── ai-chat/
│           ├── chat-interface.tsx     # Main chat container
│           │   - Message display
│           │   - Chat history
│           │   - Loading states
│           │   - Error displays
│           │
│           ├── chat-input.tsx         # Input component
│           │   - Text input
│           │   - File upload
│           │   - Image preview
│           │   - Send button
│           │
│           ├── message-item.tsx       # Individual message component
│           │   - Text formatting
│           │   - Image display
│           │   - Action buttons
│           │   - Status indicators
│           │
│           └── book-preview.tsx       # Book preview in chat
│               - Cover image
│               - Title display
│               - Quick actions
│               - Inventory status

├── lib/
│   └── admin/
│       ├── ai/
│       │   ├── llm-manager.ts         # Core LLM logic
│       │   │   - GPT-4o integration
│       │   │   - Context management
│       │   │   - Response processing
│       │   │   - Error handling
│       │   │
│       │   ├── context-builder.ts     # Context generation
│       │   │   - Database context
│       │   │   - Chat history context
│       │   │   - System prompts
│       │   │   - Image analysis
│       │   │
│       │   ├── image-processor.ts     # Image handling
│       │   │   - Cloudinary integration
│       │   │   - Image optimization
│       │   │   - Text extraction
│       │   │   - Format validation
│       │   │
│       │   └── prompt-templates.ts    # System prompts
│       │       - Book management
│       │       - Order processing
│       │       - Inventory updates
│       │       - Error responses
│       │
│       ├── services/
│       │   ├── book-service.ts        # Book operations
│       │   │   - CRUD operations
│       │   │   - Search functionality
│       │   │   - Category management
│       │   │   - Tag management
│       │   │
│       │   ├── order-service.ts       # Order operations
│       │   │   - Status updates
│       │   │   - Processing logic
│       │   │   - Shipping management
│       │   │   - Customer communication
│       │   │
│       │   └── inventory-service.ts   # Inventory management
│       │       - Stock updates
│       │       - Availability checks
│       │       - Low stock alerts
│       │       - History tracking
│       │
│       └── utils/
│           ├── validators.ts          # Input validation
│           │   - Book data validation
│           │   - Order validation
│           │   - Address validation
│           │   - Image validation
│           │
│           ├── formatters.ts          # Data formatting
│           │   - Message formatting
│           │   - Response formatting
│           │   - Error formatting
│           │   - Date formatting
│           │
│           └── error-handler.ts       # Error handling
│               - Error classification
│               - Error messages
│               - Error logging
│               - Recovery strategies

└── types/
    └── admin/
        └── chat.ts                    # Type definitions
            - Message types
            - Response types
            - Action types
            - State types


Key Benefits of This Architecture

Centralized Intelligence: Instead of spreading decision-making across multiple specialized components, we let the LLM handle:

Image analysis
Duplicate detection
Category suggestions
Natural language processing
Business logic decisions


Simplified Data Flow:

Frontend → API → LLM Manager → Database/Cloudinary
All processing happens in the LLM
Backend components focus on data access and storage


Reduced Complexity:

Fewer specialized components
Less maintenance
Easier to update as LLM capabilities improve


Better Context Awareness:

LLM has access to all relevant information
Can make more informed decisions
Natural handling of edge cases



Implementation Strategy

Start with Core Components:

LLM Manager
Context Builder
Basic database operations


Add Features Incrementally:

Image handling
Complex queries
Advanced context building


Focus on Data Quality:

Clean database access
High-quality image processing
Rich context building

## 10. env set up (just structure, no actual values)
# database
DATABASE_URL=
DIRECT_URL=
# openai for gpt-4o
OPENAI_API_KEY=
# cloudinary
CLOUDINARY_URL=cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz1234@cloud_name
