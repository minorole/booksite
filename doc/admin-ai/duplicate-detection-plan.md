# Unified Duplicate Detection (Books & Items) — Design & Rollout Plan

## Summary

- Keep a single duplicate-check tool (`check_duplicates`) for both books and non-book items. Reuse flow; extend parameters to accept item fields (name/type/tags/category).
- Make detection “embeddings-first”: use vector search (text + image) to shortlist candidates quickly; call vision LLM only as a rare tie‑breaker. This scales to thousands of listings with low latency and cost.
- Normalize images before similarity to be robust when the same cover is photographed in different settings (backgrounds, angles).
- Maintain AgentKit/Responses for orchestration; remain OpenAI‑only per ADR 0004; keep embeddings provider‑agnostic.

Why this approach

- Single tool simplifies UX and maintenance.
- Vector retrieval is the industry-proven pattern for fast, scalable similarity at catalog size; LLM is used sparingly.
- Normalized crops + embeddings are robust to background differences—solving “same cover, different background”.

---

## Current State (as of this repo)

- Tool: `check_duplicates` (book-centric)
  - src/lib/admin/agents/tools.ts:48 — tool definition (title/author/publisher + cover_image)
- Service flow (books):
  - src/lib/admin/services/duplicates.ts:6 — orchestrates text search, optional visual compare, decision, logging
  - src/lib/admin/services/vision/similarity.ts:29 — prompt compares “Buddhist book covers” (book-specific wording)
- DB search (ILIKE):
  - src/lib/db/admin/duplicates.ts:7 — text search on title/author; returns basic projections with category/tags
- Item analysis is supported and rendered, but no item‑specific duplicate checker:
  - src/lib/admin/services/vision/item-analysis.ts:8 — returns structured details for non‑book items
  - src/components/admin/ai-chat/MessageContent.tsx:73 — renders item_analysis
- Categories include items:
  - src/lib/db/enums.ts:16 — DHARMA_ITEMS, BUDDHA_STATUES
  - src/lib/admin/constants.ts:40 — CATEGORY_LABELS for items

Limitations

- Duplicate tool is book‑specialized (params + prompt wording).
- No embeddings; ILIKE scales poorly; vision compare is used more than necessary.
- Visual compare prompt is not background‑robust.

---

## Decision: Reuse a Single Tool

- Keep name: `check_duplicates`.
- Extend parameters to accept either book‑style fields (title/author/publisher) or item‑style fields (name/type/tags) and an optional `category_type` to hint domain.
- Service branches internally based on provided inputs; result shape stays identical (matches + recommendation).

Reasoning

- One tool keeps the chat UX simple and avoids split logic. Items already live in the same catalog, differentiated by `category_type`.

---

## Long‑Term Architecture (Performance & Scale)

0. Optional Cheap Prefilter (before embeddings or LLM)

- Perceptual hashing (pHash/dHash) on normalized 512×512 cover crops to quickly flag obvious near‑duplicates.
- Benefit: very low cost; can short‑circuit some comparisons before heavier steps (embeddings or LLM).
- Status: optional and disabled by default; add only after Phase 1 if needed.

1. Embeddings‑First Retrieval

- Text embeddings: OpenAI text‑embedding‑3 (choose one dimension: small 1536D or large 3072D). Pick a single dimension and align DB accordingly; record the chosen dim in config/schema.
  - Books: title zh/en, author(s), publisher, normalized tags
  - Items: name zh/en, type, normalized tags
- Image embeddings (optional later): provider‑dependent (e.g., OpenCLIP self‑host; or a hosted multimodal embedding provider). Store image embeddings in a provider‑keyed table and persist the dimension used to avoid lock‑in.
- Storage & Indexes (pgvector + HNSW):
  - Text: either a column on `books` (easiest) or a separate table `book_text_embeddings(book_id, embedding vector(<chosen_dim>))` with HNSW on `embedding` (chosen in this implementation).
  - Image: provider‑keyed table (e.g., `image_embeddings(provider, dim, book_id, embedding)`), since dims vary by provider.
  - Indexes: `vector_cosine_ops`, `m=16`, `ef_construction=64`
- Runtime query:
  - Get top‑N by text KNN; if a photo is present, union with top‑N by image KNN
  - Weighted score: e.g., `0.6*text + 0.4*image` (tune)
  - Thresholds: high → duplicate; mid → needs_review; low → create_new

2. LLM Only for Tie‑Breakers

- For 1–3 borderline candidates, call a single vision model to adjudicate with explicit instruction: “focus on the printed cover/artwork, ignore background context”.
- Today: replace the specific “book cover” prompt with product‑neutral wording; continue using Responses API via AgentKit with strict JSON schemas.

3. Robust Normalization for Visual Similarity

- Use a Cloudinary derivative for similarity: square crop, gravity auto, 512×512, `f_auto`, `q_auto`, minimal padding. Compare derivatives, not raw photos.
- Benefit: same cover different background remains highly similar in embedding space.

4. Provider Strategy (Chat/Vision vs Embeddings)

