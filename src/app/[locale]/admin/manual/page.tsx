"use client"

import { useEffect } from "react"
import { BookList } from "@/components/admin/manual/book-list"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useLocale } from "@/contexts/LocaleContext"

export default function ManualManagementPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { locale } = useLocale()

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/auth/signin`)
    }
  }, [loading, user, router, locale])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return null

  return <BookList />
} 
