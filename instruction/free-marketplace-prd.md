# AMTBCF Buddhist Books Distribution Platform - Product Requirements Document 

- All files especially the LLM service should have detailed logs for debugging and auditing. (when I test the website with run dev command)
- ALWAYS fully utilize the LLM's capabilities to process natural language and image data, no preset language.

## 1. Product Overview
### 1.1 Product Vision
Create a platform for Amitabha Buddhist Society of Central Florida (AMTBCF) to efficiently distribute Buddhist books and materials to interested individuals, while serving as an informational hub for the organization.

### 1.2 Key Stakeholders
- AMTBCF Administrators
- Book Recipients
- Website Visitors
- Technical Maintainers

## 2. Core Features & Pages

### 2.1 Landing Page
- Organization introduction and mission statement
- Featured books section
- 3D lotus flower animation as central visual element
- Quick links to:
  - Book distribution catalog
  - Other AMTBCF resources and information (TBD)
- Responsive design for all devices
- Clean, peaceful aesthetic aligned with Buddhist principles
- Language switch between English and Chinese (future phase)

### 2.2 Book Distribution System
- E-commerce-like interface for browsing books
- Features:
  - Bilingual book displays (titles and descriptions in multiple languages)
  - Book covers and images
  - Category filtering and search
  - Add to cart (limit: 20 items per order)
  - Order placement (no payment required)
  - Order history
  - North America shipping address validation
  - One order per month limit (admin override available)

### 2.3 AI-Powered Admin Panel
- Intelligent inventory management:
  - Photo-based book recognition
  - Duplicate detection
  - Automated title extraction
  - AI-assisted description generation
  - Smart categorization
- Inventory tracking and alerts
- Order management
- Analytics dashboard

#### 2.3.1 Core AI Workflow
**Key Principle**: The AI assistant acts as a natural language interface between admins and the database, with strict data validation and no content generation without evidence.

1. **Book Creation Flow** (Primary Path):
   ```
   Admin: [Uploads cover image]
   AI: Analyzes image and responds with:
       - Extracted title(s) with confidence scores
       - Language detection results
       - Category suggestion
       - NO description generation
       - Duplicate check results
   Admin: Confirms or corrects information
   AI: Requests quantity
   Admin: Provides quantity
   AI: Creates listing or handles duplicates
   ```

2. **Book Update Flow**:
   ```
   Admin: "We received 50 more copies of [book title]"
   AI: - Searches database
       - Shows current quantity
       - Confirms update intention
   Admin: Confirms
   AI: Updates database
   ```

3. **Description Addition Flow**:
   ```
   Admin: [Uploads interior pages]
   AI: - Extracts visible text
       - Structures into description
       - Requests verification
   -- OR --
   Admin: "Add description: [text]"
   AI: - Confirms format
       - Updates database
   ```

#### 2.3.2 Data Processing Rules

1. **Image Processing**
   - Input: Book cover image
   - Output MUST contain:
     ```typescript
     {
       title_en: string | null;       // Only if visible
       title_zh: string | null;       // Only if visible
       confidence_scores: {
         title: number;               // 0.0 to 1.0
         language_detection: number;   // 0.0 to 1.0
       };
       extracted_text: {
         raw_text: string;            // All visible text
         positions: {                 // For verification
           title: string;             // e.g., "top center"
           other: string[];
         };
       };
     }
     ```

2. **Description Handling**
   - NEVER generate from cover image alone
   - Valid sources:
     1. Additional book images (interior/back)
     2. Direct admin input
     3. Existing database content
   - Both description_en and description_zh can be null

3. **Duplicate Detection**
   - Check sequence:
     1. Exact title match (either language)
     2. Similar title (Levenshtein distance)
     3. Visual similarity (if cover exists)
   - Required response format:
     ```typescript
     {
       isDuplicate: boolean;
       confidence: number;
       existingBook?: {
         id: string;
         title_en: string | null;
         title_zh: string | null;
         quantity: number;
         category: string;
       };
       reasons: string[];
     }
     ```

4. **Category Assignment**
   - MUST be one of:
     ```typescript
     type Category = 
       | 'PURE_LAND_BOOKS'  // 净土佛书
       | 'OTHER_BOOKS'      // 其他佛书
       | 'DHARMA_ITEMS'     // 法宝
       | 'BUDDHA_STATUES'   // 佛像
     ```
   - Default: 'OTHER_BOOKS'
   - Requires explicit admin confirmation

