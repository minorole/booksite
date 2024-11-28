"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { CategoryType } from '@prisma/client'
import type { Book, Category } from "@prisma/client"

const CATEGORY_LABELS: Record<CategoryType, string> = {
  PURE_LAND_BOOKS: "净土佛书",
  OTHER_BOOKS: "其他佛书",
  DHARMA_ITEMS: "法宝",
  BUDDHA_STATUES: "佛像"
} as const

const formSchema = z.object({
  title_zh: z.string().optional(),
  title_en: z.string().optional(),
  description_zh: z.string().optional(),
  description_en: z.string().optional(),
  category_type: z.nativeEnum(CategoryType),
  quantity: z.number().min(0),
  tags: z.string(),
})

type BookWithCategory = Book & {
  category: Category
}

interface BookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: BookWithCategory
  onSuccess: () => void
}

export function BookDialog({ 
  open, 
  onOpenChange, 
  book, 
  onSuccess 
}: BookDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title_zh: book.title_zh || "",
      title_en: book.title_en || "",
      description_zh: book.description_zh || "",
      description_en: book.description_en || "",
      category_type: book.category.type,
      quantity: book.quantity,
      tags: book.search_tags.join(", "),
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true)
    try {
      // Only send changed fields
      const changedFields = Object.entries(values).reduce((acc, [key, value]) => {
        const originalValue = key === 'tags' 
          ? book.search_tags.join(", ")
          : key === 'category_type'
            ? book.category.type
            : (book as any)[key]

        if (value !== originalValue) {
          if (key === 'tags' && typeof value === 'string') {
            acc[key] = value.split(",").map((tag: string) => tag.trim()).filter(Boolean)
          } else {
            acc[key] = value
          }
        }
        return acc
      }, {} as Record<string, any>)

      if (Object.keys(changedFields).length === 0) {
        onOpenChange(false)
        return
      }

      const response = await fetch(`/api/admin/manual/books/${book.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changedFields),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      toast({
        title: "Success",
        description: "Book updated successfully"
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update book"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Book</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title_zh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chinese Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>English Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma separated)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 