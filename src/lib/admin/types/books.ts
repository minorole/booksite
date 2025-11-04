import { type CategoryType } from '@/lib/db/enums';
import { type VisionAnalysisResult } from './vision';
import { type LanguagePreference } from './context';

// Book domain types
export interface BookBase {
  id?: string;
  title_zh: string;
  title_en?: string | null;
  description_zh: string;
  description_en?: string | null;
  category_type: CategoryType;
  quantity: number;
  tags: string[];
  cover_image: string | null;
  analysis_result?: VisionAnalysisResult;
  similarity_group?: string;
}

export interface BookCreate extends BookBase {
  content_summary_zh?: string;
  content_summary_en?: string;
  author_zh?: string;
  author_en?: string;
  publisher_zh?: string;
  publisher_en?: string;
}

export interface BookUpdate extends Partial<BookBase> {
  book_id: string;
  author_zh?: string | null;
  author_en?: string | null;
  publisher_zh?: string | null;
  publisher_en?: string | null;
}

export interface BookSearch {
  title?: string;
  tags?: string[];
  category_type?: CategoryType;
  min_quantity?: number;
  max_quantity?: number;
  similarity_threshold?: number;
  language_preference?: LanguagePreference;
}
