"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Edit2, Trash2 } from "lucide-react"
import { BookDialog } from "./book-dialog"
import { listBooksApi, deleteBookApi, type Book as BookType } from '@/lib/admin/client/books'
// Define the shape returned by the Supabase-based API
type Category = {
  id: string
  type: import('@/lib/db/enums').CategoryType
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
import Image from "next/image"
import ImagePreviewDialog from "@/components/ui/image-preview-dialog"
import { CATEGORY_LABELS } from '@/lib/admin/constants'
import { useSearchParams } from 'next/navigation'
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Bilingual } from "@/components/common/bilingual"
import { useLocale } from "@/contexts/LocaleContext"

type BookWithCategory = BookType

// Category labels centralized in '@/lib/admin/constants'

export function BookList() {
  const { locale } = useLocale()
  const [books, setBooks] = useState<BookWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookWithCategory | null>(null)
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const fetchBooks = useCallback(async () => {
    try {
      const data = await listBooksApi()
      setBooks(data)
    } catch (error) {
      toast({
        variant: "destructive",
        title: <Bilingual cnText="错误" enText="Error" />,
        description: <Bilingual cnText="获取书籍失败" enText="Failed to fetch books" />
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  // Auto-open editor when deep-linked with ?bookId=...
  useEffect(() => {
    const id = searchParams.get('bookId')
    if (!id || books.length === 0) return
    const found = books.find((b) => b.id === id)
    if (found) {
      setSelectedBook(found)
      setDialogOpen(true)
    }
  }, [searchParams, books])

  const handleDelete = async (bookId: string) => {
    if (!confirm(locale === 'zh' ? '确定要删除此书吗？' : 'Are you sure you want to delete this book?')) return

    try {
      await deleteBookApi(bookId)
      
      toast({
        title: <Bilingual cnText="成功" enText="Success" />,
        description: <Bilingual cnText="书籍已删除" enText="Book deleted successfully" />
      })
      
      fetchBooks()
    } catch (error) {
      toast({
        variant: "destructive",
        title: <Bilingual cnText="错误" enText="Error" />,
        description: <Bilingual cnText="删除书籍失败" enText="Failed to delete book" />
      })
    }
  }

  const handleEdit = (book: BookWithCategory) => {
    setSelectedBook(book)
    setDialogOpen(true)
  }

  const filteredBooks = books.filter(book => {
    const matchesSearch = 
      book.title_zh?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.title_en?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === "ALL" || book.category.type === categoryFilter

    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-muted-foreground">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          <Bilingual cnText="书籍管理" enText="Book Management" />
        </h1>
      </div>

      <div className="flex gap-4 mb-4">
        <Input
          placeholder={locale === 'zh' ? '搜索书籍…' : 'Search books...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={categoryFilter}
          onValueChange={setCategoryFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={locale === 'zh' ? '所有分类' : 'All Categories'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">
              <Bilingual cnText="所有分类" enText="All Categories" />
            </SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]"><Bilingual cnText="封面" enText="Cover" /></TableHead>
              <TableHead><Bilingual cnText="中文标题" enText="Chinese Title" /></TableHead>
              <TableHead><Bilingual cnText="英文标题" enText="English Title" /></TableHead>
              <TableHead><Bilingual cnText="分类" enText="Category" /></TableHead>
              <TableHead><Bilingual cnText="数量" enText="Quantity" /></TableHead>
              <TableHead><Bilingual cnText="标签" enText="Tags" /></TableHead>
              <TableHead className="w-[100px]"><Bilingual cnText="操作" enText="Actions" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell>
                  {book.cover_image ? (
                    <ImagePreviewDialog
                      src={book.cover_image}
                      alt={book.title_zh || book.title_en || 'Book cover'}
                      contentClassName="max-w-3xl"
                      containerClassName="relative w-full h-[80vh]"
                      imageClassName="object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized
                    >
                      <div className="cursor-pointer hover:opacity-80 transition-opacity">
                        <Image
                          src={book.cover_image}
                          alt={book.title_zh || book.title_en || 'Book cover'}
                          width={50}
                          height={70}
                          className="object-cover rounded-sm"
                          unoptimized
                        />
                      </div>
                    </ImagePreviewDialog>
                  ) : (
                    <div className="w-[50px] h-[70px] bg-muted flex items-center justify-center rounded-sm">
                      <span className="text-xs text-muted-foreground">
                        <Bilingual cnText="无图片" enText="No image" />
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell>{book.title_zh}</TableCell>
                <TableCell>{book.title_en}</TableCell>
                <TableCell>{CATEGORY_LABELS[book.category.type]}</TableCell>
                <TableCell>{book.quantity}</TableCell>
                <TableCell>{book.search_tags.join(", ")}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(book)}
                      aria-label="Edit book"
                      title="Edit book"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(book.id)}
                      aria-label="Delete book"
                      title="Delete book"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedBook && (
        <BookDialog 
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          book={selectedBook}
          onSuccess={fetchBooks}
        />
      )}
    </div>
  )
} 
