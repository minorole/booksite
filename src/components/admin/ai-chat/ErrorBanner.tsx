'use client';

import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorBanner({ error, onClose }: { error: string | null; onClose: () => void }) {
  if (!error) return null;
  return (
    <div className="text-error bg-error/10 mb-4 flex items-center justify-between rounded-lg p-4">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4" />
        <span>{error}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-error/20">
        ×
      </Button>
    </div>
  );
}
