"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type AuthContextType = {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    isSuperAdmin: false,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Authoritative role from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        const role = profile?.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN' | undefined
        const isSuperAdmin = role === 'SUPER_ADMIN'
        const isAdmin = role === 'ADMIN' || isSuperAdmin
        setAuthState({
          user: session.user,
          isAdmin,
          isSuperAdmin,
          loading: false,
        })
      } else {
        setAuthState(prev => ({ ...prev, loading: false }))
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            isAdmin: false,
            isSuperAdmin: false,
            loading: false,
          });
          router.refresh();
          return;
        }

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          const role = profile?.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN' | undefined
          const isSuperAdmin = role === 'SUPER_ADMIN'
          const isAdmin = role === 'ADMIN' || isSuperAdmin
          setAuthState({
            user: session.user,
            isAdmin,
            isSuperAdmin,
            loading: false,
          })
          router.refresh();
        } else {
          setAuthState({
            user: null,
            isAdmin: false,
            isSuperAdmin: false,
            loading: false,
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
