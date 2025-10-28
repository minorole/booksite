export function adminAiLogsEnabled(): boolean {
  const v = process.env.ADMIN_AI_TRACE_DISABLED?.toLowerCase()
  if (v === '1' || v === 'true') return false
  return true
}

// Include sensitive data in traces by default; allow opt-out via env.
export function adminAiSensitiveEnabled(): boolean {
  const v = process.env.ADMIN_AI_TRACE_SENSITIVE?.toLowerCase()
  if (v === '0' || v === 'false') return false
  return true
}

// Deep/diagnostic logging: default ON; disable with DEBUG_LOGS=0/false
export function debugLogsEnabled(): boolean {
  const v = process.env.DEBUG_LOGS?.toLowerCase()
  if (v === '0' || v === 'false') return false
  return true
}

// Fallback behavior: if an image is present and no domain tools ran in the
// first pass, allow the orchestrator to re-run once with a stricter prelude
// instructing tool-first execution. Enabled by default in dev.
export function adminAiVisionToolFallbackEnabled(): boolean {
  const v = process.env.ADMIN_AI_VISION_TOOL_FALLBACK?.toLowerCase()
  if (v === '0' || v === 'false') return false
  return true
}
