import { BookManagement } from "@/components/admin/manual/book-management"

export default function BooksPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Book Listings</h1>
      <BookManagement />
    </div>
  )
} 