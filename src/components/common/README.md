# Bilingual Component

A tiny helper for consistent Chinese-on-top, English-at-bottom labels across the site.

- Location: `src/components/common/bilingual.tsx`
- Default layout: vertical stack (CN primary, EN secondary muted/smaller)

## Usage

- Basic

```
import { Bilingual } from "@/components/common/bilingual"

<Bilingual cnText="首页" enText="Home" />
```

- Centered alignment

```
<Bilingual align="center" cnText="请查收邮箱" enText="Check your email" />
```

- Inline in buttons or links

```
<button>
  <Bilingual as="span" cnText="使用邮箱" enText="With Email" />
</button>
```

- Custom styles

```
<Bilingual
  cnText={<span className="font-bold">管理后台</span>}
  enText={<span className="font-bold">Admin Panel</span>}
  enClassName="text-white/70"
/>
```

## Props

- `cnText`: ReactNode — Chinese line
- `enText`: ReactNode — English line
- `as`: `'span' | 'div'` — wrapper element, default `'span'`
- `align`: `'left' | 'center' | 'right'` — text alignment, default `'left'`
- `tight`: boolean — apply tighter leading, default `true`
- `className`: string — class for wrapper
- `cnClassName`: string — class for Chinese line
- `enClassName`: string — class for English line (defaults include `text-xs text-muted-foreground -mt-0.5`)

## Design Notes

- English line is muted by default and uses the same font size as the Chinese line. If you prefer a smaller English line in a specific spot, pass `enClassName="text-xs"` (or any size class).
