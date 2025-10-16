"use client";

import React, { createContext, useContext, useMemo, useState } from 'react'
import type { SSEEvent } from '@/lib/admin/types/events'

export type PanelType = 'duplicates' | 'search' | 'book' | 'order' | null

type ResultState = {
  panel: PanelType
  requestId: string | null
  rawEvent: SSEEvent | null
  toolName: string | null
  payload: unknown | null
}

const initialState: ResultState = {
  panel: null,
  requestId: null,
  rawEvent: null,
  toolName: null,
  payload: null,
}

type ResultStore = ResultState & {
  setFromToolResult: (evt: SSEEvent) => void
  reset: () => void
}

const Ctx = createContext<ResultStore | null>(null)

export function ResultStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ResultState>(initialState)

  const api: ResultStore = useMemo(() => ({
    ...state,
    setFromToolResult: (evt: SSEEvent) => {
      if (evt.type !== 'tool_result') return
      const e = evt
      let panel: PanelType = null
      if (e.name === 'check_duplicates') panel = 'duplicates'
      else if (e.name === 'search_books') panel = 'search'
      else if (e.name === 'create_book' || e.name === 'update_book') panel = 'book'
      else if (e.name === 'update_order') panel = 'order'
      setState({
        panel,
        requestId: e.request_id ?? null,
        rawEvent: evt,
        toolName: e.name ?? null,
        payload: e.result ?? null,
      })
    },
    reset: () => setState(initialState),
  }), [state])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useResultsStore(): ResultStore {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useResultsStore must be used within ResultStoreProvider')
  return ctx
}