- Orchestration: keep OpenAI AgentKit + Responses API (already used) and remain OpenAI‑only per ADR 0004.
  - References: `src/lib/admin/chat/orchestrator-agentkit.ts`, `src/lib/openai/responses.ts`, `src/lib/openai/models.ts`
- Vision/OCR: use OpenAI GPT‑5‑mini with neutral prompts and strict JSON schemas; do not mix providers in production at this stage.
- Embeddings are independent from the chat model:
  - Text: OpenAI text‑embedding‑3 (small 1536D or large 3072D); pick one dimension and align DB/indexes.
  - Image: optional later; provider‑dependent (OpenCLIP self‑host or hosted multimodal). Use provider‑keyed storage so dimensions can differ without lock‑in.

Reasoning

- Keep agent runtime stable; swap specialized components (OCR, image embeddings) as needed without vendor lock‑in.

---

## Detailed Changes

A) Tool schema (single tool)

- File: src/lib/admin/agents/tools.ts:48 (check_duplicates)
- Extend parameters to accept item inputs:
  - Add: `name` (string|nullable), `type` (string|nullable), `tags` (string[]|nullable), `category_type` (enum|nullable)
  - Keep existing book fields; tool validates presence of either book or item fields
- No new tool added; agents keep calling `check_duplicates`

B) Service branching + prompt generalization

- File: src/lib/admin/services/duplicates.ts:6
  - Branch: if item fields present or `category_type` ∈ {DHARMA_ITEMS, BUDDHA_STATUES}, run “item mode”; else “book mode”
  - “Item mode” search includes name/type/tags, filters categories accordingly
  - Visual compare invoked only for top candidates (post-embeddings rollout) or all matches (pre‑embeddings)
- File: src/lib/admin/services/vision/similarity.ts:29
  - Replace prompt text with product‑neutral instruction:
    - “Compare these two product photos (book cover or item). Focus on the printed cover/artwork area; ignore background. Return ONLY JSON …”

C) DB Helpers

- File: src/lib/db/admin/duplicates.ts:7
  - Extend existing ILIKE helper to optionally:
    - Limit by item categories; match against `title_zh/title_en` for item name; include tags filter if provided
  - Keep output shape `BookBase[]` (shared projection)

D) Embeddings (Phase 2)

- Supabase migration (SQL):
  - Enable pgvector if not enabled
  - Add columns: `text_embedding vector(3072)`, `image_embedding vector(512)` to `books`
  - Add indexes: HNSW on both with `vector_cosine_ops`
  - Alternative (future‑proof images): separate table `book_image_embeddings(book_id uuid, provider text, dims int, embedding vector)`, unique(book_id, provider)
- Backfill job (server task or script):
  - Compute text embeddings for all rows
  - Compute image embeddings for rows with images (use normalized Cloudinary derivative)
  - Batch in chunks (100–500)
- Service changes:
  - Update `checkDuplicates` to prefer vector KNN; fall back to ILIKE if embeddings missing
  - Combine text and image candidates; compute weighted score; threshold logic unchanged conceptually

E) Normalized “for‑similarity” image URLs

- File: src/lib/admin/image-upload.ts
  - Add a helper `getSimilarityImageUrl(url: string): string` to generate derivative (square, gravity:auto, 512×512, f_auto, q_auto)
- File: src/lib/admin/services/vision/similarity.ts
  - Use the derivative URLs for visual comparisons (pre‑ or post‑embeddings tie‑breakers)

F) Agent & Router copy

- File: src/lib/admin/agents/vision.ts:8 — mention that `check_duplicates` works for both books and items
- File: src/lib/admin/agents/inventory.ts:9 — “Confirm duplicates have been checked when creating new items or books.” (tighten wording)
- File: src/lib/admin/agents/router.ts:6 — route item duplicate requests to Vision explicitly

G) UI/i18n (optional polish)

- File: src/lib/admin/i18n.ts:58 — we keep `check_duplicates` label as‑is to avoid churn
- Existing UI already renders duplicate results (MessageContent.tsx) and item analysis

H) Observability & Guardrails

- Continue logging actionable events:
  - `CHECK_DUPLICATE` start/finish with counts & thresholds used
  - `FUNCTION_CALL`/`FUNCTION_SUCCESS` (already logged by orchestrator)
- Rate limit, concurrency protections remain unchanged

---

## “Same Cover, Different Background” Handling

- Normalization: compare Cloudinary derivatives (crop:fill, gravity:auto, 512×512) → backgrounds less influential
- Embeddings: CLIP/Vertex embeddings are robust to background clutter and small framing differences; cosine similarity remains high for same cover
- LLM tie‑breaker instruction: explicitly ask to ignore background and focus on cover/artwork area

Reasoning

- This combination provides background‑invariant similarity while remaining fast and cheap.

---

## Rollout Plan (Small, Reversible Steps)

Phase 1 — Unify tool + robust prompt (no DB changes)

- Extend `check_duplicates` parameters (tools.ts)
- Service branching for items (duplicates.ts)
- Generalize vision similarity prompt (similarity.ts)
- Add normalized similarity URL helper (image-upload.ts) and use it in similarity
- Validate on sample books and items; capture latency and tool calls per request

