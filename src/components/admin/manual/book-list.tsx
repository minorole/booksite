"use client"

import { useState, useEffect } from "react"
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
import { Edit2, Trash2, Plus } from "lucide-react"
import { BookDialog } from "./book-dialog"
import type { Book, Category } from "@prisma/client"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CategoryType } from '@prisma/client'

type BookWithCategory = Book & {
  category: Category
}

// Add the category display mapping
const CATEGORY_LABELS: Record<CategoryType, string> = {
  PURE_LAND_BOOKS: "净土佛书",
  OTHER_BOOKS: "其他佛书",
  DHARMA_ITEMS: "法宝",
  BUDDHA_STATUES: "佛像"
} as const

export function BookList() {
  const [books, setBooks] = useState<BookWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookWithCategory | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/admin/manual/books')
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setBooks(data.books)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch books"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (bookId: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return

    try {
      const response = await fetch(`/api/admin/manual/books/${bookId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      
      toast({
        title: "Success",
        description: "Book deleted successfully"
      })
      
      fetchBooks()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete book"
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Book Management</h1>
      </div>

      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search books..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={categoryFilter}
          onValueChange={setCategoryFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
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
              <TableHead className="w-[100px]">Cover</TableHead>
              <TableHead>Chinese Title</TableHead>
              <TableHead>English Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell>
                  {book.cover_image ? (
                    <Dialog>
                      <DialogTrigger asChild>
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
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <div className="relative w-full h-[80vh]">
                          <Image
                            src={book.cover_image}
                            alt={book.title_zh || book.title_en || 'Book cover'}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            unoptimized
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div className="w-[50px] h-[70px] bg-muted flex items-center justify-center rounded-sm">
                      <span className="text-xs text-muted-foreground">No image</span>
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
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(book.id)}
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