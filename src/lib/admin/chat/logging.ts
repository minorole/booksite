export type RawModelLogState = { argBytes: Map<string, number>; seen: Set<string>; toolNames: Map<string, string> }

export function logRawModelEventCompact(evt: unknown, reqId?: string, state?: RawModelLogState) {
  const req = (reqId as any)?.slice?.(0, 8)
  try {
    const data = (evt as any)?.data
    if (data?.type === 'response_started' || data?.type === 'response_done') {
      const rid = data?.response?.id || data?.providerData?.response?.id || ''
      const key = `${data.type}:${rid}`
      if (state?.seen?.has(key)) return
      state?.seen?.add(key)
      console.log(`[AdminAI orchestrator] model_${data.type}`, { req, id: rid })
      return
    }

    if (data?.type === 'model') {
      const ev = data.event || {}
      const t = ev?.type

      if (t === 'response.function_call_arguments.delta') {
        const itemId = ev?.item_id || ''
        const d = ev?.delta ?? ''
        const addLen = typeof d === 'string' ? d.length : JSON.stringify(d).length
        const prev = state?.argBytes?.get(itemId) ?? 0
        state?.argBytes?.set(itemId, prev + addLen)
        return
      }

      if (t === 'response.function_call_arguments.done') {
        const itemId = ev?.item_id || ''
        const total = state?.argBytes?.get(itemId) ?? 0
        state?.argBytes?.delete(itemId)
        const toolName = state?.toolNames?.get(itemId)
        console.log('[AdminAI orchestrator] function_args_collected', {
          req,
          item_id: itemId,
          name: toolName,
          bytes: total,
          output_index: ev?.output_index,
        })
        return
      }

      if (t === 'response.output_item.added' || t === 'response.output_item.done') {
        const key = `oi:${t}:${ev?.output_index}:${ev?.sequence_number ?? ''}`
        if (!state?.seen?.has(key)) {
          state?.seen?.add(key)
          try {
            const item = (ev as any)?.item
            const itemId = item?.id || item?.callId || item?.tool_call_id
            const name = item?.name || item?.tool?.name
            if (itemId && name && state?.toolNames) state.toolNames.set(String(itemId), String(name))
          } catch {}
          console.log(`[AdminAI orchestrator] model_${t}`, {
            req,
            output_index: ev?.output_index,
            seq: ev?.sequence_number,
          })
        }
        return
      }

      if (t === 'response.created' || t === 'response.in_progress' || t === 'response.completed') {
        const rid = ev?.response?.id || ''
        const key = `${t}:${rid}`
        if (state?.seen?.has(key)) return
        state?.seen?.add(key)
        console.log(`[AdminAI orchestrator] model_${t}`, { req, id: rid })
        return
      }
    }

    const t = data?.type ?? (evt as any)?.type ?? '(unknown)'
    console.log('[AdminAI orchestrator] event', { req, type: t })
  } catch {
    try {
      console.log('[AdminAI orchestrator] event', { req: (reqId as any)?.slice?.(0, 8), type: (evt as any)?.type ?? '(unknown)' })
    } catch {}
  }
}

