// Centralized field constraints for Admin AI agents
// Single source of truth for which fields are allowed vs. examples of unsupported ones.

export const ALLOWED_BOOK_FIELDS = [
  'title_zh',
  'title_en',
  'description_zh',
  'description_en',
  'category_type',
  'quantity',
  'tags',
  'cover_image',
  'author_zh',
  'author_en',
  'publisher_zh',
  'publisher_en',
] as const;

export const UNSUPPORTED_FIELD_EXAMPLES = [
  'price/定价',
  'ISBN',
  'publication year/出版年份',
  'condition/保存状态',
  'shelf location/货架位置',
  'barcode/条码',
] as const;
