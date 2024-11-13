import { AdminNavbar } from "@/components/admin/admin-navbar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <AdminNavbar />
      <main className="flex-1 container mx-auto py-8">
        {children}
      </main>
    </div>
  )
} 