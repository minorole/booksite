'use client';

import { Loader2 } from 'lucide-react';

export function LoadingIndicator({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <div className="text-muted-foreground flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
