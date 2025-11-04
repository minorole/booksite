'use client';
import type { DuplicateDetectionResult } from '@/lib/admin/types/results';
import { Button } from '@/components/ui/button';
import { Bilingual } from '@/components/common/bilingual';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import Image from 'next/image';

type BookItem = {
  id: string;
  title_en?: string | null;
  title_zh?: string | null;
  quantity?: number;
  tags?: string[];
  cover_image?: string | null;
};

export function DuplicateMatchesCard({
  data,
}: {
  data: { duplicate_detection?: DuplicateDetectionResult; search?: { books: BookItem[] } } | null;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const dd = data?.duplicate_detection;
  if (!dd)
    return (
      <p className="text-muted-foreground text-sm">
        <Bilingual cnText="未检测到重复。" enText="No duplicates detected." />
      </p>
    );
  const rec = dd.analysis?.recommendation;
  const matches = dd.matches || [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">
          <Bilingual cnText="可能的重复项" enText="Duplicate candidates" />
        </h3>
        {rec && (
          <span className="bg-accent/15 text-accent-foreground rounded px-2 py-0.5 text-xs">
            {rec}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {matches.slice(0, 6).map((m, i) => {
          const score = Math.round((m.similarity_score || 0) * 100);
          const book = (data?.search?.books || []).find((b) => b.id === m.book_id);
          return (
            <div key={i} className="bg-background rounded-xl border p-2 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="bg-muted flex h-16 w-12 items-center justify-center overflow-hidden rounded">
                  {book?.cover_image ? (
                    <Image
                      src={book.cover_image}
                      alt="Book cover"
                      width={48}
                      height={64}
                      className="h-16 w-12 object-cover"
                    />
                  ) : (
                    <div className="bg-muted h-full w-full" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Book #{m.book_id.slice(0, 8)}</div>
                    <div className="text-xs">{score}%</div>
                  </div>
                  <div className="bg-muted mt-1 h-1.5 rounded">
                    <div className="bg-accent h-1.5 rounded" style={{ width: `${score}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    router.push(`/${locale}/admin/manual?bookId=${m.book_id}`);
                  }}
                >
                  <Bilingual cnText="打开编辑器" enText="Open in editor" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
