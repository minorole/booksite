export function adminAiLogsEnabled(): boolean {
  const v = process.env.ADMIN_AI_TRACE_DISABLED?.toLowerCase()
  if (v === '1' || v === 'true') return false
  return true
}

export function adminAiSensitiveEnabled(): boolean {
  const v = process.env.ADMIN_AI_TRACE_SENSITIVE?.toLowerCase()
  return v === '1' || v === 'true'
}

