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

#### 2.3.1 AI-Powered Chatbox for Admin Panel
- **Interactive Chat Interface**: 
  - A chatbox that greets the admin and asks what they would like to do (e.g., change inventory number, add new listing).
  - Supports text input and file uploads (images) from both desktop and mobile devices.
- **Image Upload and Processing**:
  - Admins can upload book images directly from their devices.
  - The system uses AI to extract information such as title and subtitle from the image.
  - Generates a draft description for the book, which the admin can edit.
- **Inventory Management**:
  - Allows admins to update inventory numbers or add new listings through the chat interface.
  - Once confirmed, the system sends the data to the backend to update the database and store the image for the listing.

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
- OpenAI API: ~$20-50 (dependent on usage)
- OR Claude API: Similar range

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
