'use client';

import { Bilingual } from '@/components/common/bilingual';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';

type BookItem = {
  id: string;
  title_en?: string | null;
  title_zh?: string | null;
  quantity?: number;
  tags?: string[];
};

export function SearchResultsList({ data }: { data: { search?: { books: BookItem[] } } | null }) {
  const router = useRouter();
  const { locale } = useLocale();
  const books = data?.search?.books || [];
  if (!books.length)
    return (
      <p className="text-muted-foreground text-sm">
        <Bilingual cnText="无结果。" enText="No results." />
      </p>
    );
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">
        <Bilingual cnText="搜索结果" enText="Search results" />
      </h3>
      <ul className="space-y-2">
        {books.slice(0, 10).map((b) => (
          <li key={b.id} className="bg-background rounded-xl border p-2 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium">{b.title_en || b.title_zh || 'Untitled'}</div>
                <div className="text-muted-foreground mt-1 flex gap-2 text-xs">
                  {b.quantity !== undefined && (
                    <span>
                      <Bilingual cnText="数量" enText="Qty" />: {b.quantity}
                    </span>
                  )}
                  {Array.isArray(b.tags) && b.tags.length > 0 && (
                    <span>
                      <Bilingual cnText="标签" enText="Tags" />: {b.tags.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    router.push(`/${locale}/admin/manual?bookId=${b.id}`);
                  }}
                >
                  <Bilingual cnText="打开编辑器" enText="Open in editor" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
