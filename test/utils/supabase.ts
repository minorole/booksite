import { vi } from 'vitest'

type Control = {
  setResponse: (data: any[], error?: { message: string } | null) => void
}

export function installRouteSupabaseMock(): Control {
  const stateKey = '__supabaseRouteMockState__'
  ;(globalThis as any)[stateKey] = { data: [], error: null as { message: string } | null }

  vi.mock('@/lib/supabase', () => ({
    createRouteSupabaseClient: async () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => {
              const state = (globalThis as any)['__supabaseRouteMockState__']
              return { data: state.data, error: state.error }
            },
          }),
        }),
      }),
    }),
  }))

  return {
    setResponse(data: any[], error: { message: string } | null = null) {
      ;(globalThis as any)['__supabaseRouteMockState__'] = { data, error }
    },
  }
}
