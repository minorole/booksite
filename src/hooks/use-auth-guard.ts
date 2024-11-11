import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuthGuard(requireAdmin = false) {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/signin')
      } else if (requireAdmin && !isAdmin) {
        router.push('/')
      }
    }
  }, [user, loading, isAdmin, requireAdmin, router])

  return { user, loading, isAdmin }
} 