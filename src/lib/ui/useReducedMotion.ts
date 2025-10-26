"use client"

import { useEffect, useRef } from "react"

// Returns a ref<boolean> that mirrors prefers-reduced-motion.
// Using a ref avoids re-renders while still being readable inside rAF loops.
export function useReducedMotionRef() {
  const ref = useRef(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const update = () => { ref.current = !!m?.matches }
    update()
    m?.addEventListener?.('change', update)
    return () => m?.removeEventListener?.('change', update)
  }, [])
  return ref
}

export default useReducedMotionRef