Phase 2 — Add embeddings + indexes

- Supabase migration to add `text_embedding`, `image_embedding`, and HNSW indexes
- Backfill batch job (with retry and progress logging)
- Update service to use vector KNN first, ILIKE as fallback; limit LLM compares to top 1–3 borderline cases
- Tune thresholds from logs (target: ~0–1 LLM call per request)

Phase 3 — Provider toggles (optional)

- Remain OpenAI‑only per ADR 0004. If evaluation later shows benefit, introduce provider toggles via a new ADR with a clear rollback plan.
- Keep embeddings provider independent (OpenCLIP vs hosted) and switchable via provider‑keyed config when added.

---

## Validation & Benchmarks

- Metrics to record per request:
  - Candidate counts per stage, KNN latency, LLM calls count, total latency, final decision
- Quality checks:
  - 30–50 known duplicate pairs (same cover, varied backgrounds) → target ≥95% recall at top‑5
  - 30–50 near‑duplicates with edition/publisher differences → target “needs_review”
- Performance goals (thousands of listings):
  - Vector KNN: <50 ms P95
  - Overall check (no tie‑breaker): <200 ms P95
  - With tie‑breaker: <1.2 s P95

---

## Evaluation Plan (Provider and Pipeline Changes)

- Dataset: 50–100 covers with mixed Chinese/English and known duplicate/non‑duplicate labels; include “same cover, different background” cases.
- Metrics:
  - OCR field accuracy (title/author/publisher per language)
  - Duplicate detection: recall@K, precision, and rate of “needs_review”
  - Latency and error rate per stage (shortlist, tie‑breaker)
- Process:
  - Compare normalized‑image vs raw, with and without optional pHash/dHash prefilter.
  - Once embeddings are added, compare “embeddings‑first + tie‑breaker” against baseline (ILIKE + tie‑breaker).
- Decision: Use results to tune thresholds and decide on future ADRs (e.g., adding providers or changing embedding strategies).

---

## Risks & Mitigations

- Embedding dimension lock‑in (image): choosing CLIP 512D now may constrain switching to 1408D later
  - Mitigation: use separate `book_image_embeddings` table keyed by provider; migrate gradually
- OCR variance for CN/EN
  - Mitigation: improve prompts + strict JSON schemas; remain OpenAI‑only now per ADR 0004. If gaps persist and data proves it, evaluate alternates behind a new ADR.
- Cost creep from LLM vision compares
  - Mitigation: embeddings‑first; reduce tie‑breakers via tuned thresholds/logging

---

## Implementation Notes (File‑level references)

- Tool: src/lib/admin/agents/tools.ts:48 — extend `check_duplicates` schema for item fields
- Service: src/lib/admin/services/duplicates.ts:6 — item vs book branching + tie‑breaker gating
- Visual compare prompt: src/lib/admin/services/vision/similarity.ts:29 — generalize wording; use normalized URLs
- DB helper: src/lib/db/admin/duplicates.ts:7 — accept item filters; tag filtering
- Image utils: src/lib/admin/image-upload.ts — add `getSimilarityImageUrl`
- Agents: src/lib/admin/agents/vision.ts:8, src/lib/admin/agents/inventory.ts:9, src/lib/admin/agents/router.ts:6 — copy updates only
- i18n: src/lib/admin/i18n.ts:58 — labels are fine; no new key required

---

## Open Questions

- Do we prefer a separate embeddings table (future‑proof) or fixed columns (simpler now)?
- Which image embeddings provider suits our deployment best (OpenCLIP self‑host vs Vertex hosted)?
- Desired default thresholds for decision boundaries (initial suggestion below)?

---

## Initial Thresholds (Tunable)

- Text cosine ≥ 0.90 → strong text duplicate
- Image cosine ≥ 0.92 → strong visual duplicate
- Final fused score: `0.6*text + 0.4*image`
  - ≥ 0.88 → update_existing
  - 0.78–0.88 → needs_review
  - < 0.78 → create_new

Reasoning

- Start conservative to avoid false merges. Tighten after observing logs.

---

## Provider Config (Env)

- Chat/vision model overrides: `OPENAI_TEXT_MODEL`, `OPENAI_VISION_MODEL` (already supported)
- No vision provider toggle in current scope (remain OpenAI‑only per ADR 0004). If future evaluation warrants it, introduce via a new ADR.
- Embeddings provider toggles are out of scope for now. When added, use provider‑keyed configuration and tables to avoid lock‑in and dimension drift.

---

## Appendix — Why This Works

- Single tool: less surface area, consistent UX; items are just a category of catalog entries.
- Embeddings‑first: vector indexes give sub‑100ms retrieval regardless of catalog size growth; LLM reserved for judgment calls.
- Normalization: standard crops reduce background noise; embeddings capture semantic similarity of the cover/artwork.
- AgentKit/Responses: stable orchestration, streaming, tool logs; provider toggles allow targeted improvements without a rewrite.
