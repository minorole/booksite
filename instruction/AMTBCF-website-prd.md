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

