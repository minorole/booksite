import { AdminNavbar } from "@/components/admin/admin-navbar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AdminNavbar />
      <main className="flex-1 container mx-auto py-8 px-4">
        {children}
      </main>
    </div>
  )
}
