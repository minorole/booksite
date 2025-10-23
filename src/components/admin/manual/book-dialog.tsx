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
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast"
import { CategoryType, CATEGORY_TYPES } from '@/lib/db/enums'
import { CATEGORY_LABELS } from '@/lib/admin/constants'
import { Bilingual } from "@/components/common/bilingual"
import { useLocale } from "@/contexts/LocaleContext"
// Align dialog props with Supabase-based API shapes
type Category = {
  id: string
  type: CategoryType
  name_zh: string
  name_en: string
  description_zh: string | null
  description_en: string | null
}
type Book = {
  id: string
  title_zh: string
  title_en: string | null
  description_zh: string
  description_en: string | null
  cover_image: string | null
  quantity: number
  search_tags: string[]
  category: Category
}

// Category labels centralized in '@/lib/admin/constants'

const formSchema = z.object({
  title_zh: z.string().optional(),
  title_en: z.string().optional(),
  description_zh: z.string().optional(),
  description_en: z.string().optional(),
  category_type: z.enum(CATEGORY_TYPES),
  quantity: z.number().min(0),
  tags: z.string(),
})

type BookWithCategory = Book

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
  const { locale } = useLocale()
  
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
            : (book as Record<string, unknown>)[key]

        if (value !== originalValue) {
          if (key === 'tags' && typeof value === 'string') {
            acc[key] = value.split(",").map((tag: string) => tag.trim()).filter(Boolean)
          } else {
            acc[key] = value
          }
        }
        return acc
      }, {} as Record<string, unknown>)

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
        title: <Bilingual cnText="成功" enText="Success" />,
        description: <Bilingual cnText="书籍更新成功" enText="Book updated successfully" />
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: <Bilingual cnText="错误" enText="Error" />,
        description: <Bilingual cnText="更新书籍失败" enText="Failed to update book" />
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            <Bilingual cnText="编辑书籍" enText="Edit Book" />
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          <Bilingual cnText="更新书籍的标题、分类、数量和标签。" enText="Update the book's title, category, quantity, and tags." />
        </DialogDescription>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title_zh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Bilingual cnText="中文标题" enText="Chinese Title" />
                  </FormLabel>
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
                  <FormLabel>
                    <Bilingual cnText="英文标题" enText="English Title" />
                  </FormLabel>
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
                  <FormLabel>
                    <Bilingual cnText="分类" enText="Category" />
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={locale === 'zh' ? '选择分类' : 'Select a category'} />
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
                  <FormLabel>
                    <Bilingual cnText="数量" enText="Quantity" />
                  </FormLabel>
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
                  <FormLabel>
                    <Bilingual cnText="标签（用逗号分隔）" enText="Tags (comma separated)" />
                  </FormLabel>
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
                <Bilingual cnText="取消" enText="Cancel" />
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Bilingual cnText="保存中…" enText="Saving..." />
                ) : (
                  <Bilingual cnText="保存" enText="Save" />
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 
