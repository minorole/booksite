'use client';

import { Check, Loader2, TriangleAlert } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { STEP_LABELS } from '@/lib/admin/i18n';

type Step = {
  id: string;
  name: string;
  status: 'running' | 'done' | 'error';
  summary?: string;
};

export function StepList({ steps }: { steps: Step[] }) {
  const { locale } = useLocale();
  if (!steps.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {steps.map((s) => {
        const labelMap = STEP_LABELS[locale === 'zh' ? 'zh' : 'en'];
        const label =
          labelMap[s.name as keyof typeof labelMap] ||
          (s.name.startsWith('handoff:') ? `Handoff to ${s.name.slice(8)}` : s.name);
        return (
          <div
            key={s.id}
            className="bg-muted inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
          >
            {s.status === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {s.status === 'done' && <Check className="text-success h-3.5 w-3.5" />}
            {s.status === 'error' && <TriangleAlert className="text-error h-3.5 w-3.5" />}
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export type { Step };
