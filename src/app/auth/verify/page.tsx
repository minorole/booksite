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
      toast({ title: 'Magic link resent', description: 'Check your inbox again in a moment.' })
      setCooldown(60)
      setIssuedAt(Date.now())
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e instanceof Error ? e.message : 'Failed to resend' })
    } finally {
      setSending(false)
    }
  }, [cooldown, email, returnTo, sending, toast])

  const label = cooldown > 0 ? `Resend in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}` : 'Resend link'
  const expiryLabel = useMemo(() => {
    const totalSec = Math.ceil(remainingMs / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }, [remainingMs])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <CardTitle>Check your email</CardTitle>
            <CardDescription className="mt-2">
              We’ve sent you a magic link to sign in
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {email && (
            <p className="text-center text-sm">
              Magic link sent to: <span className="font-medium">{email}</span>
              <br />
              <span className="text-xs text-muted-foreground">
                (Wrong email? <a href="/auth/signin" className="text-primary hover:underline">Try again</a>)
              </span>
            </p>
          )}
          
          <Alert className="bg-muted/50 border-muted-foreground/20">
            <AlertDescription>
              <p className="font-medium">Can’t find the email?</p>
              <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                <li>Check your spam or junk folder</li>
                <li>Wait a few minutes and refresh your inbox</li>
                <li>Make sure you entered the correct email</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="text-center text-xs text-muted-foreground">
            {remainingMs > 0 ? (
              <span>Link expires in {expiryLabel}</span>
            ) : (
              <span>The link may have expired. You can resend a new link below.</span>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              onClick={onResend}
              disabled={!email || sending || cooldown > 0}
              variant="outline"
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
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
      <VerifyPageInner />
    </Suspense>
  )
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
