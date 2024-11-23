-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('DELETE_BOOK', 'EDIT_BOOK', 'CREATE_BOOK', 'UPDATE_QUANTITY', 'UPDATE_STATUS', 'PROCESS_ORDER', 'CANCEL_ORDER', 'MARK_SHIPPED', 'UPDATE_TRACKING', 'ANALYZE_IMAGE', 'CHECK_DUPLICATE', 'APPROVE_TAG', 'REJECT_TAG', 'UPDATE_TAGS', 'OVERRIDE_MONTHLY_LIMIT', 'UPDATE_SYSTEM_SETTINGS', 'UPDATE_PROMPTS');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('IMAGE_ANALYSIS', 'DUPLICATE_CHECK', 'CATEGORY_SUGGESTION', 'CONTENT_SUMMARY', 'TAG_GENERATION', 'TRANSLATION_CHECK', 'SIMILARITY_CHECK', 'LANGUAGE_DETECTION');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('INVENTORY_MANAGEMENT', 'ORDER_PROCESSING', 'CUSTOMER_SERVICE', 'GENERAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_order_date" TIMESTAMP(3),
    "language_preference" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title_zh" TEXT NOT NULL,
    "title_en" TEXT,
    "description_zh" TEXT NOT NULL,
    "description_en" TEXT,
    "cover_image" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "has_english_translation" BOOLEAN NOT NULL DEFAULT false,
    "search_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pending_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rejected_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "auto_tags" TEXT[],
    "ai_metadata" JSONB,
    "image_analysis_data" JSONB,
    "similar_books" TEXT[],
    "views" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector,
    "discontinued" BOOLEAN NOT NULL DEFAULT false,
    "discontinued_at" TIMESTAMP(3),
    "discontinued_by" TEXT,
    "discontinued_reason" TEXT,
    "last_quantity_update" TIMESTAMP(3),
    "last_llm_analysis" TIMESTAMP(3),
    "content_summary_zh" TEXT,
    "content_summary_en" TEXT,
    "author_zh" TEXT,
    "author_en" TEXT,
    "publisher_zh" TEXT,
    "publisher_en" TEXT,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookAnalysis" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "analysis_type" "AnalysisType" NOT NULL,
    "prompt_used" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admin_email" TEXT,
    "prompt_version" INTEGER NOT NULL,

    CONSTRAINT "BookAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_zh" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "description_en" TEXT,
    "description_zh" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "admin_notes" TEXT,
    "override_by" TEXT,
    "override_monthly" BOOLEAN NOT NULL DEFAULT false,
    "shipping_address_id" TEXT NOT NULL,
    "total_items" INTEGER NOT NULL,
    "tracking_number" TEXT,
    "processed_by" TEXT,
    "processing_started_at" TIMESTAMP(3),
    "llm_processing_log" JSONB,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "order_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "book_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("order_id","book_id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "cart_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("cart_id","book_id")
);

-- CreateTable
CREATE TABLE "ShippingAddress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "is_valid" BOOLEAN NOT NULL DEFAULT false,
    "validation_log" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminChatSession" (
    "id" TEXT NOT NULL,
    "admin_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" JSONB,
    "current_books" TEXT[],
    "current_orders" TEXT[],
    "session_type" "SessionType" NOT NULL,
    "last_command" JSONB,
    "conversation_history" JSONB,
    "tag_operations" JSONB,
    "confidence_threshold" DOUBLE PRECISION,
    "auto_approve_tags" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AdminChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserChatSession" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" JSONB,
    "current_books" TEXT[],
    "conversation_history" JSONB,
    "language_preference" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagHistory" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "is_auto" BOOLEAN NOT NULL,
    "added_by" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION,
    "prompt_version" INTEGER NOT NULL,

    CONSTRAINT "TagHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "action" "AdminAction" NOT NULL,
    "book_id" TEXT,
    "book_title" TEXT,
    "admin_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "llm_context" JSONB,
    "related_items" TEXT[],
    "confidence" DOUBLE PRECISION,
    "session_id" TEXT,
    "prompt_version" INTEGER,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "description" TEXT,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemPrompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "use_case" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "SystemPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Book_category_id_idx" ON "Book"("category_id");

-- CreateIndex
CREATE INDEX "Book_similar_books_idx" ON "Book"("similar_books");

-- CreateIndex
CREATE INDEX "Book_search_tags_idx" ON "Book"("search_tags");

-- CreateIndex
CREATE INDEX "Book_discontinued_idx" ON "Book"("discontinued");

-- CreateIndex
CREATE INDEX "BookAnalysis_book_id_idx" ON "BookAnalysis"("book_id");

-- CreateIndex
CREATE INDEX "BookAnalysis_analysis_type_idx" ON "BookAnalysis"("analysis_type");

-- CreateIndex
CREATE INDEX "BookAnalysis_created_at_idx" ON "BookAnalysis"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Category_type_key" ON "Category"("type");

-- CreateIndex
CREATE INDEX "Category_type_idx" ON "Category"("type");

-- CreateIndex
CREATE INDEX "Order_user_id_idx" ON "Order"("user_id");

-- CreateIndex
CREATE INDEX "Order_shipping_address_id_idx" ON "Order"("shipping_address_id");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_created_at_idx" ON "Order"("created_at");

-- CreateIndex
CREATE INDEX "OrderItem_book_id_idx" ON "OrderItem"("book_id");

-- CreateIndex
CREATE INDEX "Cart_user_id_idx" ON "Cart"("user_id");

-- CreateIndex
CREATE INDEX "Cart_expires_at_idx" ON "Cart"("expires_at");

-- CreateIndex
CREATE INDEX "CartItem_book_id_idx" ON "CartItem"("book_id");

-- CreateIndex
CREATE INDEX "ShippingAddress_user_id_idx" ON "ShippingAddress"("user_id");

-- CreateIndex
CREATE INDEX "ShippingAddress_country_idx" ON "ShippingAddress"("country");

-- CreateIndex
CREATE INDEX "AdminChatSession_admin_email_idx" ON "AdminChatSession"("admin_email");

-- CreateIndex
CREATE INDEX "AdminChatSession_session_type_idx" ON "AdminChatSession"("session_type");

-- CreateIndex
CREATE INDEX "AdminChatSession_last_activity_idx" ON "AdminChatSession"("last_activity");

-- CreateIndex
CREATE INDEX "UserChatSession_user_id_idx" ON "UserChatSession"("user_id");

-- CreateIndex
CREATE INDEX "UserChatSession_last_activity_idx" ON "UserChatSession"("last_activity");

-- CreateIndex
CREATE INDEX "TagHistory_book_id_idx" ON "TagHistory"("book_id");

-- CreateIndex
CREATE INDEX "TagHistory_tag_idx" ON "TagHistory"("tag");

-- CreateIndex
CREATE INDEX "TagHistory_added_at_idx" ON "TagHistory"("added_at");

-- CreateIndex
CREATE INDEX "AdminLog_admin_email_idx" ON "AdminLog"("admin_email");

-- CreateIndex
CREATE INDEX "AdminLog_action_idx" ON "AdminLog"("action");

-- CreateIndex
CREATE INDEX "AdminLog_created_at_idx" ON "AdminLog"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- CreateIndex
CREATE INDEX "SystemSettings_key_idx" ON "SystemSettings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SystemPrompt_name_key" ON "SystemPrompt"("name");

-- CreateIndex
CREATE INDEX "SystemPrompt_name_idx" ON "SystemPrompt"("name");

-- CreateIndex
CREATE INDEX "SystemPrompt_use_case_idx" ON "SystemPrompt"("use_case");

-- CreateIndex
CREATE INDEX "SystemPrompt_version_idx" ON "SystemPrompt"("version");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookAnalysis" ADD CONSTRAINT "BookAnalysis_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "ShippingAddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "Cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingAddress" ADD CONSTRAINT "ShippingAddress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChatSession" ADD CONSTRAINT "UserChatSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagHistory" ADD CONSTRAINT "TagHistory_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