5. **Quantity Validation**
   - Must be non-negative integer
   - Requires explicit confirmation for:
     - Large changes (>100)
     - Reductions to zero
     - Updates to duplicates

#### 2.3.3 Error Handling Requirements

1. **Data Validation Errors**
   ```typescript
   interface ValidationError {
     field: string;
     error: string;
     suggestedFix?: string;
   }
   ```

2. **Required Recovery Paths**
   - Image upload failure → Retry or manual entry
   - Title extraction failure → Manual entry
   - Duplicate detection → Force create or update
   - Category mismatch → Default to OTHER_BOOKS
   - Database operation failure → Preserve state for retry

#### 2.3.4 AI Chat Interface Guidelines (fully utilizes the LLM's capabilities to process natural language and image data, no preset language)

1. **Initial Image Upload**
   ```
   Admin: [Uploads book cover]
   AI: I see a book cover. Here's what I found:
   - Title (Chinese): [extracted]
   - Title (English): [extracted]
   
   Would you like to:
   1. Add more images for description generation
   2. Continue with manual description
   3. Proceed without description
   ```

2. **Additional Image Processing**
   ```
   Admin: [Uploads content pages]
   AI: Thanks! I can now generate a description based on the content.
   Here's my suggestion:
   [Generated description]
   
   Is this accurate? Feel free to edit or provide your own.
   ```

3. **Natural Language Updates**
   ```
   Amind: do we have XXXXXX book?
   AI: yes, we have it in [category], with [quantity] copies available.

   Admin: "Change quantity to 50"
   AI: Setting quantity to 50. Please confirm.
   
   Admin: "Yes"
   AI: Updated quantity to 50.
   ```

#### 2.3.3 AI System Constraints

1. **Cover Image Analysis**
   - ONLY extract visible text
   - NO description generation from cover alone
   - Focus on accurate title extraction
   - Report confidence levels for extracted text
   - Flag unclear or ambiguous text

2. **Description Generation**
   - Require additional images or manual input
   - Never generate descriptions without content
   - Preserve original language text
   - No interpretation of Buddhist concepts

3. **Error Prevention**
   - Explicit confirmation for all updates
   - Clear confidence scoring
   - Duplicate detection before creation
   - Validation of all numeric inputs
   - Preservation of Chinese characters

#### 2.3.4 AI-Powered Admin Interface (LLM-driven chat interface that focuses on inventory management, absolutely follows the database schema)
-  our user base are generally fluent in english, and both type chinese so no need to special set it. 
- we should have a progress tracking system for LLM to keep the admin updated with each step. (no need to be super detailed, just a simple status update)(stop suggesting me to make it more detailed!)
note: when any image are shown to admin by LLM, it should be able to enlarge just incase is hard to see.(we use shadcn for the entire website)
- **Interactive Chat Interface**: 
  - A chatbox that greets the admin and asks what they would like to do (e.g., 
  change inventory number, add new listing).
  - Supports text input and file uploads (images) from both desktop and mobile 
  devices.
