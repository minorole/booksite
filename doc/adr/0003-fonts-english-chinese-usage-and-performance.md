# ADR 0003: Fonts — English/Chinese usage, regressions, and performance

Status: Proposed
Date: 2025-10-15

Context
We must use exactly two fonts: Archivo for Latin (English) and Ma Shan Zheng for Han (Chinese). No other families are permitted. We also want a resilient experience on slow networks.

Two user-visible issues were observed:
- On zh pages, Chinese applied to all text (including Latin).
- After adjustments, both English and Chinese sometimes look like system fallback fonts.

Decision
Maintain an English‑first stack and rely on per‑glyph fallback to Chinese. Self‑host Ma Shan Zheng (WOFF2+TTF) with unicode‑range so it downloads only on pages containing Han glyphs. Disable Archivo preload globally to avoid “unused preload” warnings on zh pages. Do not add any backup families.

Changes
- Remove zh‑wide forced Chinese family ordering
  - src/app/globals.css:129–133 removed rules that forced Chinese-first when `<html lang="zh">`.
- Keep a single English‑first stack with exactly two families
  - src/app/globals.css:100–102 define `--font-sans` and `--font-serif` as `var(--font-archivo), var(--font-mashanzheng)`.
  - src/app/layout.tsx:34 uses `font-sans` on `<body>` with only the Archivo variable injected.
- Self‑host Ma Shan Zheng with unicode‑range (loads only when Han glyphs appear)
  - src/app/globals.css:141–151 defines `@font-face 'MaShanZhengZh'` (woff2, then ttf) with `font-display: swap` and CJK `unicode-range`.
  - public/fonts/ma-shan-zheng/MaShanZheng-Regular.woff2 (full coverage) and .ttf present.
- Harden Archivo and disable preload
  - src/app/layout.tsx:10–18 configures `Archivo({ display: 'swap', adjustFontFallback: false, fallback: [], preload: false })`.

Verification
- `npm run lint && npm run build` passes.
- Expected behavior:
  - Latin → Archivo; Han → Ma Shan Zheng via per‑glyph fallback.
  - Chinese font loads only when CJK characters are present on a page (unicode‑range), avoiding extra payload on fully‑English pages.
  - No backup families are declared anywhere.

Consequences
- With `font-display: swap`, on slow networks a brief swap from system default to Archivo (for Latin) or to Ma Shan Zheng (for Han) can occur. This can look like a “fallback font” momentarily even though no backups are declared.
- A scoping defect currently causes incorrect rendering in light mode:
  - src/app/globals.css:57 sets `--font-mashanzheng: "MaShanZhengZh"` inside the `.dark { … }` block, not in `:root`. In light mode the Chinese family variable is undefined, so Han glyphs fall back to a system font. This must be moved to `:root` in a follow‑up.

Rollback
- Revert the removal of zh‑wide family overrides in src/app/globals.css and drop the self‑hosted Ma Shan Zheng block; restore Archivo preload if needed.

Follow‑ups
- Fix variable scope: move `--font-mashanzheng: "MaShanZhengZh"` from `.dark` to `:root` (see src/app/globals.css:57 for current location).
- Consider conditional preload by locale to reduce swap windows without warnings:
  - zh pages: preload MaShanZheng WOFF2
  - en pages: preload Archivo
- Optionally self‑host Archivo with unicode‑range for symmetry and fine‑grained preload/preconnect control.
- Optionally use the Font Loading API for critical headings to eliminate visible swaps on slow networks.

