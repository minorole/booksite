"use client";

import { useState } from 'react'
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoryType } from '@/lib/db/enums'

export function EditAnalysisDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial: {
    title_zh?: string
    title_en?: string | null
    author_zh?: string | null
    author_en?: string | null
    publisher_zh?: string | null
    publisher_en?: string | null
    category_type?: CategoryType
  }
  onClose: () => void
  onSave: (v: any) => void
}) {
  const [form, setForm] = useState(initial)
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg space-y-3">
        <h3 className="font-semibold">Edit Extracted Fields</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Title (ZH)</label>
            <Input value={form.title_zh || ''} onChange={(e) => setForm({ ...form, title_zh: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Title (EN)</label>
            <Input value={form.title_en || ''} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Author (ZH)</label>
            <Input value={form.author_zh || ''} onChange={(e) => setForm({ ...form, author_zh: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Author (EN)</label>
            <Input value={form.author_en || ''} onChange={(e) => setForm({ ...form, author_en: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Publisher (ZH)</label>
            <Input value={form.publisher_zh || ''} onChange={(e) => setForm({ ...form, publisher_zh: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Publisher (EN)</label>
            <Input value={form.publisher_en || ''} onChange={(e) => setForm({ ...form, publisher_en: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