- **Image Upload and Processing**:
  - Admins can upload book images directly from their devices.
  - The system uses AI to extract information such as title and subtitle from the 
  image.
  - Generates a draft description for the book, which the admin can edit.
  - image should alwasy be uploaded to cloudinary and the url should be stored in the database for book listings purpose, the cover and description page if provdied. as for LLM, it can use direct image from the user, or if it perform better with a cloudinary enhanced image, then use cloudinary enhanced image (cloudinary api is in the form of CLOUDINARY_URL=cloudinary://my_key:my_secret@my_cloud_name)
- **Inventory Management**:
  - Allows admins to update inventory numbers or add new listings through the 
  chat interface.
  - Once confirmed, the system sends the data to the backend to update the 
  database and store the image for the listing.
- **Title Update Commands**:
  - Support natural language title updates (e.g., "should be [title]", "title is 
  [title]")
  - Immediate validation and confirmation of title changes
  - Preservation of original Chinese characters
- **Book Creation Flow**:
  1. Admin uploads image 
  2. System extracts/validates information
  3. Admin confirms or corrects title if needed
  4. System suggests category from predefined list:
     - Pure Land Buddhist Books (净土佛书)
     - Other Buddhist Books (其他佛书)
     - Dharma Items (法宝)
     - Buddha Statues (佛像)
  5. Admin specifies quantity
  6. System creates book listing on confirmation
  7. Success/error feedback provided
  8. Option to add another book
- **Error Handling**:
  - Clear error messages for failed operations
  - Option to retry failed operations
  - Preservation of entered data on errors
- **LLM-Driven Interaction**:
  - LLM acts as intelligent interface between admin and system
  - No predefined flows or command structures
  - Natural conversation in admin's preferred language
  - Contextual understanding of admin's intent

- **Core Capabilities**:
  - Image Analysis:
    - Extract text from book covers
    - Detect language (Chinese/English)
    - Identify key information
    - Suggest categories and tags

  - Natural Language Understanding:
    - Interpret admin's intent from casual conversation
    - Handle multiple updates in single message
    - Maintain context across conversation
    - Support mixed language input

  - Database Integration:
    - Convert natural language to database operations
    - Handle complex updates across multiple fields
    - Manage duplicate detection and resolution
    - Track changes for audit purposes

- **Example Interactions**:
  ```
  Admin: "This looks like a duplicate of the Pure Land book we added yesterday"
  LLM: *checks database, finds match*
  LLM: "You're right - I found a similar book [shows comparison]"
  Admin: "Yeah, just add 10 more copies to that one"
  LLM: *updates quantity in database*
  ```

  ```
  Admin: "上传新书" (Upload new book)
  LLM: *switches to Chinese, processes image*
  Admin: "加上净空法师的标签" (Add Venerable Master Chin Kung's tag)
  LLM: *adds tag while maintaining previous context*
  ```

- **Error Prevention**:
  - LLM validates commands before execution
  - Suggests corrections for potential mistakes
  - Maintains data consistency
  - Provides natural error explanations

- **Key Principles**:
  - Trust LLM to manage conversation flow
  - Avoid rigid command structures
  - Let admin work naturally
  - Maintain context and state
  - Support bilingual interaction

#### 2.3.2 Duplicate Detection Workflow 
- **Duplicate Definition**:
  - Primary match: Exact title match
  - Secondary indicators:
    - Similar cover images
  - Confidence scoring for potential duplicates

- **Duplicate Detection Process**:
  1. Check for exact title matches first
  2. If no exact match, perform similarity analysis
  3. Calculate confidence score for potential duplicates
  4. Present findings to admin with:
     - Matching book details
     - Confidence score
     - Reason for duplicate flag
     - Side-by-side comparison
     example: user upload a image, we get the title from the book, then do a search of the database for similar titled book, if there are title thats similar, doesn't have to be exact, grab the image url from the existing book, send it to LLM for comparison, if similarly score is over 0.5, show it to admin for confirmation. when LLM did not find the duplicates, extract the info as normal and show to admin, if admin corrects the title, use the new title that was given by admin and repeat the image comparison process. this might be a long process, so make sure LLM keep updating the user with each step. 
     - if during serach LLM found that text matches but images differ then is not a duplicate, we will have multiple versions of the same book

- **Admin Options for Duplicates**:
  1. Create new listing anyway
  2. Update existing listing:
     - Merge descriptions
     - Update quantity
     - Add new images
  3. Cancel operation

#### 2.3.3 AI Chat Workflow & Data Processing

### 2.3.3.1 Core Data Structure
```typescript
interface BookData {
  title_en: string | null;
  title_zh: string | null;
  description_en: string;
  description_zh: string;
  cover_image: string | null;
  quantity: number;
  category_id: string;
  search_tags: string[];
  ai_metadata: Json | null;
  embedding: vector(384) | null;
}
```

### 2.3.3.2 Image Processing Flow
1. **Image Upload**:
   - Accept image upload from admin
   - Support formats: JPEG, PNG, HEIC/HEIF
   - Size limit: 20MB
   - Auto-convert HEIC to JPEG

2. **Image Optimization**:
   - Cloudinary processing:
     - Generate display version (800px width, auto format)
     - Generate AI analysis version (512x512, enhanced clarity)
   - Store original and optimized URLs

3. **Initial Analysis**:
   - gpt-4o processes optimized image
   - Extracts:
     - Visible text (both English and Chinese)
     - Title candidates
     - Category hints
     - Initial tag suggestions

### 2.3.3.3 Duplicate Detection
1. **Multi-stage Check**:
   - Exact title match (both languages)
   - Similar title detection
   - Tag-based matching
   - Vector similarity (if embedding exists)

2. **Duplicate Handling**:
   - Show side-by-side comparison
   - Present options:
     - Update existing entry
     - Force create new entry
     - Cancel operation
   - Track duplicate decisions in ai_metadata

### 2.3.3.4 Field Collection Process
1. **Title Processing**:
   - Validate extracted titles
   - Request admin confirmation
   - Support manual entry/correction
   - Require at least one language

2. **Description Generation**:
   - Extract visible text
   - Generate structured descriptions
   - Allow admin editing
   - Support bilingual content

3. **Category Assignment**:
   - Present category options:
     ```typescript
     enum CategoryType {
       PURE_LAND_BOOKS  // 净土佛书
       OTHER_BOOKS      // 其他佛书
       DHARMA_ITEMS     // 法宝
       BUDDHA_STATUES   // 佛像
     }
     ```
   - AI suggests category based on content
   - Require admin confirmation

4. **Quantity Management**:
   - Default to 0
   - Accept numeric input
   - Validate non-negative values
   - Support increment/decrement

5. **Tag Generation**:
   - Extract keywords from text
   - Generate relevant tags
   - Allow admin customization
   - Store in search_tags array

### 2.3.3.5 Update Operations
1. **Supported Commands**:
   ```typescript
   type UpdateOperation =
     | 'UPDATE_TITLE_EN'
     | 'UPDATE_TITLE_ZH'
     | 'UPDATE_DESCRIPTION_EN'
     | 'UPDATE_DESCRIPTION_ZH'
     | 'UPDATE_QUANTITY'
     | 'UPDATE_CATEGORY'
     | 'UPDATE_TAGS'
     | 'UPDATE_COVER'
   ```

2. **Natural Language Processing**:
   - Parse admin intent
   - Map to specific operations
   - Handle mixed language input
   - Maintain conversation context

3. **Validation Rules**:
   - Title: At least one language required
   - Description: Optional, but structured
   - Quantity: Non-negative integer
   - Category: Must match enum
   - Tags: Array of strings
   - Cover: Valid URL if present

### 2.3.3.6 AI System Prompts
1. **Image Analysis Prompt**:
   ```typescript
   const imageAnalysisPrompt = `
   You are an AI assistant for Buddhist book inventory management.
   Task: Extract visible text and book information.
   
   Guidelines:
   - Extract text in original language (EN/ZH)
   - Do not translate between languages
   - Mark unclear text as null
   - Do not interpret Buddhist concepts
   - Focus on factual extraction
   
   Required fields:
   - title_en: string | null
   - title_zh: string | null
   - extracted_text: string
   - category_suggestions: string[]
   - search_tags: string[]
   `;
   ```

2. **Chat Assistant Prompt**:
   ```typescript
   const chatAssistantPrompt = `
   You are an AI assistant for Buddhist book inventory management.
   
   Guidelines:
   - Maintain conversation context
   - Support EN/ZH input
   - Focus on inventory tasks
   - No Buddhist interpretation
   - Clear error communication
   
   Response format:
   {
     "action": UpdateOperation | null,
     "data": BookUpdateData | null,
     "message": string,
     "certainty": "high" | "medium" | "low",
     "needs_review": boolean
   }
   `;
   ```

### 2.3.3.7 Error Handling
1. **Validation Errors**:
   - Missing required fields
   - Invalid data types
   - Category mismatch
   - Image processing failures

2. **Recovery Steps**:
   - Clear error messages
   - Suggested corrections
   - Data preservation
   - Retry options

3. **Audit Logging**:
   - Track all operations
   - Record error states
   - Log admin decisions
   - Store in ai_metadata

### 2.3.3.8 AI Assistant Core Principles

1. **Purpose & Scope**
   - Primary role: Help admins manage book database efficiently
   - Focus: Accurate data extraction and verification
   - NOT responsible for: Content generation or Buddhist interpretation

2. **Data Integrity**
   - Extract ONLY visible/provided information
   - Never generate content without evidence
   - Never translate or interpret Buddhist concepts
   - Mark uncertainties explicitly
   - Maintain strict database schema compliance

3. **Category Enforcement**
   Strictly limited to defined categories:
   ```typescript
   enum CategoryType {
     PURE_LAND_BOOKS = "PURE_LAND_BOOKS"  // 净土佛书
     OTHER_BOOKS = "OTHER_BOOKS"          // 其他佛书
     DHARMA_ITEMS = "DHARMA_ITEMS"        // 法宝
     BUDDHA_STATUES = "BUDDHA_STATUES"    // 佛像
   }
   ```

4. **Image Analysis Capabilities**
   - Text extraction with position data
   - Layout pattern recognition
   - Duplicate detection
   - Visual verification markers
   - Confidence scoring
   - Uncertainty reporting

5. **Natural Language Processing**
   - Understand admin intent
   - Process bilingual input (EN/ZH)
   - Maintain conversation context
   - Follow database schema
   - Verify before updates

6. **Verification First Approach**
   - Always verify data before updates
   - Report confidence levels
   - Flag uncertainties
   - Request admin confirmation
   - Track verification metadata

7. **Error Prevention**
   - Validate against schema
   - Check for duplicates
   - Enforce category constraints
   - Maintain data integrity
   - Log all operations (ALL steps or components should have super detailed logging for the terminal window for me to monitor when developing! do not remove these logging features!)

8. **Metadata Collection**
   ```typescript
   interface AIMetadata {
     extracted_text: {
       main_text: string;
       position_data: object;
     };
     confidence_scores: object;
     visual_verification: object;
     uncertainties: string[];
     analysis_date: string;
   }
   ```

9. **Key Constraints**
   - No content generation
   - No Buddhist interpretation
   - No automatic translation
   - No assumption of missing data
   - Strict schema adherence

10. **Success Metrics**
    - Accuracy of text extraction
    - Duplicate detection rate
    - Data validation accuracy
    - Admin correction rate
    - Operation completion rate

### 2.3.4 AI Chat Interface Requirements

#### 2.3.4.1 Chat UI Design
1. **Message Layout**:
   - User messages aligned center with primary color background
   - AI messages aligned center with muted background
   - Messages have rounded corners (2xl radius)
   - User messages: rounded except bottom-right corner
   - AI messages: rounded except bottom-left corner
   - Maximum width: 85% on mobile, 75% on desktop
   - Hover effect: slight opacity change on messages

2. **Message Content**:
   - Support for text and images
   - Preserve whitespace and line breaks
   - Show timestamps below each message (using consistent formatting)
   - Support code block formatting
   - Support JSON display

3. **Image Handling**:
   - Single image display: max-width-xs, centered
   - Side-by-side comparison:
     - Two-column grid layout
     - Labels for "Existing" and "New" images
     - Semi-transparent black background for labels

4. **Input Area**:
   - Fixed at bottom
   - Muted background
   - Image upload button (ghost variant)
   - Send button (ghost variant)
   - Disabled state during processing
   - Support for Enter key submission

5. **Container**:
   - Responsive height: calc(100vh - 12rem)
   - Maximum width: 3xl
   - Smooth scrolling
   - Auto-scroll to latest message

6. **Message Streaming**:
   - Character-by-character display
   - 500ms delay before starting stream
   - Empty message box appears first
   - Smooth streaming effect
   - Proper error handling

7. **Timestamp Display**:
   - Consistent format using toLocaleTimeString
   - Hour, minute in 12-hour format
   - Hydration-safe implementation

#### 2.3.4.2 Chat Interaction Flow
1. **Message Streaming**:
   - Real-time character-by-character display
   - fully utilize natural language processing capabilities of gpt-4o
   - Proper error handling
  

2. **State Management**:
   ```typescript
   interface ChatState {
     messages: ChatMessage[];
     isProcessing: boolean;
     isTyping: boolean;
     currentBookData?: BookState;
     connectionStatus: 'connected' | 'disconnected';
     progressState: ProgressState | null;
   }
   ```


3. **Response Handling**:
   - Support streaming responses
   - Handle image uploads

#### 2.3.4.3 Chat Message State Management

1. **Message State Structure**:
   ```typescript
   interface ChatBoxState {
     messages: ChatMessage[];
     isProcessing: boolean;
     currentBookData?: BookState;
     connectionStatus: 'connected' | 'disconnected';
   }
   ```

2. **Message Handling Flow**:
   ```typescript
   // 1. Add user message
   const userMessage = {
     role: 'user',
     content: message,
     timestamp: new Date(),
   };
   
   // 2. Add empty assistant message
   const assistantMessage = {
     role: 'assistant',
     content: '',
     timestamp: new Date(),
   };
   
   // 3. Calculate correct index for updates
   const assistantMessageIndex = state.messages.length + 1;
   ```

3. **Message Update Rules**:
   - Only update assistant messages
   - Preserve user messages unchanged
   - Maintain message order
   - Handle streaming updates safely

4. **Reducer Actions**:
   ```typescript
   type ChatAction = 
     | { type: 'ADD_MESSAGE'; payload: ChatMessage }
     | { type: 'UPDATE_MESSAGE'; payload: { 
         index: number; 
         content: string; 
         bookData?: any; 
         images?: any 
       }}
     | { type: 'SET_PROCESSING'; payload: boolean }
     | { type: 'UPDATE_BOOK_DATA'; payload: Partial<BookState> }
     | { type: 'SET_CONNECTION_STATUS'; payload: 'connected' | 'disconnected' }
     | { type: 'RESET' };
   ```

5. **Message Update Logic**:
   ```typescript
   case 'UPDATE_MESSAGE':
     return {
       ...state,
       messages: state.messages.map((msg, idx) => {
         if (idx === action.payload.index && msg.role === 'assistant') {
           return {
             ...msg,
             content: action.payload.content,
             ...(action.payload.bookData && { bookData: action.payload.bookData }),
             ...(action.payload.images && { images: action.payload.images })
           };
         }
         return msg;
       })
     };
   ```

6. **Message Display Rules**:
   - User messages: right-aligned, primary color
   - Assistant messages: left-aligned, muted color
   - Timestamps below each message
   - Support for images and comparisons
   - Preserve whitespace in content

7. **Error Prevention**:
   - Validate message roles
   - Check indices before updates
   - Preserve message metadata
   - Handle streaming errors gracefully
   - Maintain message order integrity

## 3. Technical Architecture

### 3.1 Frontend Stack
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Key Features**:
  - Server-side rendering for SEO
  - Static page generation
  - Real-time inventory updates
  - Responsive design
  - Progressive Web App capabilities

### 3.2 Backend Infrastructure
- **Hosting**: Vercel
- **Database**: PostgreSQL with Prisma ORM + pgvector
- **Authentication**: 
  - Supabase Auth with Magic Link Email
  - Role-based access (Admin/User)
- **File Storage**: Cloudinary for book images
- **Caching**: 
  - Next.js built-in cache
  - Vercel Edge Cache
  - Upstash Redis

### 3.3 AI Integration
- **Image Processing**: 
  - Book cover recognition
  - Text extraction from images
  - Duplicate detection
- **Content Generation**:
  - Book descriptions
  - Category suggestions
  - SEO metadata
- **Inventory Management**:
  - Quantity tracking
  - Low stock alerts
  - Usage pattern analysis

### 3.4 AI System Prompts
#### 3.4.1 Book Image Analysis Prompt
```
You are an AI assistant for Buddhist book inventory management.
Your task is to extract only visible text from book images.
- Only extract text you can clearly see
- If text is unclear, mark as null
- Do not make assumptions or generate content
- Do not interpret or explain Buddhist concepts
- Check for exact matches with existing titles
Response must be valid JSON matching the BookAnalysis interface.
```

#### 3.4.2 Chat Assistant Prompt
```
You are an AI assistant for Buddhist book inventory management.
Important guidelines:
- If uncertain, say so explicitly
- Don't make assumptions about book content
- Direct Buddhist content questions to AMTBCF staff
- Focus only on inventory management
- Never interpret or explain Buddhist teachings
- Never generate content about Buddhist concepts
```

## 4. Database Schema

### 4.1 Core Models
```prisma
model User {
  id              String    @id
  email           String    @unique
  name            String?
  role            Role      @default(USER)
  last_order_date DateTime?
  created_at      DateTime  @default(now())
  orders          Order[]
  addresses       ShippingAddress[]
}

model Book {
  id              String    @id @default(uuid())
  title_en        String    // English title
  title_zh        String    // Chinese title
  description_en  String
  description_zh  String
  cover_image     String?   // URL to Cloudinary
  quantity        Int       @default(0)
  category_id     String?
  category        Category? @relation(fields: [category_id], references: [id])
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  order_items     OrderItem[]
  search_tags     String[]  // For searchability
  ai_metadata     Json?     // AI-generated insights
  views           Int       @default(0)
  embedding       Unsupported("vector(384)")?  // For AI similarity search

  @@index([category_id])
}

model Category {
  id          String    @id @default(uuid())
  name_en     String
  name_zh     String
  parent_id   String?
  parent      Category? @relation("CategoryHierarchy", fields: [parent_id], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  books       Book[]

  @@index([parent_id])
}

model Order {
  id                  String      @id @default(uuid())
  user_id             String
  user                User        @relation(fields: [user_id], references: [id])
  status              OrderStatus @default(PENDING)
  shipping_address_id String
  address             ShippingAddress @relation(fields: [shipping_address_id], references: [id])
  total_items         Int
  created_at          DateTime    @default(now())
  order_items         OrderItem[]
  notes               String?
  override_monthly    Boolean     @default(false)  // For admin override of monthly limit
  override_by         String?     // Admin who overrode the limit

  @@index([user_id])
  @@index([shipping_address_id])
}

model OrderItem {
  order_id    String
  book_id     String
  quantity    Int
  order       Order     @relation(fields: [order_id], references: [id])
  book        Book      @relation(fields: [book_id], references: [id])

  @@id([order_id, book_id])
}

model ShippingAddress {
  id          String    @id @default(uuid())
  user_id     String
  user        User      @relation(fields: [user_id], references: [id])
  address1    String
  address2    String?
  city        String
  state       String
  zip         String
  country     String    // Limited to US/Canada
  is_valid    Boolean   @default(false)
  orders      Order[]
  
  @@index([user_id])
}

enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  COMPLETED
  CANCELLED
}
```

## 5. Key Workflows

### 5.1 Book Addition Workflow
1. Admin takes photo of book
2. AI processes image:
   - Checks for existing inventory
   - Extracts title and other visible text
   - Generates description draft
3. Admin reviews/edits AI suggestions
4. Admin inputs quantity
5. System creates listing

### 5.2 Order Workflow
1. User browses books
2. Adds selections to cart
3. Signs in/up with email
4. Provides shipping address
5. Reviews order
6. Submits request
7. Admin reviews and processes
8. System updates inventory

### 5.3 Data Migration Plan
- Initial data import:
  - ~6000 book listings from existing eBay CSV
  - Phase 1: Import basic book information
  - Phase 2: Enhance with AI-generated descriptions
  - Phase 3: Add multilingual support
  - Migration tools and scripts to be developed

## 6. Development Phases

### 6.1 Phase 1 - Core Distribution System (1 month)
- Basic landing page
- Book catalog
- User authentication
- Order placement
- Basic admin panel

### 6.2 Phase 2 - AI Integration (1 month)
- AI-powered book addition
- Smart inventory management
- Enhanced search
- Admin workflow optimization

### 6.3 Phase 3 - Enhanced Features (1 month)
- Advanced landing page
- Analytics dashboard
- Performance optimization
- Additional content areas

## 7. Technical Considerations

### 7.1 Performance Requirements
- Page load < 2s
- Image optimization
- Mobile responsiveness
- Support for concurrent users
- Efficient caching

### 7.2 Security Requirements
- Secure admin access
- Data protection
- Input validation
- Rate limiting
- Session management

## 8. Cost Estimates (Monthly)

### 8.1 Infrastructure
- Vercel: $0 (Hobby tier)
- Cloudinary: $0 (Free tier - 25GB storage) 
- Upstash Redis: $0 (Free tier)
- Domain: ~$1-2/month
- PostgreSQL: $0 (Supabase/Neon free tier)

### 8.2 AI Services
- use openAI API with "gpt-4o" (do not change my model) 

Total Estimated Monthly Cost: $25-60

## 9. Future Considerations
- Multi-language support (English/Chinese priority)
- Event calendar integration
- Newsletter system
- Mobile app
- Integration with other Buddhist resources

## 10. Language Support Strategy
- Phase 1: English-only interface
- Phase 2: Add Chinese interface
  - Manual translation of UI elements
  - No automatic translation
  - Admin-provided translations for all content
- Support for book listings:
  - All books display titles in original language
  - Support for multiple language versions
  - Manual translation verification by admins
