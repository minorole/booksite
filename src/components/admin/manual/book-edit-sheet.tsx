"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CategoryType } from "@prisma/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { BookData } from "@/types/admin/chat"
import { CATEGORY_NAMES } from "@/lib/admin/constants/categories"

interface BookEditSheetProps {
  book: BookData | null
  isOpen: boolean
  onClose: () => void
  onSave: (book: BookData) => Promise<void>
}

export function BookEditSheet({ book, isOpen, onClose, onSave }: BookEditSheetProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState<BookData | null>(book)

  // Reset form when book changes
  if (book?.id !== formData?.id) {
    setFormData(book)
  }

  if (!formData) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate that at least one title exists
      if (!formData.title_zh && !formData.title_en) {
        throw new Error('At least one title (English or Chinese) is required');
      }

      // Validate category
      if (!formData.category?.type) {
        throw new Error('Category is required');
      }

      await onSave(formData)
      toast({
        title: "Success",
        description: "Book updated successfully",
      })
      onClose()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update book",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Book</SheetTitle>
          <SheetDescription>
            Make changes to the book listing. At least one title and category is required.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title_en">English Title</Label>
                <Input
                  id="title_en"
                  value={formData.title_en || ''}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title_zh">Chinese Title</Label>
                <Input
                  id="title_zh"
                  value={formData.title_zh}
                  onChange={(e) => setFormData({ ...formData, title_zh: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description_en">English Description</Label>
              <Textarea
                id="description_en"
                value={formData.description_en || ''}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description_zh">Chinese Description</Label>
              <Textarea
                id="description_zh"
                value={formData.description_zh}
                onChange={(e) => setFormData({ ...formData, description_zh: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category.type}
                  onValueChange={(value: CategoryType) => 
                    setFormData({
                      ...formData,
                      category: {
                        ...formData.category,
                        type: value,
                        name_en: CATEGORY_NAMES[value].en,
                        name_zh: CATEGORY_NAMES[value].zh
                      }
                    })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_NAMES).map(([type, names]) => (
                      <SelectItem key={type} value={type}>
                        {names.en} / {names.zh}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search_tags">Search Tags (comma separated)</Label>
              <Input
                id="search_tags"
                value={formData.search_tags.join(", ")}
                onChange={(e) => setFormData({
                  ...formData,
                  search_tags: e.target.value.split(",").map(tag => tag.trim())
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auto_tags">Auto-generated Tags</Label>
              <Input
                id="auto_tags"
                value={formData.auto_tags.join(", ")}
                readOnly
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pending_tags">Pending Tags</Label>
              <Input
                id="pending_tags"
                value={formData.pending_tags.join(", ")}
                readOnly
                disabled
                className="bg-muted"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="discontinued"
                checked={formData.discontinued}
                onCheckedChange={(checked: boolean) => setFormData({
                  ...formData,
                  discontinued: checked,
                  discontinued_at: checked ? new Date() : null
                })}
              />
              <Label htmlFor="discontinued">Discontinued</Label>
            </div>

            {formData.discontinued && (
              <div className="space-y-2">
                <Label htmlFor="discontinued_reason">Discontinue Reason</Label>
                <Input
                  id="discontinued_reason"
                  value={formData.discontinued_reason || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    discontinued_reason: e.target.value
                  })}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
} 