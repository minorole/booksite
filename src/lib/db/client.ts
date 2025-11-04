import { createServerSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase.generated';

// Returns a server-side Supabase client typed with our Database
export async function getServerDb() {
  return createServerSupabaseClient() as Promise<
    import('@supabase/supabase-js').SupabaseClient<Database>
  >;
}
