"use client"

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Edit, Trash2 } from "lucide-react";
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { BookEditSheet } from "./book-edit-sheet"
import { Book } from "@/types/book"

export function BookManagement() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      console.log('Fetching books...');
      const response = await fetch('/api/admin/books');
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }
      const data = await response.json();
      console.log('Fetched books:', data);
      if (data.error) throw new Error(data.error);
      setBooks(data.books);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch books"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter(book => 
    book.title_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.title_zh?.includes(searchTerm) ||
    book.search_tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (bookId: string) => {
    try {
      const response = await fetch(`/api/admin/books/${bookId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete book');
      }

      // Remove book from local state
      setBooks(books.filter(book => book.id !== bookId));
      
      toast({
        title: "Success",
        description: "Book deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting book:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete book"
      });
    } finally {
      setDeleteBookId(null);
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
  };

  const handleSave = async (updatedBook: Book) => {
    try {
      const response = await fetch(`/api/admin/books/${updatedBook.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedBook),
      });

      if (!response.ok) {
        throw new Error('Failed to update book');
      }

      // Update local state
      setBooks(books.map(book => 
        book.id === updatedBook.id ? updatedBook : book
      ));
      
      toast({
        title: "Success",
        description: "Book updated successfully"
      });
    } catch (error) {
      console.error('Error updating book:', error);
      throw error;
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cover</TableHead>
              <TableHead>Title (EN)</TableHead>
              <TableHead>Title (ZH)</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No books found
                </TableCell>
              </TableRow>
            ) : (
              filteredBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>
                    {book.cover_image ? (
                      <div className="relative w-16 h-20">
                        <Image
                          src={book.cover_image}
                          alt={book.title_en || book.title_zh || 'Book cover'}
                          fill
                          className="object-cover rounded"
                          sizes="(max-width: 64px) 100vw, 64px"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-20 bg-muted rounded flex items-center justify-center">
                        No Image
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{book.title_en}</TableCell>
                  <TableCell>{book.title_zh}</TableCell>
                  <TableCell>
                    {book.category ? (
                      <div>
                        <div>{book.category.name_en}</div>
                        <div className="text-sm text-muted-foreground">
                          {book.category.name_zh}
                        </div>
                      </div>
                    ) : (
                      'Uncategorized'
                    )}
                  </TableCell>
                  <TableCell>{book.quantity}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {book.search_tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-muted rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(book)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteBookId(book.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteBookId} onOpenChange={() => setDeleteBookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the book from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBookId && handleDelete(deleteBookId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookEditSheet
        book={editingBook}
        isOpen={!!editingBook}
        onClose={() => setEditingBook(null)}
        onSave={handleSave}
      />
    </Card>
  );
} 