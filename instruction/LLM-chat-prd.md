# LLM-Powered Chat Interface for Database Management
- ALWAYS fully utilize the LLM's capabilities to process natural language and image data, no preset language.

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
    READY_FOR_PICKUP,
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

### 5.2 Validation Constraints
- Titles: Require at least one language
- Quantities: Non-negative integers
- Categories: Must match CategoryType enum
- Images: Valid Cloudinary URLs

### 5.3 Order Processing Rules
done with order system, not part of the chat interface

### 5.4 Search and Query Rules
- Multi-language search support (English/Chinese)
- Fuzzy matching for titles and author names
- Tag-based filtering
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

## 8. Scenario examples:
### 8.1 Initial Upload Scenario:

Admin: [Uploads an image of a Buddhist book]

LLM: I'll process this image for you and check our database. Let me analyze it step by step.

I've detected some text from the image. Here's what I found:

Title (Chinese): 淨土十要
Title (English): Ten Essentials of Pure Land Buddhism
Extracted tags: 淨土, Pure Land, 印光大師
Category suggestion: PURE_LAND_BOOKS (净土佛书)

Let me check our database for potential duplicates...

[After database search and image comparison](duplicate-detection.ts we use title and tags to do first check then use LLM to compare the image if title and tags are similar)

I found a similar book in our database. Let me show you both images side by side:

These appear to be different editions of the same book. The existing book has:

Title: 淨土十要 (Second Edition)
Current quantity: 15
Category: PURE_LAND_BOOKS
Would you like to:

Update the existing listing
Create a new listing for this edition
Let me know if the extracted information needs correction

Admin: No, this is a different book. The title should be 淨土指歸

LLM: I apologize for the misunderstanding. Thank you for the correction. I'll update the information:

