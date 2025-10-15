# ADR 0003: Fonts — English/Chinese usage, regressions, and performance

Status: Accepted
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
  - src/app/layout.tsx:33–34 now applies next/font classes to `<html>` instead of `<body>`, and keeps `<body class="font-sans antialiased">` for Tailwind utilities.
- Self‑host Ma Shan Zheng with unicode‑range (loads only when Han glyphs appear)
  - src/app/globals.css:141–151 defines `@font-face 'MaShanZhengZh'` (woff2, then ttf) with `font-display: swap` and CJK `unicode-range`.
  - public/fonts/ma-shan-zheng/MaShanZheng-Regular.woff2 (full coverage) and .ttf present.
- Harden Archivo and disable preload
  - src/app/layout.tsx:10–18 configures `Archivo({ display: 'swap', adjustFontFallback: false, fallback: [], preload: false })`.

Implementation updates (stability fixes)
- Ensure html resolves the font stack immediately
  - src/app/globals.css:31–33 add `--font-archivo: 'Archivo'` at `:root` so Tailwind’s default on `html { font-family: var(--default-font-family) }` resolves to Archivo even before variable classes load.
  - src/app/layout.tsx:33 moves `${archivo.className} ${archivo.variable}` to `<html>` so both the direct class and CSS variable apply at the root element.
- Keep Chinese on MaShanZheng where UI requested medium/semibold
  - src/app/globals.css:139–144 adds zh‑scoped normalization for common UI (links, buttons, nav, `.font-medium`, `.font-semibold`) to `font-weight: 400` and `font-synthesis-weight: none` because MaShanZheng ships only weight 400.

Verification
- `npm run lint && npm run build` passes.
- Expected behavior:
  - Latin → Archivo; Han → Ma Shan Zheng via per‑glyph fallback.
  - Chinese font loads only when CJK characters are present on a page (unicode‑range), avoiding extra payload on fully‑English pages.
  - No backup families are declared anywhere.

Consequences
- With `font-display: swap`, brief swaps may still occur on initial load, but html now resolves to Archivo immediately, eliminating system CJK takeover on first paint.
- The earlier scoping defect has been addressed: `--font-mashanzheng` is defined in `:root` and no longer limited to `.dark`.

Rollback
- Revert the removal of zh‑wide family overrides in src/app/globals.css and drop the self‑hosted Ma Shan Zheng block; restore Archivo preload if needed.

Follow‑ups
- Consider conditional preload by locale to reduce swap windows without warnings:
  - zh pages: preload MaShanZheng WOFF2
  - en pages: preload Archivo
- Optionally self‑host Archivo with unicode‑range for symmetry and fine‑grained preload/preconnect control.
- Optionally use the Font Loading API for critical headings to eliminate visible swaps on slow networks.

Audit (what changed in repo)
- src/app/layout.tsx:33 — `<html lang=… className={\`${archivo.className} ${archivo.variable}\`}>`
- src/app/layout.tsx:34 — `<body className=\"font-sans antialiased\">`
- src/app/globals.css:31 — added `--font-archivo: 'Archivo';`
- src/app/globals.css:139 — added zh‑scoped UI weight normalization rule.

Verification snapshot
- Built with `npm run lint && npm run build` — success.
- Manual check: DevTools shows Archivo for Latin; MaShanZhengZh for CJK on zh pages. MaShanZheng WOFF2 requested only when CJK present.
