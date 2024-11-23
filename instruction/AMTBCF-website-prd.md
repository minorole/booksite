# AMTBCF Buddhist Books Distribution Platform - Product Requirements Document

## Overview
- All features should have detailed logs for debugging and auditing.
- The LLM interface fully utilizes natural language processing capabilities without preset language restrictions.
- Free distribution model - no payment processing required.
- the website will have a super admin that can control everything, the super admin email is stored in the .env file with the key `NEXT_PUBLIC_SUPER_ADMIN_EMAIL`. when this user sign up, the system will automatically grant this user super admin role.

## 1. Product Overview
### 1.1 Product Vision
Create a bilingual, LLM-powered platform for Amitabha Buddhist Society of Central Florida (AMTBCF) to efficiently distribute Buddhist books and materials, offering both traditional listing and natural conversation interfaces while maintaining the simplicity of free distribution.

### 1.2 Key Stakeholders
- Book Recipients (Users)
- AMTBCF Administrators
- Technical Maintainers

## 2. Core Features

### 2.1 Authentication System

- **Magic Link Email Authentication**
  - No password required
  - Secure login/signup process
  - Session management
  - User profile storage

- **Role-based access (User/Admin)**

### 2.2 Dual Interface System

#### 2.2.1 Traditional Listing Interface

- **Simple table view organized by category**
  - **Columns:**
    - **Title (Chinese)**
    - **Title (English)**
    - **Category**
    - **Quantity Available**

- **Separate detail page for each book showing:**
  - **Full book information**
  - **Cover image**
  - **Add to Cart button**
  - **Current availability**

- **Accessible via navigation bar**
- **Category-based filtering**

### 2.2.2 LLM Chat Interface
- we use gpt-4o-mini as the user LLM model.different from the admin LLM gpt-4o model, we also use a different api key for the user LLM model, stored in the .env file with the key `OPENAI_API_KEY_USER`.

Natural language interaction for book discovery.  
**Features:**

- Real-time book search based on user queries
- Book display with cover images in chat
- Interactive "Add to Cart" buttons within chat
- Bilingual support (English/Chinese)
- Knowledge base integration for Buddhist concepts
- Clear boundaries for LLM responses
- Strict response control (immediate rejection of unrelated queries)

**No book recommendations** - strict search only.  
**Email redirect** for out-of-scope queries.  

### 2.3 Cart & Order System

- **Shared cart** between both interfaces.
- **Order limitations:**
  - Maximum of **20 items** per order.
  - **One order** per month per user.

- **No payment processing.**
- **Address validation** (North America only).
- **Order status tracking.**
- **Order history view.**

### 3. Technical Architecture

#### 3.1 Core Technologies

**Frontend:**

- Next.js 14 with App Router
- Shadcn UI components
- Tailwind CSS
- React for interactive components
- SSR optimization

**Backend:**

- PostgreSQL with Prisma ORM + pgvector
- Supabase Auth for Magic Link emails
- Cloudinary for image management

**LLM Integration:**

- OpenAI GPT-4o model
- Custom knowledge base integration
- Context management system


#### 3.2 detailed LLM related file structure

