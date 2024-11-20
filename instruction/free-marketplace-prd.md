# AMTBCF Buddhist Books Distribution Platform - Product Requirements Document 

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

#### 2.3.1 AI-Powered Admin Interface (LLM-driven chat interface that focuses on inventory management, absolutely follows the database schema)
-  our user base are generally fluent in english, and both type chinese so no need to special set it. 
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
   - GPT-4o processes optimized image
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
- use OPENAI API with GPT-4o model 

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