Title (Chinese): 淨土指歸
Title (English): null (I don't see an English title on the cover)
Category: PURE_LAND_BOOKS (净土佛书)
Tags: 淨土, 指歸

I'm no longer finding any duplicates with this title. How many copies would you like to add to the inventory?

Admin: 50 copies. Also add 印光大師 to the tags

LLM: I'll add 50 copies and update the tags. Here's the final information before I create the listing:

Title (Chinese): 淨土指歸
Title (English): null
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity: 50

Creating the listing now... Done! The book has been added to the inventory. Would you like to make any other changes or add a description?

Admin: yes change the english title to "Pure Land Guidelines"

LLM: I'll update the English title for 淨土指歸:

Title (Chinese): 淨土指歸
Title (English): Pure Land Guidelines
Category: PURE_LAND_BOOKS
Tags: 淨土, 指歸, 印光大師
Quantity: 50

I've updated the listing with the English title. Is there anything else you'd like to modify?
Admin: show me all books with less than 20 copies
LLM: I'll search for books with low inventory (less than 20 copies).
Here's what I found:

淨土修持指要 (Essential Guidelines for Pure Land Practice)

Quantity: 12 copies
Category: PURE_LAND_BOOKS


阿彌陀經講義 (Commentary on Amitabha Sutra)

Quantity: 8 copies
Category: PURE_LAND_BOOKS


禪門修證指要 (Essential Guidelines for Chan Practice)

Quantity: 15 copies
Category: OTHER_BOOKS


佛陀本生故事 (Buddha's Jataka Tales)

Quantity: 5 copies
Category: OTHER_BOOKS



Would you like me to sort these by quantity, category, or would you like to update any of these quantities?
Admin: remove the buddha tales book, we are not planning to restock
LLM: I understand you want to remove "佛陀本生故事" (Buddha's Jataka Tales) from the inventory.
Current information:

Title (Chinese): 佛陀本生故事
Title (English): Buddha's Jataka Tales
Current quantity: 5
Category: OTHER_BOOKS

Setting quantity to 0 will effectively remove it from active inventory. Would you like me to proceed with this?
Also, would you like me to add a note in the system indicating that this item won't be restocked?
Admin: yes and yes
LLM: I've updated the book "佛陀本生故事" (Buddha's Jataka Tales):

Set quantity to 0
Added system note: "Item discontinued - not for restock"

Here's the updated low inventory list (less than 20 copies):

淨土修持指要 (Essential Guidelines for Pure Land Practice)

Quantity: 12 copies
Category: PURE_LAND_BOOKS


阿彌陀經講義 (Commentary on Amitabha Sutra)

Quantity: 8 copies
Category: PURE_LAND_BOOKS


禪門修證指要 (Essential Guidelines for Chan Practice)

Quantity: 15 copies
Category: OTHER_BOOKS



Would you like to check any other inventory levels or make additional updates?


### 8.2 Natural Language Inventory Update Scenario:
Admin: do we have any pure land books by 印光大師?
LLM: Let me search the database for Pure Land books by Master Yin Guang.
I found several books:

淨土指歸 (Pure Land Guidelines) - 50 copies
印光大師文鈔 (Collected Works of Master Yin Guang) - 25 copies
淨土修持指要 (Essential Guidelines for Pure Land Practice) - 12 copies

Would you like to see more details about any of these books or make inventory updates?
Admin: the second one is running low, add 30 more copies
LLM: I understand you want to add 30 copies to "印光大師文鈔" (Collected Works of Master Yin Guang).Let me confirm we're updating the correct book: (show the book details including cover image)
Is this the correct book you want to update?

Current quantity: 25 copies
Adding: 30 copies
New total will be: 55 copies

Should I proceed with this update?
Admin: yes, and update the english title to "Selected Writings of Master Yin Guang"
LLM: I'll make both updates:

Increasing quantity from 25 to 55 copies
Updating English title from "Collected Works of Master Yin Guang" to "Selected Writings of Master Yin Guang"

Here's the updated information:

Title (Chinese): 印光大師文鈔
Title (English): Selected Writings of Master Yin Guang
Category: PURE_LAND_BOOKS
Quantity: 55 copies
Tags: 印光大師, 淨土, 文鈔

Both changes have been applied. The inventory and title have been updated. Is there anything else you'd like to modify?
Admin: show me all books with less than 20 copies
LLM: I'll search for books with low inventory (less than 20 copies).
Here's what I found:

淨土修持指要 (Essential Guidelines for Pure Land Practice)

Quantity: 12 copies
Category: PURE_LAND_BOOKS


阿彌陀經講義 (Commentary on Amitabha Sutra)

Quantity: 8 copies
Category: PURE_LAND_BOOKS


禪門修證指要 (Essential Guidelines for Chan Practice)

Quantity: 15 copies
Category: OTHER_BOOKS


佛陀本生故事 (Buddha's Jataka Tales)

Quantity: 5 copies
Category: OTHER_BOOKS



Would you like me to sort these by quantity, category, or would you like to update any of these quantities?
Admin: remove the buddha tales book, we are not planning to restock
LLM: I understand you want to remove "佛陀本生故事" (Buddha's Jataka Tales) from the inventory.
Current information:

Title (Chinese): 佛陀本生故事
Title (English): Buddha's Jataka Tales
Current quantity: 5
Category: OTHER_BOOKS

Setting quantity to 0 will effectively remove it from active inventory. Would you like me to proceed with this?
Also, would you like me to add a note in the system indicating that this item won't be restocked?
Admin: yes and yes
LLM: I've updated the book "佛陀本生故事" (Buddha's Jataka Tales):

Set quantity to 0
Added system note: "Item discontinued - not for restock"

Here's the updated low inventory list (less than 20 copies):

淨土修持指要 (Essential Guidelines for Pure Land Practice)

Quantity: 12 copies
Category: PURE_LAND_BOOKS


阿彌陀經講義 (Commentary on Amitabha Sutra)

Quantity: 8 copies
Category: PURE_LAND_BOOKS


禪門修證指要 (Essential Guidelines for Chan Practice)

Quantity: 15 copies
Category: OTHER_BOOKS



Would you like to check any other inventory levels or make additional updates?


### 8.3 Order Management Scenario:
Admin: show me new orders that need processing
LLM: I'll check for new orders in the system.
I found 3 new orders that need processing:
Order #1242 (Received 2 hours ago)
Status: NEW
Items:
淨土指歸 (Pure Land Guidelines) x 2
印光大師文鈔 (Selected Writings of Master Yin Guang) x 1
(show the book ID adn cover image)
Shipping info: name, address, contacts. 
Notes: (customer provided)

Order #1243 (Received 1 hour ago)

Status: NEW
Items:

阿彌陀經講義 (Commentary on Amitabha Sutra) x 5


Shipping: Standard shipping
Notes: None

Order #1244 (Just received)

Status: NEW
Items:

禪門修證指要 (Essential Guidelines for Chan Practice) x 3
淨土指歸 (Pure Land Guidelines) x 1


Shipping: Express shipping
Notes: Urgent request

Would you like to process any of these orders?
Admin: start with order 1242
LLM: I'll help process Order #1242. Let me check inventory levels for these items.
Checking inventory:

淨土指歸 (Pure Land Guidelines)

Requested: 2 copies
Current stock: 50 copies ✓ Available


印光大師文鈔 (Selected Writings of Master Yin Guang)

Requested: 1 copy
Current stock: 55 copies ✓ Available



All items are in stock. Since this is a local pickup order, would you like me to:

Mark items as reserved
Generate pickup slip
Send confirmation email
Update order status to "PROCESSING"

What would you like me to do first?
Admin: do all of that and mark it ready for pickup
LLM: Processing Order #1242...

✓ Items marked as reserved:

淨土指歸 x 2 (Stock updated: 48 remaining)
印光大師文鈔 x 1 (Stock updated: 54 remaining)


✓ Pickup slip generated with:

Order details
Customer information
Pickup instructions
QR code for quick scanning


✓ Confirmation email sent to customer with:

Pickup location
Business hours
Order summary
Reference number


✓ Order status updated to "READY_FOR_PICKUP"

Order #1242 is now ready for pickup. The system will notify us when the customer collects their order.
Would you like to process Order #1243 or #1244 next?
Admin: no lets check all ready for pickup orders from last week that hasn't been picked up
LLM: I'll search for uncollected pickup orders from last week.
Found 2 orders that haven't been picked up:
Order #1235 (Created: 8 days ago)

Status: READY_FOR_PICKUP
Items:

禪門修證指要 x 1


Last notification: 7 days ago
Notes: Customer was notified twice

Order #1238 (Created: 6 days ago)

Status: READY_FOR_PICKUP
Items:

淨土指歸 x 3
阿彌陀經講義 x 1


Last notification: 2 days ago
Notes: Customer confirmed pickup but hasn't arrived

Would you like me to:

Send reminder notifications
Cancel the orders and return items to inventory
Keep them on hold longer
Contact customers directly

What action should we take for these orders?
Admin: send one more reminder, if no response by tomorrow, cancel them and return to inventory
LLM: Understood. I'll send final reminders for both orders now.
✓ Order #1235:

Final reminder sent to customer
Message includes: 24-hour pickup deadline
Alert set for tomorrow at this time

✓ Order #1238:

Final reminder sent to customer
Message includes: 24-hour pickup deadline
Alert set for tomorrow at this time

I've scheduled automatic cancellation for tomorrow if no response:

If cancelled, items will be returned to inventory
You'll receive a notification when:

Customers respond to reminders
Orders are auto-cancelled
Inventory is restored



Would you like me to show you other orders that need attention or modify the cancellation settings?
################################


Admin: show me new orders that need processing
LLM: I'll check for new orders in the system.
Found 3 new orders that need processing:
Order #1242 (Received 2 hours ago)
Status: NEW
Items:

Book ID: BK-2024-0472
淨土指歸 (Pure Land Guidelines) x 2
[Cover Image]
Book ID: BK-2024-0389
印光大師文鈔 (Selected Writings of Master Yin Guang) x 1
[Cover Image]

Shipping Information:

Name: John Smith
Phone: +1 (555) 123-4567
Email: john.smith@email.com
Address: 123 Dharma Street, Unit 5
Pure Land City, PL 12345

Notes: (customer provided)

Order #1243 (Received 1 hour ago)
Status: NEW
Items:

Book ID: BK-2024-0156
阿彌陀經講義 (Commentary on Amitabha Sutra) x 5
[Cover Image]

Shipping Information:

Name: Mary Johnson
Phone: +1 (555) 987-6543
Email: mary.j@email.com
Address: 456 Buddha Avenue
Dharma City, DC 54321

Notes: None

Order #1244 (Just received)
Status: NEW
Items:

Book ID: BK-2024-0233
禪門修證指要 (Essential Guidelines for Chan Practice) x 3
[Cover Image]
Book ID: BK-2024-0472
淨土指歸 (Pure Land Guidelines) x 1
[Cover Image]

Shipping Information:

Name: David Chen
Phone: +1 (555) 246-8135
Email: d.chen@email.com
Address: 789 Meditation Lane
Zen Valley, ZV 98765

Notes: Urgent request - Needed for study group next week

Would you like to process any of these orders?
Admin: i will start with order 1242
LLM: I'll help process Order #1242. setting the status to processing. confirmation email sent.
Admin: the tracking number is TBD-24022-1242
LLM:  Tracking number added: TBD-24022-1242, status updated to shipped. 
shipping confirmation email sent to john.smith@email.com 
What would you like to do next?

Admin: show me all orders that are processing
LLM: Here are all orders with status "processing":
Order #1244
Status: processing
Items:
Book ID: BK-2024-0472
淨土指歸 (Pure Land Guidelines) x 2
[Cover Image]
Book ID: BK-2024-0389
印光大師文鈔 (Selected Writings of Master Yin Guang) x 1
[Cover Image]

Shipping Information:

Name: John Smith
Phone: +1 (555) 123-4567
Email: john.smith@email.com
Address: 123 Dharma Street, Unit 5
Pure Land City, PL 12345

Notes: 

Order #1239 
Status: processing
Items:

Book ID: BK-2024-0167
佛門修持指南 (Buddhist Practice Guide) x 1
[Cover Image]

Shipping Information:

Name: Sarah Williams
Phone: +1 (555) 777-9999
Email: s.williams@email.com
Address: 321 Temple Road
Dharma Valley, DV 67890

Notes: None
what would you like to do?
admin: update order 1239 to shipped with no tracking number
LLM: order 1239 status updated to shipped. no tracking number.
email sent.
