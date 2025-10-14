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
        title: "Magic link sent",
        description: "Check your email for the login link. Be sure to check your spam folder too.",
      })
      const ts = Date.now()
      const qp = new URLSearchParams({ email })
      if (returnTo) qp.set('returnTo', returnTo)
      qp.set('ts', String(ts))
      router.push(`/auth/verify?${qp.toString()}`)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
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
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start Google sign in",
      })
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          placeholder="Enter your email"
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
              Sending magic link...
            </>
          ) : (
            "Continue with Email"
          )}
        </Button>
      </form>
      <div className="relative">
        <div className="my-4 h-px bg-border" />
      </div>
      <Button type="button" variant="outline" disabled={loading} onClick={handleGoogle} className="w-full">
        Continue with Google
      </Button>
      <p className="text-sm text-muted-foreground text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
