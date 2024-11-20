"use client"

import { createClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAdmin: false,
    isSuperAdmin: false,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const isAdmin = session.user.user_metadata?.role === 'ADMIN';
        const isSuperAdmin = session.user.user_metadata?.role === 'SUPER_ADMIN';
        setAuthState({
          user: session.user,
          isAdmin,
          isSuperAdmin,
          loading: false,
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const isAdmin = session.user.user_metadata?.role === 'ADMIN';
          const isSuperAdmin = session.user.user_metadata?.role === 'SUPER_ADMIN';
          setAuthState({
            user: session.user,
            isAdmin,
            isSuperAdmin,
            loading: false,
          });
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
  }, []);

  return authState;
} 