```
src/
├── app/
│   ├── user/
│   │   └── ai-chat/
│   │       └── page.tsx               # User chat interface page
│   │           - Auth protection
│   │           - Chat interface loading
│   │           - Chat state management
│   │           - Cart integration
│   │
│   └── api/
│       └── users/
│           └── ai-chat/
│               └── route.ts           # User LLM API endpoint
│                   - Message handling
│                   - Book search processing
│                   - Cart operations
│                   - Error handling

├── components/
│   └── user/
│       └── ai-chat/
│           ├── chat-interface.tsx     # Main chat container
│           │   - Message display
│           │   - Chat history
│           │   - Loading states
│           │   - Error displays
│           │   - Cart status
│           │
│           ├── chat-input.tsx         # Simple text input
│           │   - Text input
│           │   - Send button
│           │   - Language detection
│           │   - Input validation
│           │
│           ├── message-item.tsx       # Message display component
│           │   - Text formatting
│           │   - Book previews
│           │   - Cart actions
│           │   - Error messages
│           │
│           ├── book-result.tsx        # Book search result
│           │   - Cover image
│           │   - Bilingual titles
│           │   - Add to cart button
│           │   - Availability status
│           │
│           └── cart-preview.tsx       # Cart status in chat
│               - Current items
│               - Total count
│               - Order limits
│               - Quick actions

├── lib/
│   └── user/
│       ├── ai/
│       │   ├── llm-manager.ts         # Core LLM logic
│       │   │   - GPT-4o-mini integration
│       │   │   - Context management
│       │   │   - Response processing
│       │   │   - Language handling
│       │   │
│       │   ├── context-builder.ts     # Context generation
│       │   │   - Book catalog context
│       │   │   - Cart context
│       │   │   - Chat history
│       │   │   - System prompts
│       │   │
│       │   ├── language-detector.ts   # Language handling
│       │   │   - Input language detection
│       │   │   - Response language matching
│       │   │   - Bilingual support
│       │   │
│       │   └── prompt-templates.ts    # System prompts
│       │       - Book search
│       │       - Cart management
│       │       - Error responses
│       │       - Help messages
│       │
│       ├── services/
│       │   ├── book-search.ts         # Book search
│       │   │   - Catalog search
│       │   │   - Category filtering
│       │   │   - Tag matching
│       │   │   - Availability check
│       │   │
│       │   ├── cart-service.ts        # Cart operations
│       │   │   - Add/remove items
│       │   │   - Quantity validation
│       │   │   - Order limits
│       │   │   - Cart persistence
│       │   │
│       │   └── order-service.ts       # Order processing
│       │       - Order creation
│       │       - Address validation
│       │       - Monthly limit check
│       │       - Order history
│       │
│       └── utils/
│           ├── validators.ts          # Input validation
│           │   - Query validation
│           │   - Cart limits
│           │   - Address format
│           │   - Order constraints
│           │
│           ├── formatters.ts          # Response formatting
│           │   - Message formatting
│           │   - Book display
│           │   - Cart summary
│           │   - Error messages
│           │
│           └── error-handler.ts       # Error handling
│               - Error classification
│               - User messages
│               - Error logging
│               - Admin notifications

└── types/
    └── user/
        └── chat.ts                    # Type definitions
            - Message types
            - Book search types
            - Cart types
            - Order types
```

#### 3.3 Integration Points

**LLM Integration**

- Single endpoint for all LLM interactions.
- Knowledge base constraints:
  - Only responds with information from provided knowledge files.
  - Redirects to admin email for undefined topics.
  - Focuses on book search and filtering.
  - No generated content or recommendations.
  - Bilingual support based on user query language.


### 3.3.2 Database Integration
- Real-time inventory tracking
- Order management
- User session handling
- Cart state persistence

### 3.3.3 Image Management
- Cloudinary optimization
- Lazy loading for performance
- Responsive image serving

### 3.4 Security & Performance

- **Rate limiting** on API endpoints
- **Input sanitization**
- **Session validation**
- **Caching strategies:**
  - Static page generation for book listings
  - Image optimization
  - API response caching

### 4. Chat Interface Specifications

#### 4.1 Core Capabilities
- Natural language processing in both English and Chinese
- Book search and filtering based on user queries
- Display of book information with cover images
- Interactive "Add to Cart" functionality within chat
- Knowledge base integration for Buddhist concepts
- Clear error handling and admin email redirection

#### 4.2 Knowledge Base Integration
- LLM will only use information from developer-provided knowledge base files
- Knowledge categories:
  - Basic Buddhist concepts (from provided files only)
  - Book catalog information
  - Website navigation help

#### Strict boundaries:
- No generated content or personal opinions
- No book recommendations
- Redirect to admin email for undefined topics
- Only search and filter based on available metadata


### 4.3 Example Scenarios
#### 4.3.1 Book Search Scenarios

**Basic Search in English:**
User: Do you have any books about Pure Land Buddhism?

LLM: Let me search our catalog for books related to Pure Land Buddhism:

Book #1:
Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
[Cover Image shown]
[Add to Cart button]

Book #2:
Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Category: PURE_LAND_BOOKS
[Cover Image shown]
[Add to Cart button]

Would you like to see more details about any of these books?

User: Yes, tell me more about the first one

LLM: Here are the details for "Pure Land Guidelines":

Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸
Available Quantity: 50 copies
[Larger Cover Image shown]
[Add to Cart button]

