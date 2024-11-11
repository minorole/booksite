# AI-Powered Free Marketplace - Product Requirements Document

## 1. Product Overview
### 1.1 Product Vision
Create a revolutionary free marketplace platform that leverages AI to streamline product cataloging and discovery, making free items easily accessible to those in need.

### 1.2 Key Stakeholders
- Platform Administrator
- Item Donors
- Item Recipients
- Technical Maintainer

## 2. Technical Architecture

### 2.1 Frontend Stack
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS
- **Key Features**:
  - Server-side rendering for SEO optimization
  - Static page generation for performance
  - Client-side real-time updates
  - Responsive design for mobile/desktop
  - Progressive Web App capabilities

### 2.2 Backend Infrastructure
- **Hosting**: Vercel (Production & Preview environments)
- **Database**: PostgreSQL with Prisma ORM + pgvector extension
- **Authentication**: 
  - Supabase Auth with Magic Link Email
  - Role-based access control
  - Protected routes and API endpoints
- **File Storage**: Cloudinary
- **Caching**: 
  - Next.js built-in cache
  - Vercel Edge Cache
  - Upstash Redis (API/Session caching)
- **Real-time**: Supabase Realtime

### 2.3 AI Integration
- **Image Processing**: OpenAI Vision API / Claude
  - Text extraction from product images
  - Automated categorization
  - Product description generation
- **Search Enhancement**: Vector similarity search
- **Inventory Management**: AI-assisted quantity estimation

## 3. Core Features

### 3.1 Product Management
- AI-powered product entry system
  - Snap photo → Extract info → Auto-categorize
  - Automated metadata generation
  - Smart inventory tracking
- Bulk upload capabilities
- Version history and edit logging

### 3.2 User Features
- Simple registration/login
- Product browsing with advanced filters
- Wishlist functionality
- Order placement without payment
- Order history
- User profiles

### 3.3 Search & Discovery
- Natural language search
- Category-based browsing
- AI-powered recommendations
- Similar item suggestions
- Smart filtering options

### 3.4 Admin Dashboard
- Inventory management
- User management
- Order processing
- Analytics dashboard
- AI training interface
- System health monitoring

## 4. Database Schema

### 4.1 Core Models
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String?
  role          Role      @default(USER)
  created_at    DateTime  @default(now())
  orders        Order[]
  accounts      Account[]
  sessions      Session[]
}

model Product {
  id          String      @id @default(uuid())
  name        String
  description String
  category    String
  quantity    Int         @default(0)
  image_urls  String[]    @default([])
  metadata    Json        @default("{}")
  created_at  DateTime    @default(now())
  updated_at  DateTime    @updatedAt
  order_items OrderItem[]
  donor_id    String?    // Track who donated the item
  location    String?    // Physical location for pickup
  condition   String?    // Item condition
  tags        String[]   // For better searchability
  ai_metadata Json?      // Store AI-generated insights
  views       Int        @default(0)  // Track popularity
}

model Order {
  id          String      @id @default(uuid())
  user_id     String
  user        User        @relation(fields: [user_id], references: [id])
  status      OrderStatus @default(PENDING)
  pickup_date DateTime
  created_at  DateTime    @default(now())
  order_items OrderItem[]

  @@index([user_id])
}

model OrderItem {
  order_id    String
  product_id  String
  quantity    Int
  order       Order    @relation(fields: [order_id], references: [id])
  product     Product  @relation(fields: [product_id], references: [id])

  @@id([order_id, product_id])
}

model Location {
  id          String    @id @default(uuid())
  name        String
  address     String
  coordinates Json      // Store lat/long
  products    Product[]
}

model Category {
  id          String    @id @default(uuid())
  name        String
  parent_id   String?
  parent      Category? @relation("CategoryHierarchy", fields: [parent_id], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  products    Product[]
}

enum Role {
  USER
  ADMIN
}

enum OrderStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}
```

## 5. API Endpoints

### 5.1 Product APIs
```
GET    /api/products
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id
POST   /api/products/scan
```

### 5.2 Order APIs
```
POST   /api/orders
GET    /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id
```

## 6. Development Phases

### 6.1 Phase 1 - MVP (1 month)
- Basic product listing
- Simple search
- User authentication (Passwordless Magic Link Email)
- Basic order placement
- Cloudinary integration for image storage
- Basic caching implementation
- WebSocket setup for real-time updates

### 6.2 Phase 2 - AI Integration (1 month)
- Image processing
- Smart categorization
- Enhanced search
- pgvector setup for vector similarity search
- Redis cache for frequent queries
- Real-time inventory updates

### 6.3 Phase 3 - Advanced Features (1 month)
- Analytics dashboard
- Inventory predictions
- API optimization
- Performance enhancements
- Advanced caching strategies
- WebSocket optimization
- CDN performance tuning

## 7. Technical Considerations

### 7.1 Performance Requirements
- Page load time < 2s
- API response time < 500ms
- Support 1000+ daily active users
- Handle 100+ concurrent users
- Redis cache hit ratio > 80%
- WebSocket connection limit: 1000 concurrent
- Image optimization and delivery via Cloudinary CDN

### 7.2 Security Requirements
- HTTPS enforcement
- Rate limiting
- Input validation
- Type-safe database queries through Prisma
- XSS protection
- CSRF protection
- Secure session management with NextAuth.js

### 7.3 Monitoring
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)
- Database monitoring (Prisma Studio)
- Query performance insights (Prisma metrics)
- WebSocket connection metrics
- Redis cache performance
- Cloudinary usage metrics

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

Total Estimated Monthly Cost: $25-60 (including Redis cache buffer)

## 9. Future Considerations
- Mobile app development
- Multi-language support
- Integration with local nonprofits
- Donation tracking system
- Community features
- Advanced analytics
