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
import { Book } from "@/types/book"

interface BookEditSheetProps {
  book: Book | null
  isOpen: boolean
  onClose: () => void
  onSave: (book: Book) => Promise<void>
}

export function BookEditSheet({ book, isOpen, onClose, onSave }: BookEditSheetProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState<Book | null>(book)

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
      if (!formData.title_en && !formData.title_zh) {
        throw new Error('At least one title (English or Chinese) is required');
      }

      // Validate category
      if (!formData.category?.type) {
        throw new Error('Category is required');
      }

      // Send the category type instead of trying to send the whole category object
      const dataToSend = {
        ...formData,
        category_type: formData.category.type
      };

      await onSave(dataToSend)
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
                  value={formData.title_en}
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
                value={formData.description_en}
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
                        type: value
                      }
                    })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURE_LAND_BOOKS">Pure Land Books</SelectItem>
                    <SelectItem value="OTHER_BOOKS">Other Books</SelectItem>
                    <SelectItem value="DHARMA_ITEMS">Dharma Items</SelectItem>
                    <SelectItem value="BUDDHA_STATUES">Buddha Statues</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Search Tags (comma separated)</Label>
              <Input
                id="tags"
                value={formData.search_tags.join(", ")}
                onChange={(e) => setFormData({
                  ...formData,
                  search_tags: e.target.value.split(",").map(tag => tag.trim())
                })}
              />
            </div>
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