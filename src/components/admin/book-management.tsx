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

interface Book {
  id: string;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  cover_image: string | null;
  quantity: number;
  category?: {
    name_en: string;
    name_zh: string;
  };
  search_tags: string[];
  created_at: string;
}

export function BookManagement() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/admin/books');
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setBooks(data.books);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter(book => 
    book.title_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.title_zh?.includes(searchTerm) ||
    book.search_tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            {filteredBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell>
                  {book.cover_image ? (
                    <div className="relative w-16 h-20">
                      <Image
                        src={book.cover_image}
                        alt={book.title_en || book.title_zh}
                        fill
                        className="object-cover rounded"
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
                      onClick={() => {/* TODO: Implement edit */}}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {/* TODO: Implement delete */}}
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
    </Card>
  );
} 