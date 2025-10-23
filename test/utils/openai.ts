import { vi } from 'vitest'

type Controls = {
  setVisionJSON: (payload: any) => void
  setChatContent: (content: any) => void
  setReject: (error: unknown) => void
}

// Opt-in OpenAI mock. Use inside a test file that needs it.
// Does not run globally; other tests remain unaffected.
export function installOpenAIMock(): Controls {
  const state = { visionContent: null as string | null, chatContent: null as any, reject: null as any }

  vi.mock('@/lib/openai', () => ({
    createVisionChatCompletion: vi.fn(async () => {
      if (state.reject) throw state.reject
      return { choices: [{ message: { content: state.visionContent } }] } as any
    }),
    createChatCompletion: vi.fn(async () => {
      if (state.reject) throw state.reject
      return { choices: [{ message: { content: state.chatContent } }] } as any
    }),
  }))

  return {
    setVisionJSON(payload: any) {
      state.visionContent = JSON.stringify(payload)
      state.reject = null
    },
    setChatContent(content: any) {
      state.chatContent = content
      state.reject = null
    },
    setReject(error: unknown) {
      state.reject = error
    },
  }
}

