## Admin AI Inventory Handoff Fails: Invalid tool schema format "uri"

Status: Fixed (implemented)

Summary

- Handoff to the Inventory agent fails when its tools are registered because the JSON Schema produced for certain Zod fields uses `format: "uri"`, which the Agents SDK/OpenAI validator rejects for tool schemas.

Impact

- Admin AI chat shows: `400 Invalid schema for function 'create_book': In context=('properties', 'cover_image'), 'uri' is not a valid format.`
- Inventory tools cannot be used; the run aborts at or immediately after handoff.

Evidence (logs and code)

- Route logs (Admin AI orchestrator): `src/app/api/admin/ai-chat/stream/orchestrated/route.ts:88` previously emitted `[AdminAI route] orchestrator_error { message: "400 Invalid schema for function 'create_book': In context=('properties', 'cover_image'), 'uri' is not a valid format." }`.
- Cause was that several tool parameters used `z.string().url()`, which compiled to JSON Schema with `format: "uri"`.
  These parameters have been updated to use an Agents‑safe schema. See “Affected parameters updated”.

Diagnosis

- Two-layer check performed:
  1. Tool definitions (Inventory/Vision): `src/lib/admin/agents/tools.ts` — Zod schemas use `.url()`, which encodes to JSON Schema with `format: "uri"`.
  2. Orchestrator and agent wiring: `src/lib/admin/chat/orchestrator-agentkit.ts` and `src/lib/admin/agents/*.ts` — agents and tools are registered through `@openai/agents` and streamed via `Runner`. On handoff to Inventory, the tool schema is validated upstream; the validator rejects `format: "uri"`.
- The manual API route `src/app/api/admin/manual/books/route.ts:55` also uses `.url()`, but that route is server-only and not part of tool schemas sent to the model — it is safe and unrelated to this error.

Root Cause

- `z.string().url()` in tool parameter definitions results in a JSON Schema with `format: "uri"`. The Agents validator currently rejects `format: "uri"` for tool schemas, producing the 400 error shown.

Proposed Fix (implemented)

- Avoid emitting `format: "uri"` in tool schemas by centralizing an Agents-safe URL schema and reusing it instead of `.url()`.
  - Helper: `src/lib/schema/http-url.ts` → `export const HttpUrl = z.string().regex(/^https?:\/\/\S+$/i, 'Must be an http(s) URL')`
  - Replace `.url()` with `HttpUrl` (preserve `.nullable()` where present).

Patch outline (surgical changes)

- Add helper: `src/lib/schema/http-url.ts` (Agents-safe http(s) URL schema)
- In `src/lib/admin/agents/tools.ts` import and use `HttpUrl` in tool parameter schemas.

Affected parameters updated

- `analyze_book_cover.parameters.image_url`
- `check_duplicates.parameters.cover_image`
- `analyze_item_photo.parameters.image_url`
- `create_book.parameters.cover_image`
- `update_book.parameters.cover_image`

Why this change

- Retains validation strength for http(s) URLs without generating a JSON Schema `format` key that the current validator rejects.
- Limits change surface to agent tool schemas; no impact on unrelated API routes or DB types.
- Centralizes schema so future validator changes require editing only one file.

Alternatives considered

- Keep `.url()` and modify the Agents SDK validator to accept `format: "uri"`: out of scope for this repo.
- Remove validation entirely: reduces safety and drift from server-side expectations.
- Switch API mode (`responses` vs `chat_completions`): both modes rely on JSON Schema for tools; does not address the root cause.

Verification plan

1. Confirm the helper exists and is imported by tools.
2. Restart dev server (`npm run dev`) and go to `/admin/ai-chat`.
3. Trigger a handoff to Inventory (e.g., ask to create/update a book). Expected:
   - No `orchestrator_error` in server logs.
   - Normal tool flow resumes; `create_book` prompts for confirmation first (per guard in `inventoryTools`).

Notes and assumptions

- The error originates in the Agents tool schema validator, not in our business logic; changing our Zod definitions is the least invasive resolution.
- DB-layer and manual admin API URL validations remain unchanged and are not impacted by this fix.

Follow-up

- Re-run the Admin AI flow to confirm no schema errors and monitor logs. Consider adding a minimal tool-registration smoke test later.
