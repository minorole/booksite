"use client";

import { Loader2 } from "lucide-react";

export function LoadingIndicator({ label }: { label: string | null }) {
  if (!label) return null
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  )
}

