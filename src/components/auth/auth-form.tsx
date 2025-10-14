"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()

  const mapAuthError = (msg?: string) => {
    const m = (msg || '').toLowerCase()
    if (!m) return '发生未知错误，请重试。 · An unexpected error occurred. Please try again.'
    if (m.includes('email is required')) return '需要邮箱 · Email is required'
    if (m.includes('too many requests')) return '请求过多，请稍后再试 · Too many requests'
    if (m.includes('failed to send magic link')) return '发送魔法链接失败 · Failed to send magic link'
    if (m.includes('failed to start google sign in')) return '无法启动 Google 登录 · Failed to start Google sign in'
    return `${msg} · ${msg}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const returnTo = searchParams?.get('returnTo') || undefined
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnTo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send magic link')
      }

      toast({
        title: "魔法链接已发送 · Magic link sent",
        description: "请到邮箱查收登录链接，同时检查垃圾邮件文件夹。 · Check your email for the login link. Be sure to check your spam folder too.",
      })
      const ts = Date.now()
      const qp = new URLSearchParams({ email })
      if (returnTo) qp.set('returnTo', returnTo)
      qp.set('ts', String(ts))
      router.push(`/auth/verify?${qp.toString()}`)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "错误 · Error",
        description: mapAuthError(error instanceof Error ? error.message : undefined),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      const returnTo = searchParams?.get('returnTo') || undefined
      const suffix = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${location.origin}/api/auth/callback${suffix}`,
        },
      })
      // Redirect happens immediately
    } catch (error) {
      toast({
        variant: "destructive",
        title: "错误 · Error",
        description: mapAuthError(error instanceof Error ? error.message : 'Failed to start Google sign in'),
      })
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          placeholder="输入邮箱 · Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
          className="w-full"
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <div className="mr-2">
                <LoadingSpinner />
              </div>
              正在发送魔法链接… · Sending magic link...
            </>
          ) : (
            "通过邮箱继续 · Continue with Email"
          )}
        </Button>
      </form>
      <div className="relative">
        <div className="my-4 h-px bg-border" />
      </div>
      <Button type="button" variant="outline" disabled={loading} onClick={handleGoogle} className="w-full">
        通过 Google 继续 · Continue with Google
      </Button>
      <p className="text-sm text-muted-foreground text-center">
        继续即表示你同意我们的《服务条款》和《隐私政策》。 · By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
