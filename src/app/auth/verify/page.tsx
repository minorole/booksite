"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

const EXP_MS = 15 * 60 * 1000

function VerifyPageInner() {
  const params = useSearchParams()
  const { toast } = useToast()
  const email = useMemo(() => {
    const raw = params?.get('email') || undefined
    return raw || ''
  }, [params])
  const returnTo = useMemo(() => params?.get('returnTo') || undefined, [params])
  const [cooldown, setCooldown] = useState<number>(60)
  const [sending, setSending] = useState<boolean>(false)
  const initialIssuedAt = useMemo(() => {
    const rawTs = params?.get('ts')
    const parsed = rawTs ? Number(rawTs) : undefined
    return parsed && !isNaN(parsed) ? parsed : Date.now()
  }, [params])
  const [issuedAt, setIssuedAt] = useState<number>(initialIssuedAt)

  const [remainingMs, setRemainingMs] = useState<number>(Math.max(0, EXP_MS - (Date.now() - issuedAt)))

  useEffect(() => {
    setCooldown(60)
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  useEffect(() => {
    const t = setInterval(() => {
      setRemainingMs(Math.max(0, EXP_MS - (Date.now() - issuedAt)))
    }, 1000)
    return () => clearInterval(t)
  }, [issuedAt])

  const onResend = useCallback(async () => {
    if (!email || sending || cooldown > 0) return
    setSending(true)
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnTo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to resend link')
      toast({ title: '魔法链接已重新发送 · Magic link resent', description: '请稍等片刻后再次查看收件箱。 · Check your inbox again in a moment.' })
      setCooldown(60)
      setIssuedAt(Date.now())
    } catch (e) {
      const mapAuthError = (msg?: string) => {
        const m = (msg || '').toLowerCase()
        if (!m) return '发生未知错误，请重试。 · An unexpected error occurred. Please try again.'
        if (m.includes('too many requests')) return '请求过多，请稍后再试 · Too many requests'
        if (m.includes('failed to resend link')) return '重新发送失败 · Failed to resend link'
        if (m.includes('failed to send magic link')) return '发送魔法链接失败 · Failed to send magic link'
        return `${msg} · ${msg}`
      }
      toast({ variant: 'destructive', title: '错误 · Error', description: mapAuthError(e instanceof Error ? e.message : undefined) })
    } finally {
      setSending(false)
    }
  }, [cooldown, email, returnTo, sending, toast])

  const label = useMemo(() => {
    if (cooldown > 0) {
      const mm = Math.floor(cooldown / 60)
      const ss = String(cooldown % 60).padStart(2, '0')
      return `${mm}:${ss} 后可重发 · Resend in ${mm}:${ss}`
    }
    return '重新发送链接 · Resend link'
  }, [cooldown])
  const expiryLabel = useMemo(() => {
    const totalSec = Math.ceil(remainingMs / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }, [remainingMs])

  return (
    <Card className="bg-transparent border-0 shadow-none backdrop-blur-0 p-0">
      <CardHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <CardTitle className="text-white/90 text-3xl sm:text-4xl font-extrabold tracking-tight">请查收邮箱 · Check your email</CardTitle>
            <CardDescription className="mt-2 text-white/80 text-base sm:text-lg leading-relaxed">
              我们已发送登录魔法链接 · We’ve sent you a magic link to sign in
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {email && (
            <p className="text-center text-sm">
              魔法链接已发送至：<span className="font-semibold text-white">{email}</span> · Magic link sent to: <span className="font-semibold text-white">{email}</span>
              <br />
              <span className="text-xs text-muted-foreground">
                （邮箱不正确？<a href="/auth/signin" className="text-primary hover:underline">重新填写</a>） · (Wrong email? <a href="/auth/signin" className="text-primary hover:underline">Try again</a>)
              </span>
            </p>
          )}
          
          <Alert className="bg-muted/50 border-muted-foreground/20">
            <AlertDescription>
              <p className="font-medium">找不到邮件？ · Can’t find the email?</p>
              <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                <li>检查垃圾邮件或广告邮件夹 · Check your spam or junk folder</li>
                <li>等待几分钟后刷新收件箱 · Wait a few minutes and refresh your inbox</li>
                <li>确认你输入了正确的邮箱地址 · Make sure you entered the correct email</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="text-center text-xs text-white/60">
            {remainingMs > 0 ? (
              <span>链接将在 {expiryLabel} 后过期 · Link expires in {expiryLabel}</span>
            ) : (
              <span>链接可能已过期，你可以在下方重新发送。 · The link may have expired. You can resend a new link below.</span>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              onClick={onResend}
              disabled={!email || sending || cooldown > 0}
              variant="ghost"
              className="h-11 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {label}
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">加载中… · Loading…</div>}>
      <VerifyPageInner />
    </Suspense>
  )
}
