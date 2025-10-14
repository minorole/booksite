"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Bilingual } from "@/components/common/bilingual"
import { BilingualInput } from "@/components/common/bilingual-input"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()

  const mapAuthError = (msg?: string): ReactNode => {
    const m = (msg || '').toLowerCase()
    if (!m) return (<Bilingual cnText="发生未知错误，请重试。" enText="An unexpected error occurred. Please try again." />)
    if (m.includes('email is required')) return (<Bilingual cnText="需要邮箱" enText="Email is required" />)
    if (m.includes('too many requests')) return (<Bilingual cnText="请求过多，请稍后再试" enText="Too many requests" />)
    if (m.includes('failed to send magic link')) return (<Bilingual cnText="发送魔法链接失败" enText="Failed to send magic link" />)
    if (m.includes('failed to start google sign in')) return (<Bilingual cnText="无法启动 Google 登录" enText="Failed to start Google sign in" />)
    return (<Bilingual cnText={msg} enText={msg} />)
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
        title: (<Bilingual cnText="魔法链接已发送" enText="Magic link sent" />),
        description: (<Bilingual cnText="请到邮箱查收登录链接，同时检查垃圾邮件文件夹。" enText="Check your email for the login link. Be sure to check your spam folder too." />),
      })
      const ts = Date.now()
      const qp = new URLSearchParams({ email })
      if (returnTo) qp.set('returnTo', returnTo)
      qp.set('ts', String(ts))
      router.push(`/auth/verify?${qp.toString()}`)
    } catch (error) {
      toast({
        variant: "destructive",
        title: (<Bilingual cnText="错误" enText="Error" />),
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
        title: (<Bilingual cnText="错误" enText="Error" />),
        description: mapAuthError(error instanceof Error ? error.message : 'Failed to start Google sign in'),
      })
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Google first */}
      <Button
        type="button"
        variant="ghost"
        disabled={loading}
        onClick={handleGoogle}
        className="w-full h-12 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="mr-3 inline-flex items-center justify-center">
          {/* Google G icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" className="h-7 w-7 md:h-8 md:w-8">
            <path fill="#FFC107" d="M43.611 20.083h-1.829V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.06 0 5.842 1.153 7.957 3.043l5.657-5.657C34.884 6.053 29.702 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.818C14.69 15.281 18.994 12 24 12c3.06 0 5.842 1.153 7.957 3.043l5.657-5.657C34.884 6.053 29.702 4 24 4c-7.94 0-14.733 4.64-17.694 10.691z"/>
            <path fill="#4CAF50" d="M24 44c5.167 0 9.86-1.977 13.409-5.196l-6.191-5.238C29.208 35.091 26.751 36 24 36c-5.202 0-9.621-3.317-11.283-7.958l-6.54 5.036C9.095 39.261 16.017 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.238-2.231 4.166-4.094 5.566l.003-.002 6.191 5.238C35.064 40.322 40 36 42 28c.667-2.667 1.611-6.917 1.611-7.917z"/>
          </svg>
        </span>
        <Bilingual as="span" cnText={<span className="font-bold">使用谷歌</span>} enText={<span className="font-bold">With Google</span>} enClassName="text-white/70" />
      </Button>

      {/* Divider bilingual */}
      <div className="text-center text-xs text-white/50 font-semibold">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <Bilingual as="div" align="center" cnText="或者" enText="or" enClassName="text-white/40" />
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <BilingualInput
          type="email"
          cnPlaceholder="输入邮箱"
          enPlaceholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
          className="w-full"
        />
        <Button
          type="submit"
          disabled={loading}
          variant="ghost"
          className="w-full h-12 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="mr-2">
                <LoadingSpinner />
              </div>
              <Bilingual as="span" cnText="正在发送魔法链接…" enText="Sending magic link..." enClassName="text-white/70" />
            </>
          ) : (
            <Bilingual as="span" cnText={<span className="font-bold">使用邮箱</span>} enText={<span className="font-bold">With Email</span>} enClassName="text-white/70" />
          )}
        </Button>
      </form>

      {/* Legal bilingual */}
      <p className="text-xs text-white/50 text-center leading-relaxed font-semibold">
        继续即表示你同意我们的《服务条款》和《隐私政策》。
        <br />
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
