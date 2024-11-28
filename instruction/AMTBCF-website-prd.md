# AMTBCF Buddhist Books Distribution Platform 

## General Requirements
- All features should have detailed logs for debugging and auditing.
- The LLM interface fully utilizes gpt-4o and gpt-4o-mini's natural language processing, and long context window capabilities without preset language restrictions, or session memory management.
- Free distribution model - no payment processing required.
- the website will have a super admin that can control everything, the super admin email is stored in the .env file with the key `NEXT_PUBLIC_SUPER_ADMIN_EMAIL`. when this user sign up, the system will automatically grant this user super admin role.
- the website will support bilingual interface, with English and Chinese.all users can speak both languages.
- use shadcn ui for the frontend components.
- core tech: 
  **Frontend:**
    - Next.js 14 with App Router
    - Shadcn UI components
    - Tailwind CSS
    - React for interactive components
    - SSR optimization
  **Backend:**
    - PostgreSQL with Prisma ORM
    - Supabase Auth for Magic Link emails
    - Cloudinary for image management
  **LLM Integration:**
    - OpenAI GPT-4o family models, gpt-4o-mini for user LLM interface, gpt-4o for admin LLM interface.
- we use */admin/ai-chat/* and */user/ai-chat/* type of naming convention for everything. 
- current .env set up (just structure, no actual values)
# database
DATABASE_URL=
DIRECT_URL=
# openai for gpt-4o
OPENAI_API_KEY=
# cloudinary
CLOUDINARY_URL=cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz1234@cloud_name

## Technical Implementation Requirements

### 1. Core Chat Features
- Real-time chat interface that supports both English and Chinese
- Image upload and display capability
- Message history display with different message types (text, images, function results)
- Simple input area with text input and image upload button
- Loading states for all operations

### 2. OpenAI Integration Features
- GPT-4o model integration with vision capabilities
- Function calling system for database operations
- Long context window utilization (128k tokens)
- No artificial memory management - rely on GPT-4o's capabilities
- Streaming response handling

### 3. Image Processing Features
- Image upload to Cloudinary
- Image optimization
- Send optimized images to GPT-4o for analysis
- Display uploaded images in chat
- Store image analysis results

### 4. Database Operation Features
Book Management:
- Create new book listings
- Update existing books
- Search books by various criteria
- Check inventory levels
- Tag management
- Duplicate detection

Order Management:
- View new/processing orders
- Update order status
- Add tracking numbers
- Mark orders as completed

### 5. Function System Features
Essential functions needed:
- Book operations (create, update, search, inventory)
- Order operations (view, update status, tracking)
- Image analysis (book cover analysis, duplicate check)
- Tag management (add, remove, update)
- Database queries (search, filter)

### 6. Error Handling Features
- User-friendly error messages in both languages
- Detailed error logging
- Graceful failure handling
- Toast notifications for status updates

### 7. UI/UX Features
- Clean, minimal chat interface
- Clear loading states
- Image preview
- Error feedback
- Responsive design
- Bilingual support

### 8. Data Flow Features
- Real-time chat updates
- Async function execution
- Image upload progress
- Database operation feedback
- Order status updates

The key principle is to keep the implementation minimal while allowing GPT-4o to handle the complex decision-making. The system should:
- Trust GPT-4o's ability to understand context and make decisions
- Allow natural language interaction in any language
- Handle all database operations through function calls
- Provide clear feedback for all operations
- Maintain conversation context without artificial management

The goal is to create a system where admins can naturally interact with the AI to manage books and orders, just as shown in the example conversation, while keeping the codebase clean and maintainable.

### Title Variation and Duplicate Detection

#### Natural Language Processing
We fully trust GPT-4o to:
- Understand Buddhist terminology in any script or language
- Recognize variations of the same title
- Handle traditional/simplified Chinese conversions
- Understand different translation styles
- Process mixed language inputs

#### Search Process
When admin uploads a new book image:
1. GPT-4o extracts text and information
2. Automatically considers variations while searching:
    - Different scripts (Traditional/Simplified)
    - Different translations
    - Common Buddhist text patterns
3. If potential matches found:
    - Retrieves cover images
    - Performs visual comparison
    - Presents findings to admin

#### Example Flow
```typescript
Admin: [Uploads image of Buddhist book]
LLM: "I see this is '淨土指歸'. Let me analyze and search:

Extracted Information:
- Title: 淨土指歸
- Author: 印光大師
- Publisher: 佛陀教育基金會

Searching database... I found some potential matches:

1. Similar Title Found:
   Title: 净土指归
   Publisher: 美國淨宗學會
   [Cover Image shown]

Let me analyze both covers:
- Different publishers
- Different typography and layout
- Different publication years

These appear to be different publications. Would you like to:
1. Create as new listing
2. Update existing listing
3. Cancel operation"
```

#### Key Points
- No need for manual variation handling
- Trust GPT-4o's understanding of Buddhist texts
- Let GPT-4o handle script conversions naturally
- Visual comparison for final verification
- Clear options presented to admin

## Implementation Philosophy
The platform fully utilizes GPT-4o's capabilities while maintaining structural integrity:

### Trust in GPT-4o's Capabilities
- Natural language processing in any language
- Image analysis and understanding
- Context maintenance and memory
- Decision making and reasoning
- Category and tag suggestions
- Similarity detection
- Business logic validation

### Structural Expectations
- All database operations must use defined functions
- Data must conform to type definitions
- Categories must match predefined enums
- Function calls must follow parameter structures
- Database schema integrity must be maintained
- Logging requirements must be met

### Example of Balanced Implementation
```typescript
// GPT-4o is trusted to:
- Analyze images and extract information
- Decide appropriate categories
- Suggest relevant tags
- Detect similar books
- Validate business logic
- Handle natural language

// But must use our structures:
function createBook(args: BookCreate): Promise<AdminOperationResult> {
  // Structured data input
  // Type safety
  // Database schema compliance
}
```

### Duplicate Detection Process

#### Overview
The system employs a two-stage duplicate detection process leveraging GPT-4o's capabilities while optimizing for efficiency with large book collections:

1. **Text-Based Initial Screening**
   - First pass using extracted text and tags
   - Database query optimization
   - Similarity threshold consideration

2. **Visual Confirmation**
   - Secondary check with image comparison
   - Clear presentation to admin
   - Explicit decision capture

#### Detailed Process Flow

1. **Initial Image Analysis**
   - Admin uploads new book image
   - GPT-4o extracts:
     * Titles (Chinese/English)
     * Author information
     * Publisher details
     * Suggested tags
     * Category recommendation

2. **Text-Based Search**
   - System searches database using:
     * Title variations (Traditional/Simplified Chinese, English)
     * Author names
     * Key tags
     * Publisher information
   - Considers:
     * Character variant matching (简/繁体)
     * Partial title matches
     * Tag overlaps

3. **Potential Match Processing**
   - If matches found:
     * Retrieve cover images of potential matches
     * Present to GPT-4o for visual comparison
   - If no matches:
     * Proceed with normal book creation flow

4. **Visual Comparison by GPT-4o**
   - GPT-4o analyzes:
     * Layout similarities
     * Content differences
     * Edition variations
     * Publisher differences
   - Makes determination:
     * Different edition (same content, different publisher/year)
     * Completely different book
     * Potential duplicate

5. **Admin Decision Interface**
   When potential duplicates found:
   ```typescript
   // Example conversation flow
   LLM: "I've found some similar books in the database. Let me analyze them:
   
   Current Upload:
   Title: 淨土指歸
   Publisher: 佛陀教育基金會
   Year: 2023
   [Image shown]

   Existing Book:
   Title: 淨土指歸
   Publisher: 美國淨宗學會
   Year: 2020
   [Image shown]

   Visual Analysis:
   - Same content and layout
   - Different publisher
   - Updated typography
   
   Would you like to:
   1. Create as new listing 
   2. Update existing listing
   3. Cancel operation"
   ```

6. **Action Recording**
   - System logs:
     * Duplicate detection process
     * GPT-4o's analysis
     * Admin's decision
     * Final action taken

#### Implementation Notes

1. **Search Optimization**
   - Use indexed text search for first pass
   - Implement efficient tag matching
   - Cache frequent comparisons

2. **GPT-4o Integration**
   ```typescript
   // Example function structure
   async function detectDuplicates(newBook: BookCreate) {
     // 1. Text-based search
     const potentialMatches = await searchSimilarBooks(newBook)
     
     // 2. If matches found, perform visual comparison
     if (potentialMatches.length > 0) {
       const visualAnalysis = await compareBookImages({
         new: newBook.coverImage,
         existing: potentialMatches.map(book => book.coverImage)
       })
       
       // 3. Present results to admin
       return formatDuplicateResults(visualAnalysis)
     }
     
     return null
   }
   ```

3. **Error Handling**
   - Handle image loading failures
   - Manage timeout scenarios
   - Provide fallback options

4. **Performance Considerations**
   - Optimize image loading
   - Cache analysis results
   - Batch similar comparisons

This process ensures:
- Efficient handling of large book collections
- Accurate duplicate detection
- Clear admin decision flow
- Proper handling of different editions
- Comprehensive logging
- Optimized resource usage

## 1. auth system
  we used supabase auth for the email/password sign in, and magic link sign in. and supabase database for user management. all already set up.
## 2. admin LLM interface
  - we use gpt-4o for the admin LLM interface, gpt-4o have strong capabilities for natural language and vision processing, long context window memory, and function calling.
  - check openai-function-calling.md for function calling details.
  - we fully trust gpt-4o's capabilities to make decision based on admin's instructions, the only limitation we set is the listing categories. 
  here is the category type enum:
  ```typescript
  CATEGORY_TYPE = {
    PURE_LAND_BOOKS: "净土佛书",
    OTHER_BOOKS: "其他佛书", 
    DHARMA_ITEMS: "法宝",
    BUDDHA_STATUES: "佛像"
  }
  ```
  - we also fully trust gpt-4o's memory capabilities, so we don't need to set any session memory management.
  - gpt-4o has a context window of 128_000 tokens, and max output tokens of 16_384 tokens.

### 2.1 Scenario example: (the language used in examples are just example, we want to fully utilize the LLM's capabilities: long memory, can process natural language and image data, so no preset language what so ever)
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