You can:
1. Add this book to your cart
2. View it in the traditional catalog
3. Ask about other books

User: Add it to my cart

LLM: I've added "Pure Land Guidelines" to your cart.
Current cart:
1. Pure Land Guidelines (淨土指歸) - 1 copy

Would you like to:
- Continue browsing books
- View your cart
- Place your order

**Search in Chinese:**
User: 有没有关于净土的书籍？

LLM: 好的，让我为您查找与净土相关的书籍：

书籍 #1:
中文书名：淨土指歸
英文书名：Pure Land Guidelines
类别：净土佛书
[封面图片]
[加入购物车按钮]

书籍 #2:
中文书名：印光大師文鈔
英文书名：Selected Writings of Master Yin Guang
类别：净土佛书
[封面图片]
[加入购物车按钮]

您想了解更多关于某本书的详细信息吗？

User: 第二本加入购物车

LLM: 已将《印光大師文鈔》加入您的购物车。

当前购物车内容：
1. 印光大師文鈔 (Selected Writings of Master Yin Guang) - 1本

您是否需要：
- 继续浏览其他书籍
- 查看购物车
- 提交订单


#### 4.3.2 Knowledge Base Interaction:
User: Can you explain the concept of Pure Land Buddhism?

LLM: Based on our available information materials:
[Provides specific explanation from knowledge base file]

For more detailed discussions about Pure Land Buddhism, please contact our administrators at [admin email]. They would be happy to provide more comprehensive information and guidance.

Would you like to see some books related to Pure Land Buddhism from our catalog?

User: What's your opinion on meditation techniques?

LLM: I apologize, but I'm not able to provide personal opinions or generate content about meditation techniques. For questions about meditation and Buddhist practices, please contact our administrators at [admin email]. They can provide proper guidance and resources.

However, I can help you find books in our catalog related to meditation if you're interested. Would you like to see those?

#### 4.3.3 Cart Management Through Chat:
User: Show me what's in my cart

LLM: Here's your current cart contents:
1. Pure Land Guidelines (淨土指歸) - 1 copy
2. Selected Writings of Master Yin Guang (印光大師文鈔) - 1 copy

Total items: 2
[Note: Limit of 20 items per order]

Would you like to:
- Modify quantities
- Remove items
- Continue shopping
- Proceed to checkout

User: Remove the first book

LLM: I've updated your cart:
Removed: Pure Land Guidelines (淨土指歸)

Current cart:
1. Selected Writings of Master Yin Guang (印光大師文鈔) - 1 copy

Would you like to:
- Continue shopping
- Proceed to checkout
- Make other changes to your cart

## 5. Development Phases

### 5.1 Phase 1 - Core Traditional Interface (2 weeks)
- Basic auth system with Magic Link
- Traditional table listing view
  - Category filtering
  - Basic search
- Book detail pages
  - Cover images
  - Descriptions
  - Add to cart functionality
- Cart management
  - Basic CRUD operations
  - Quantity limits
- Order placement
  - Address validation
  - Monthly limit check
  - Order confirmation

### 5.2 Phase 2 - LLM Integration (3 weeks)
- Chat interface setup
- Core LLM capabilities:
  - Book search in both languages
  - Display with cover images
  - Add to cart integration
- Knowledge base integration:
  - File structure setup
  - Basic Buddhist concepts integration
  - Response boundaries implementation
- Error handling:
  - Admin email redirection
  - Error logging
  - User feedback

### 5.3 Phase 3 - Enhancement & Optimization (2 weeks)
- Performance optimization:
  - Image loading
  - Chat response time
  - Search speed
- UI/UX improvements:
  - Chat interface polish
  - Mobile responsiveness
  - Loading states
- Advanced features:
  - Context-aware responses
  - Enhanced error handling
  - Improved logging

## 6. Technical Considerations

### 6.1 LLM Performance
- Response time optimization
- Context management
- Token usage efficiency
- Error rate monitoring
- Language detection accuracy
- Message retention policy (how long to keep chat history)

### 6.2 Security
- Input validation
- Rate limiting
- Session management
- Data access controls
- Error message security

### 6.3 Monitoring & Logging
- Detailed chat logs
- LLM performance metrics
- User interaction tracking
- Error tracking
- System health monitoring

