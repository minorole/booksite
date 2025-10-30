# Admin AI — Features (Books & Items)

## Scope
- Assist admins in managing both books and non‑book items (e.g., Dharma items, Buddha statues) via chat and photos.
- Keep logic server‑side, behind admin auth. Confirmation is enforced server‑side (no visible UI modal) for mutating actions.

## Features
- Bilingual chat helper
  - Understands and replies in Chinese or English.
  - Explains intended actions and asks for confirmation in chat on important steps (no UI modal).

- Photo‑to‑listing (books and items)
  - You upload a photo; the AI extracts what it needs in one structured step (no separate “initial” pass).
  - Books: title(s), author(s), publisher, category suggestion, tags, quality issues.
  - Items (e.g., Dharma items, Buddha statues): name/type, material/finish if visible, size/dimensions if visible, category suggestion, tags, quality issues.
  - Flags poor image quality and asks for a better photo or manual corrections.

- Duplicate check (text + image + optional visual compare)
  - Finds possible matches by text (title/name/author/tags) and by image embedding (CLIP).
  - Picks top‑3 candidates: 1 from image‑KNN (best) and 2 from text‑KNN (best, excluding the image‑top).
  - If the best fused score is low, skips the vision visual compare; otherwise compares photos to confirm.
  - Recommends: create new, update existing, or needs review.

- Create new listing (book or item)
  - Prefills fields from photo + your edits.
  - Sets category, tags, photo, descriptions; requires explicit admin confirmation in chat (server enforces `confirmed: true`).

- Update existing listing
  - Edits names/titles, authors/publishers, descriptions, tags, category, quantity, and photos.
  - Confirmation occurs in chat; server rejects calls without `confirmed: true`.

- Inventory help
  - Checks current stock.
  - Increases/decreases quantity on request.
  - Planned: warns about low stock.

- Search and find
  - Finds products by title/name, tag, category, or quantity range.
  - Shows likely matches during duplicate checks and edits.

- Orders assistance (lightweight)
  - Looks up an order, updates status, adds tracking, and notes.
  - Warns if stock is short for items being shipped.
  - Suggests next steps (e.g., restock or partial shipment).

- Conversational flow that reduces mistakes
  - One‑shot structured analysis → propose actions → execute only after explicit chat confirmation (server‑enforced).

## Agent behavior and prompts
- Router (silent routing)
  - Routes without narration; hands off image/vision tasks to Vision; hands off creating/updating/searching books or items to Inventory; hands off orders to Orders.
- Vision (tool‑first execution)
  - Books: analyze_book_cover (structured only) → check_duplicates with extracted fields and cover_image.
  - Non‑book items: analyze_item_photo → check_duplicates with extracted item fields and image.
- Inventory (create/update/search; confirmation required)
  - Creates and updates listings (books and items); requires explicit chat confirmation (`confirmed: true`) for mutations.
  - Web search is disabled by default to stay in scope; can be enabled via env (see Configuration) if explicitly needed.
- Orchestrator (global steering)
  - Mirrors the user’s last message language.
  - When creating or updating listings, applies an allowed‑fields prelude so the model only uses supported fields and avoids unsupported ones.
  - No rerun fallback: single pass with guardrails.

## Supported fields (create/update listings)
- Allowed fields for listings: `title_zh`, `title_en`, `description_zh`, `description_en`, `category_type`, `quantity`, `tags`, `cover_image`, `author_zh`, `author_en`, `publisher_zh`, `publisher_en`.
- Unsupported examples: price/定价, ISBN, publication year/出版年份, condition/保存状态, shelf location/货架位置, barcode/条码.
- Note: Analysis outputs for items may include `material`, `finish`, `size`, `dimensions`, and quality notes; these guide creation but are not persisted as listing fields unless mapped.

## Configuration
- Inventory web search toggle (default OFF): set `ADMIN_AI_INVENTORY_WEB_SEARCH=1` (or `true`) to enable web search in the Inventory agent; otherwise it is disabled to avoid out‑of‑scope costs.
 - Image embeddings: `CLIP_EMBEDDINGS_URL` is required. If unavailable, image flows fail fast (no fallback).

- Safety and access
  - Admin‑only access via Supabase auth.
  - Rate limiting and short concurrency protection to avoid overload.

- Logging and audit
  - Records analysis, create/update actions, and order status changes for traceability.

- Helpful error handling
  - Clear messages, retry suggestions, and fallback to manual input when OCR/vision confidence is low.

- Out of scope (to keep it simple)
  - No payments or shipping carrier integrations.
  - No bulk web scraping or external knowledge bases.
  - Admin‑only (not for public end‑users).
