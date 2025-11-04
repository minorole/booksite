import { createRouteSupabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export async function getAuthUser(): Promise<User | null> {
  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export class UnauthorizedError extends Error {
  status: number;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
  }
}

export async function assertUser(): Promise<User> {
  const user = await getAuthUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

export async function assertAdmin(): Promise<User> {
  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  // Authoritative DB check
  const { data: isAdminFlag, error } = await supabase.rpc('is_admin');
  if (error || !isAdminFlag) throw new UnauthorizedError();
  return user;
}