### 6.4 Cost Management
- LLM token usage optimization
- Image storage optimization
- Cache strategy implementation
- Response size management

### 6.5 Cache Strategy
- Static page caching
- LLM response caching
- Image caching
- Book data caching

## 7. Content Management

### 7.1 Knowledge Base Structure
```typescript
interface KnowledgeBase {
  concepts: {
    id: string;
    concept_en: string;
    concept_zh: string;
    description_en: string;
    description_zh: string;
    source: string;
  }[];
  redirections: {
    topics: string[];
    admin_email: string;
  };
  responses: {
    error_en: string;
    error_zh: string;
    redirect_en: string;
    redirect_zh: string;
  };
}
```

### 7.2 Image Management
- Cloudinary optimization rules
- Image size limits
- Loading strategy
- Fallback handling

### 7.3 Response Templates
- Error messages in both languages
- System notifications
- Cart updates
- Order confirmations

## 8. Testing Strategy

### 8.1 LLM Testing
- Response accuracy
- Language handling
- Knowledge base integration
- Error cases
- Performance metrics

### 8.2 Integration Testing
- Auth flow
- Cart operations
- Order placement
- Image loading
- Database operations

### 8.3 User Flow Testing
- Cross-browser testing
- Mobile responsiveness
- Load testing
- Error handling
- Cart persistence

## 9. Key Benefits of This Architecture

### 9.1 Centralized Intelligence
- Single LLM endpoint
- Consistent response handling
- Unified knowledge base
- Streamlined data flow

### 9.2 User Experience
- Natural language interaction
- Bilingual support
- Fast response times
- Clear error handling
- Seamless cart integration

### 9.3 Maintainability
- Clear file structure
- Modular components
- Consistent coding patterns
- Easy to update knowledge base
- Comprehensive logging


Ah yes, this is a crucial addition for cost control and system integrity. Let me add a section about this and show some example scenarios:

## 10. LLM Usage Controls

### 10.1 Strict Scope Enforcement
- LLM only responds to queries about:
  - Book catalog searches
  - Website navigation
  - Cart management
  - Order status
  - Pre-defined Buddhist concepts (from knowledge base only)

### 10.2 Response Boundaries
```typescript
const ALLOWED_TOPICS = {
  BOOK_SEARCH: true,
  CART_MANAGEMENT: true,
  ORDER_STATUS: true,
  WEBSITE_NAVIGATION: true,
  KNOWLEDGE_BASE_CONCEPTS: true,
  // Everything else: false
};

const OUT_OF_SCOPE_RESPONSE = {
  en: "I can only assist with browsing and ordering books from our catalog. For other topics, please contact our administrators at [admin_email].",
  zh: "我只能协助您浏览和订购我们目录中的书籍。关于其他话题，请联系我们的管理员：[admin_email]"
};
```

### 10.3 Example Scenarios:

```
User: What's the weather like today?

LLM: I can only assist with browsing and ordering books from our catalog. For other topics, please contact our administrators at [admin_email].

User: Tell me a joke

LLM: I can only assist with browsing and ordering books from our catalog. For other topics, please contact our administrators at [admin_email].

User: Can you help me with my homework?

LLM: I can only assist with browsing and ordering books from our catalog. For other topics, please contact our administrators at [admin_email].

User: What are your thoughts on world peace?

LLM: I can only assist with browsing and ordering books from our catalog. For other topics, please contact our administrators at [admin_email].

User: I want to learn photography

LLM: I can only assist with browsing and ordering books from our catalog. For other topics, please contact our administrators at [admin_email].

User: 讲个笑话吧

LLM: 我只能协助您浏览和订购我们目录中的书籍。关于其他话题，请联系我们的管理员：[admin_email]。

User: 最近的新闻怎么样？

LLM: 我只能协助您浏览和订购我们目录中的书籍。关于其他话题，请联系我们的管理员：[admin_email]。

```

### 10.4 Anti-Spam Measures
- Rate limiting per user session
- Consecutive off-topic query tracking
- Session timeout for repeated misuse
- Clear warning messages
- Log tracking for abuse patterns

This strict control helps:
- Reduce unnecessary API costs
- Maintain system focus
- Prevent misuse
- Provide clear user guidance
- Protect system resources

