# Admin AI — Features (Books & Items)

## Scope
- Assist admins in managing both books and non‑book items (e.g., Dharma items, Buddha statues) via chat and photos.
- Keep logic server‑side, behind admin auth. Confirmation is enforced server‑side (no visible UI modal) for mutating actions.

## Features
- Bilingual chat helper
  - Understands and replies in Chinese or English.
  - Explains intended actions and asks for confirmation in chat on important steps (no UI modal).

- Photo‑to‑listing (books and items)
  - You upload a photo; the AI extracts what it can.
  - Books: title(s), author(s), publisher, category suggestion, tags, quality issues.
  - Items (e.g., Dharma items, Buddha statues): name/type, material/finish if visible, size/dimensions if visible, category suggestion, tags, quality issues.
  - Flags poor image quality and asks for a better photo or manual corrections.

- Duplicate check (text + visual)
  - Finds possible matches by title/name/author and tags.
  - Compares photos (layout/content similarity) to spot look‑alikes.
  - Recommends: create new, update existing, or needs review.

- Create new listing (book or item)
  - Prefills fields from photo + your edits.
  - Sets category, tags, photo, descriptions; requires explicit admin confirmation in chat (server enforces `confirmed: true`).

- Update existing listing
  - Edits names/titles, descriptions, tags, category, quantity, and photos.
  - Confirmation occurs in chat; server rejects calls without `confirmed: true`.

- Inventory help
  - Checks current stock.
  - Increases/decreases quantity on request.
  - Warns about low stock.

- Search and find
  - Finds products by title/name, tag, category, or quantity range.
  - Shows likely matches during duplicate checks and edits.

- Orders assistance (lightweight)
  - Looks up an order, updates status, adds tracking, and notes.
  - Warns if stock is short for items being shipped.
  - Suggests next steps (e.g., restock or partial shipment).

- Conversational flow that reduces mistakes
  - Initial analysis → show findings → structured extraction → propose actions → execute only after explicit chat confirmation (server‑enforced).

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
