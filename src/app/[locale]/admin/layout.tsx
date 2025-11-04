import { AdminNavbar } from '@/components/admin/admin-navbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AdminNavbar />
      <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
